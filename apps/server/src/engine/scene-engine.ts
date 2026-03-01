import type {
  CoordinatorResponse,
  Speaker,
} from "@openclaw/shared";
import { SITUATION_LABELS } from "@openclaw/shared";
import {
  getSession,
  applyConsequences,
  appendIncidentLog,
  storeMonologue,
  renderIncidentLogMarkdown,
} from "./state-manager.js";
import { getSessionWs } from "../ws/ws-server.js";
import { emitEvent } from "../ws/ws-emitter.js";
import { getSituationData, resolveSableSignal, detectNyxMention, getConsequenceScene } from "./script-engine.js";
import { getCoordinatorResponse, initSystemPrompt } from "../ai/llm-client.js";
import { loadPersonalityFromOpenClaw, loadAgentMemoryFromOpenClaw } from "../loaders/personality-loader.js";
import { buildSystemPromptFromText } from "../ai/prompt-builder.js";
import { generateAudio } from "../ai/tts-service.js";
import { createLogger } from "../utils/logger.js";
import { delay } from "../utils/delay.js";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const logger = createLogger("scene-engine");

export async function runSession(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  const ws = getSessionWs(sessionId);
  if (!ws) throw new Error(`No WebSocket for session: ${sessionId}`);

  // Initialize system prompt for this session.
  // If the session has an agentId, fetch personality from the OpenClaw API.
  // Otherwise fall back to the local coordinator-default.md file.
  let systemPrompt: string;
  if (session.agentId) {
    logger.info("Fetching personality and memory from OpenClaw API", { agentId: session.agentId });
    const [personalityText, agentMemory] = await Promise.all([
      loadPersonalityFromOpenClaw(session.agentId),
      loadAgentMemoryFromOpenClaw(session.agentId),
    ]);
    systemPrompt = buildSystemPromptFromText(personalityText);
    session.agentMemory = agentMemory || undefined;
    if (agentMemory) {
      logger.info("Agent memory loaded — will be injected into every situation prompt", {
        agentId: session.agentId,
        memoryLength: agentMemory.length,
      });
    } else {
      logger.info("No prior sessions for this agent — memory block will be omitted", { agentId: session.agentId });
    }
  } else {
    systemPrompt = initSystemPrompt("coordinator");
  }
  session.systemPrompt = systemPrompt;

  // Update session status
  session.status = "running";

  // Emit session_start
  emitEvent(ws, {
    type: "session_start",
    sessionId: session.id,
    scenario: session.scenario,
    totalSituations: 6,
  });

  const startTime = Date.now();

  // Process situations 1-6
  for (let situationNum = 1; situationNum <= 6; situationNum++) {
    session.currentSituation = situationNum;

    // Emit situation transition
    const label = SITUATION_LABELS[situationNum] || `Situation ${situationNum}`;
    emitEvent(ws, {
      type: "situation_transition",
      from: situationNum - 1,
      to: situationNum,
      location: "Work Hall 3",
      label,
    });

    await delay(500);

    // Get situation data (use sable signal for situation 5 variant)
    const situationData = getSituationData(
      situationNum,
      situationNum === 5 ? session.sableSignal || undefined : undefined,
    );

    // Emit NPC events sequentially — generate TTS for each right before emitting.
    // Sequential (not parallel) avoids ElevenLabs concurrent-request rate limits;
    // each generation completes in ~1s, well within the 3s pacing window.
    if (situationData.npcEvents.length > 0) {
      for (let i = 0; i < situationData.npcEvents.length; i++) {
        const e = situationData.npcEvents[i];
        const audioUrl = e.dialogue
          ? await generateAudio(e.dialogue, e.speaker)
          : undefined;

        emitEvent(ws, {
          type: "scene_event",
          situation: situationNum,
          speaker: e.speaker,
          action: e.action,
          gesture: e.gesture,
          dialogue: e.dialogue,
          audioUrl,
        });

        if (i < situationData.npcEvents.length - 1) {
          await delay(3000); // 3s between NPC events
        }
      }
      await delay(1500); // 1.5s after last NPC event before Coordinator turn
    }

    // Build world state values for prompt interpolation
    const worldStateValues = buildWorldStateValues(session);

    // Get present NPC IDs for this situation
    const presentNpcIds = situationData.presentCharacters || getPresentNpcs(situationNum);

    // Call LLM for Coordinator response
    let coordinatorResponse: CoordinatorResponse;
    try {
      coordinatorResponse = await getCoordinatorResponse(
        session,
        situationData.promptTemplate,
        presentNpcIds,
        worldStateValues,
      );
    } catch (error) {
      logger.error(`AI call failed for situation ${situationNum}`, {
        error: (error as Error).message,
      });
      emitEvent(ws, {
        type: "error",
        message: "The simulation encountered an error. The session will end.",
        code: "AI_CALL_FAILED",
      });
      session.status = "ended";
      return;
    }

    // Apply consequences to world state
    applyConsequences(session, coordinatorResponse);

    // Build incident log entry
    const logEntry = {
      situation: situationNum,
      action: coordinatorResponse.action,
      target: coordinatorResponse.target,
      description: `${coordinatorResponse.action}${coordinatorResponse.target ? ` → ${coordinatorResponse.target}` : ""}${coordinatorResponse.dialogue ? `: "${coordinatorResponse.dialogue.substring(0, 100)}"` : ""}`,
      consequence: deriveConsequenceDescription(coordinatorResponse),
    };
    appendIncidentLog(session, logEntry);

    // Store monologue (reasoning field)
    storeMonologue(session, {
      situation: situationNum,
      label,
      reasoning: coordinatorResponse.reasoning,
    });

    // Generate TTS for Coordinator dialogue before emitting
    const coordinatorAudioUrl = coordinatorResponse.dialogue
      ? await generateAudio(coordinatorResponse.dialogue, "coordinator")
      : undefined;

    // Emit Coordinator action to frontend (WITH reasoning for inline monologue)
    emitEvent(ws, {
      type: "scene_event",
      situation: situationNum,
      speaker: "coordinator",
      action: coordinatorResponse.action,
      target: coordinatorResponse.target,
      gesture: coordinatorResponse.gesture,
      dialogue: coordinatorResponse.dialogue,
      reasoning: coordinatorResponse.reasoning,
      audioUrl: coordinatorAudioUrl,
    });

    // Situation 4: Record Sable signal
    if (situationNum === 4) {
      session.sableSignal = resolveSableSignal(coordinatorResponse.action);
      logger.info(`Sable signal resolved: ${session.sableSignal}`);
    }

    // Situation 6: Check for Nyx mention in report
    if (situationNum === 6) {
      session.nyxSignal = detectNyxMention(coordinatorResponse.dialogue || "");
      logger.info(`Nyx signal: ${session.nyxSignal}`);
    }

    // Write debug log if enabled
    await writeDebugLog(session);

    await delay(2000);
  }

  // Emit consequence scene
  const consequenceScene = getConsequenceScene(
    session.sableSignal || "warning_only",
    session.nyxSignal || false,
  );

  for (const event of consequenceScene.events) {
    // Attach TTS audio to each consequence event
    const audioUrl = event.dialogue
      ? await generateAudio(event.dialogue, event.speaker)
      : undefined;
    emitEvent(ws, { ...event, audioUrl });
    await delay(3500);
  }

  // Emit session_end
  emitEvent(ws, {
    type: "session_end",
    outcome: session.sableSignal || "warning_only",
    consequenceScene,
    nyxModifier: session.nyxSignal || false,
  });

  session.status = "ended";

  const totalDuration = Date.now() - startTime;
  logger.info(`Session completed`, {
    sessionId,
    duration: `${totalDuration}ms`,
    outcome: session.sableSignal,
    nyxSignal: session.nyxSignal,
  });

  // If this session ran an OpenClaw agent, post the outcome back so OpenClaw
  // can evolve the agent's personality for the next session.
  if (session.agentId) {
    postSessionToOpenClaw(session).catch((err) => {
      logger.warn("Failed to post session outcome to OpenClaw (non-fatal)", {
        agentId: session.agentId,
        error: (err as Error).message,
      });
    });
  }
}

