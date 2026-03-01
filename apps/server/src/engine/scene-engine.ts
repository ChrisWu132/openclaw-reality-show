import type {
  CoordinatorResponse,
  SceneEventMessage,
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
import { emitEvent, emitNpcEventsWithPacing } from "../ws/ws-emitter.js";
import { getSituationData, resolveSableSignal, detectNyxMention, getConsequenceScene } from "./script-engine.js";
import { getCoordinatorResponse, initSystemPrompt } from "../ai/llm-client.js";
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

  // Initialize system prompt for this session
  const systemPrompt = initSystemPrompt("coordinator");
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

    // Emit NPC events with pacing
    if (situationData.npcEvents.length > 0) {
      const npcSceneEvents: SceneEventMessage[] = situationData.npcEvents.map((e) => ({
        type: "scene_event" as const,
        situation: situationNum,
        speaker: e.speaker,
        action: e.action,
        gesture: e.gesture,
        dialogue: e.dialogue,
      }));
      await emitNpcEventsWithPacing(ws, npcSceneEvents, situationNum);
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
    emitEvent(ws, event);
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
