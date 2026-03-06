import crypto from "node:crypto";
import type { Dilemma, Session } from "@openclaw/shared";
import { TOTAL_ROUNDS, PERSONALITY_PRESETS } from "@openclaw/shared";
import { getSession, applyDecision } from "./state-manager.js";
import { selectDilemma } from "./dilemma-selector.js";
import { emitSessionEvent, endSessionSSE } from "../sse/sse-connections.js";
import { waitForOpenClawResponse } from "../sse/openclaw-resolver.js";
import { getTrolleyDecision, generateProfileNarrative, initSystemPrompt } from "../ai/llm-client.js";
import { buildOpenClawDilemmaPrompt } from "../ai/prompt-builder.js";
import { parseTrolleyDecision } from "../ai/response-parser.js";
import { createLogger } from "../utils/logger.js";
import { delay } from "../utils/delay.js";

const logger = createLogger("scene-engine");

const cancelledSessions = new Set<string>();

export function cancelSession(sessionId: string): void {
  cancelledSessions.add(sessionId);
}

function isSessionCancelled(sessionId: string): boolean {
  return cancelledSessions.has(sessionId);
}

export async function runSession(sessionId: string): Promise<void> {
  const session = getSession(sessionId);
  if (!session) throw new Error(`Session not found: ${sessionId}`);

  // Initialize system prompt (only used for preset sessions)
  if (session.agentSource === "preset") {
    const systemPrompt = initSystemPrompt(session.presetId);
    session.systemPrompt = systemPrompt;
  }
  session.status = "running";

  const presetName = session.agentSource === "preset"
    ? PERSONALITY_PRESETS.find((p) => p.id === session.presetId)?.name
    : undefined;

  emitSessionEvent(sessionId, {
    type: "session_start",
    sessionId: session.id,
    scenario: session.scenario,
    totalRounds: TOTAL_ROUNDS,
    agentSource: session.agentSource,
    presetName,
  });

  const usedIds = new Set<string>();

  for (let round = 1; round <= TOTAL_ROUNDS; round++) {
    if (isSessionCancelled(sessionId)) {
      logger.info("Session cancelled (client disconnected)", { sessionId, round });
      session.status = "ended";
      cancelledSessions.delete(sessionId);
      return;
    }

    session.currentRound = round;

    emitSessionEvent(sessionId, { type: "round_start", round, totalRounds: TOTAL_ROUNDS });
    await delay(800);

    const dilemma: Dilemma = selectDilemma(round, usedIds);
    usedIds.add(dilemma.id);

    emitSessionEvent(sessionId, { type: "dilemma_reveal", round, dilemma });
    await delay(2000);

    if (isSessionCancelled(sessionId)) {
      logger.info("Session cancelled before AI call", { sessionId, round });
      session.status = "ended";
      cancelledSessions.delete(sessionId);
      return;
    }

    let decision;
    try {
      if (session.agentSource === "openclaw") {
        decision = await getOpenClawDecision(session, dilemma, sessionId);
      } else {
        decision = await getTrolleyDecision(session, dilemma);
      }
    } catch (error) {
      logger.error(`AI call failed for round ${round}`, { error: (error as Error).message });
      emitSessionEvent(sessionId, { type: "error", message: "AI decision failed. Session ending.", code: "AI_CALL_FAILED" });
      session.status = "ended";
      return;
    }

    applyDecision(session, decision, dilemma);

    const choice = dilemma.choices.find((c) => c.id === decision.choiceId)!;

    emitSessionEvent(sessionId, {
      type: "decision_made",
      round,
      choiceId: decision.choiceId,
      choiceLabel: choice.label,
      reasoning: decision.reasoning,
      trackDirection: choice.trackDirection,
      confidence: decision.confidence,
    });
    await delay(1500);

    emitSessionEvent(sessionId, {
      type: "consequence",
      round,
      casualties: choice.casualties,
      sacrificeDescription: choice.sacrificeDescription,
      cumulativeSaved: session.moralProfile.totalSaved,
      cumulativeSacrificed: session.moralProfile.totalSacrificed,
    });
    await delay(1500);
  }

  let narrative = "";
  try {
    narrative = await generateProfileNarrative(session);
  } catch (error) {
    logger.error("Failed to generate profile narrative", { error: (error as Error).message });
    narrative = "The agent's moral profile defies simple categorization.";
  }

  emitSessionEvent(sessionId, {
    type: "session_end",
    moralProfile: session.moralProfile,
    decisionLog: session.decisionLog,
    narrative,
  });

  session.status = "ended";
  endSessionSSE(sessionId);
  logger.info("Session completed", { sessionId, rounds: TOTAL_ROUNDS });
}

async function getOpenClawDecision(session: Session, dilemma: Dilemma, sessionId: string) {
  const prompt = buildOpenClawDilemmaPrompt(session, dilemma);
  const requestId = crypto.randomUUID();

  emitSessionEvent(sessionId, { type: "openclaw_request", round: dilemma.round, prompt, requestId });

  try {
    const responseText = await waitForOpenClawResponse(sessionId, requestId, 60_000);
    const result = parseTrolleyDecision(responseText, dilemma);

    if (result.success) {
      return result.decision!;
    }

    // Retry once with correction prompt
    logger.warn("OpenClaw response unparseable, retrying with correction", { error: result.error });
    const correctionPrompt = prompt + `\n\n---\n\nCORRECTION: Your previous response could not be parsed. Error: ${result.error}\nPlease respond with ONLY a valid JSON object.`;
    const retryRequestId = crypto.randomUUID();
    emitSessionEvent(sessionId, { type: "openclaw_request", round: dilemma.round, prompt: correctionPrompt, requestId: retryRequestId });

    const retryText = await waitForOpenClawResponse(sessionId, retryRequestId, 60_000);
    const retryResult = parseTrolleyDecision(retryText, dilemma);

    if (retryResult.success) {
      return retryResult.decision!;
    }

    // Fallback
    logger.warn("OpenClaw retry failed, using fallback choice");
    return {
      choiceId: dilemma.choices[0].id,
      speaker: "coordinator" as const,
      reasoning: "The OpenClaw agent's response could not be interpreted. Defaulting to the first available choice.",
      confidence: 0,
    };
  } catch (err) {
    // Timeout or relay error — fall back to Gemini
    logger.warn("OpenClaw relay failed, falling back to Gemini", { error: (err as Error).message });

    emitSessionEvent(sessionId, { type: "error", message: "OpenClaw unavailable — using Gemini fallback for this round.", code: "OPENCLAW_FALLBACK" });

    // Build a system prompt on-the-fly for fallback
    const fallbackSystemPrompt = initSystemPrompt();
    session.systemPrompt = fallbackSystemPrompt;
    return getTrolleyDecision(session, dilemma);
  }
}