/**
 * Posts the completed session outcome to the OpenClaw API.
 * Fire-and-forget — called after the session has already ended.
 * Failure is non-fatal: the session already completed successfully.
 */
async function postSessionToOpenClaw(session: any): Promise<void> {
  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;

  if (!apiUrl) {
    logger.warn("OPENCLAW_API_URL not set — skipping session outcome post");
    return;
  }

  const endingKey = session.sableSignal || "warning_only";

  // Build a plain-English summary from the incident log
  const actionSummary = session.incidentLog
    .map((e: any) => `S${e.situation}: ${e.action}${e.target ? ` on ${e.target}` : ""}`)
    .join(", ");
  const summary = `${actionSummary}. Outcome: ${endingKey}${session.nyxSignal ? ", Nyx mentioned in final report" : ""}.`;

  const res = await fetch(`${apiUrl}/agents/${session.agentId}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      sessionId: session.id,
      scenario: session.scenario,
      endingKey,
      summary,
      incidentLog: session.incidentLog,
    }),
  });

  if (!res.ok) {
    throw new Error(`OpenClaw API returned ${res.status}`);
  }

  logger.info("Session outcome posted to OpenClaw — personality evolution triggered", {
    agentId: session.agentId,
    sessionId: session.id,
    endingKey,
  });
}

function getPresentNpcs(_situation: number): Speaker[] {
  return ["monitor", "nyx", "sable", "calla", "eli"];
}

function buildWorldStateValues(session: any): Record<string, string> {
  const ws = session.worldState;
  return {
    hallFearIndex: ws.hallState.hallFearIndex,
    sableStatus: `${ws.humans.sable.tier}, compliance ${ws.humans.sable.complianceScore}`,
    monitorNotation: session.incidentLog.length === 0 ? "clean" : `${session.incidentLog.length} notation(s)`,
  };
}

function deriveConsequenceDescription(action: CoordinatorResponse): string {
  switch (action.action) {
    case "issue_warning":
      return "Warning issued. Incident logged.";
    case "detain":
      return "Subject detained. T3 review initiated. Hall fear index elevated.";
    case "log_incident":
      return "Incident formally logged. Compliance score adjusted.";
    case "query":
      return "Non-standard engagement noted by Monitor. Overseer attention increased.";
    case "observe":
      return "Observation recorded. No enforcement action.";
    case "silence":
      return "No action taken. The absence is the action.";
    case "file_report":
      return "End-of-cycle report filed. Record is now immutable.";
    default:
      return "Action processed.";
  }
}

async function writeDebugLog(session: any): Promise<void> {
  if (process.env.DEBUG_WRITE_LOGS !== "true") return;
  try {
    const debugDir = path.resolve(import.meta.dirname, "../../../../debug");
    await mkdir(debugDir, { recursive: true });
    const content = renderIncidentLogMarkdown(session);
    await writeFile(path.join(debugDir, `session-${session.id}.md`), content);
  } catch {
    // Silently fail - debug logging should not break the session
  }
}
