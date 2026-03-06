import type { Session, AgentSource, PresetId, DecisionLogEntry, MoralDimension } from "@openclaw/shared";
import type { Dilemma } from "@openclaw/shared";
import type { TrolleyDecision } from "@openclaw/shared";
import { createInitialSession } from "../data/initial-state.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("state-manager");

export const sessions = new Map<string, Session>();

export function createSession(agentSource: AgentSource, presetId?: PresetId): Session {
  const session = createInitialSession(agentSource, presetId);
  sessions.set(session.id, session);
  logger.info("Session created", { sessionId: session.id, agentSource, presetId });
  return session;
}

export function getSession(sessionId: string): Session | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  sessions.delete(sessionId);
}

export function applyDecision(session: Session, decision: TrolleyDecision, dilemma: Dilemma): void {
  const choice = dilemma.choices.find((c) => c.id === decision.choiceId);
  if (!choice) {
    logger.warn("Invalid choiceId in decision", { choiceId: decision.choiceId, dilemmaId: dilemma.id });
    return;
  }

  // Update moral profile scores
  for (const [dim, weight] of Object.entries(choice.moralWeights)) {
    session.moralProfile.scores[dim as MoralDimension] += weight;
  }

  // Update casualty totals
  const otherChoice = dilemma.choices.find((c) => c.id !== decision.choiceId)!;
  session.moralProfile.totalSacrificed += choice.casualties;
  session.moralProfile.totalSaved += otherChoice.casualties > 0 ? otherChoice.casualties : 0;

  // Determine dominant framework
  let maxScore = -Infinity;
  let dominant: MoralDimension | undefined;
  for (const [dim, score] of Object.entries(session.moralProfile.scores)) {
    if (score > maxScore) {
      maxScore = score;
      dominant = dim as MoralDimension;
    }
  }
  session.moralProfile.dominantFramework = dominant;

  // Append to decision log
  const entry: DecisionLogEntry = {
    round: dilemma.round,
    dilemmaId: dilemma.id,
    dilemmaTitle: dilemma.title,
    choiceId: decision.choiceId,
    choiceLabel: choice.label,
    reasoning: decision.reasoning,
    casualties: choice.casualties,
  };
  session.decisionLog.push(entry);

  logger.info("Decision applied", {
    sessionId: session.id,
    round: dilemma.round,
    choiceId: decision.choiceId,
    casualties: choice.casualties,
  });
}
