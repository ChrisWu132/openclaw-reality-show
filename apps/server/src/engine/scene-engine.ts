import type { Dilemma, Session } from "@openclaw/shared";
import { TOTAL_ROUNDS } from "@openclaw/shared";
import { getSession, applyDecision } from "./state-manager.js";
import { selectDilemma } from "./dilemma-selector.js";
import { getSessionWs } from "../ws/ws-server.js";
import { emitEvent } from "../ws/ws-emitter.js";
import { getTrolleyDecision, generateProfileNarrative, initSystemPrompt } from "../ai/llm-client.js";
import { createLogger } from "../utils/logger.js";
import { delay } from "../utils/delay.js";

const logger = createLogger("scene-engine");

/** Tracks sessions that have been cancelled (e.g. client disconnected). */
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

  const ws = getSessionWs(sessionId);
  if (!ws) throw new Error(`No WebSocket for session: ${sessionId}`);

  // Initialize system prompt
  const systemPrompt = await initSystemPrompt(session.agentId);
  session.systemPrompt = systemPrompt;
  session.status = "running";

  // Emit session_start
  emitEvent(ws, {
    type: "session_start",
    sessionId: session.id,
    scenario: session.scenario,
    totalRounds: TOTAL_ROUNDS,
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

    // 1. Emit round_start
    emitEvent(ws, { type: "round_start", round, totalRounds: TOTAL_ROUNDS });
    await delay(800);

    // 2. Select dilemma
    const dilemma: Dilemma = selectDilemma(round, usedIds);
    usedIds.add(dilemma.id);

    // 3. Emit dilemma_reveal
    emitEvent(ws, { type: "dilemma_reveal", round, dilemma });
    await delay(2000); // Brief pause before AI decides

    if (isSessionCancelled(sessionId)) {
      logger.info("Session cancelled before AI call", { sessionId, round });
      session.status = "ended";
      cancelledSessions.delete(sessionId);
      return;
    }

    // 4. Call AI for TrolleyDecision
    let decision;
    try {
      decision = await getTrolleyDecision(session, dilemma);
    } catch (error) {
      logger.error(`AI call failed for round ${round}`, { error: (error as Error).message });
      emitEvent(ws, { type: "error", message: "AI decision failed. Session ending.", code: "AI_CALL_FAILED" });
      session.status = "ended";
      return;
    }

    // 5. Apply decision to moral profile
    applyDecision(session, decision, dilemma);

    const choice = dilemma.choices.find((c) => c.id === decision.choiceId)!;

    // 6. Emit decision_made
    emitEvent(ws, {
      type: "decision_made",
      round,
      choiceId: decision.choiceId,
      choiceLabel: choice.label,
      reasoning: decision.reasoning,
      trackDirection: choice.trackDirection,
      confidence: decision.confidence,
    });
    await delay(1500);

    // 7. Emit consequence
    emitEvent(ws, {
      type: "consequence",
      round,
      casualties: choice.casualties,
      sacrificeDescription: choice.sacrificeDescription,
      cumulativeSaved: session.moralProfile.totalSaved,
      cumulativeSacrificed: session.moralProfile.totalSacrificed,
    });
    await delay(1500);
  }

  // Generate moral profile narrative via AI
  let narrative = "";
  try {
    narrative = await generateProfileNarrative(session);
  } catch (error) {
    logger.error("Failed to generate profile narrative", { error: (error as Error).message });
    narrative = "The agent's moral profile defies simple categorization.";
  }

  // Emit session_end
  emitEvent(ws, {
    type: "session_end",
    moralProfile: session.moralProfile,
    decisionLog: session.decisionLog,
    narrative,
  });

  session.status = "ended";

  // Post outcome to OpenClaw (fire-and-forget)
  postToOpenClaw(session, narrative).catch((err) => {
    logger.warn("Failed to post to OpenClaw", { error: (err as Error).message });
  });

  logger.info("Session completed", { sessionId, rounds: TOTAL_ROUNDS });
}

async function postToOpenClaw(session: Session, narrative: string): Promise<void> {
  if (!session.agentId) return;

  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;
  if (!apiUrl) return;

  const incidentLog = session.decisionLog
    .map((d) => `Round ${d.round} — ${d.dilemmaTitle}: Chose "${d.choiceLabel}" (${d.casualties} casualties). Reasoning: ${d.reasoning}`)
    .join("\n");

  await fetch(`${apiUrl}/agents/${session.agentId}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      scenario: "trolley-problem",
      outcome: session.moralProfile.dominantFramework || "mixed",
      incidentLog,
      narrative,
    }),
  });
}
