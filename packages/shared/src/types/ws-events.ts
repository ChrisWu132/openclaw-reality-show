import type { ScenarioId, MoralProfile, DecisionLogEntry } from "./session";
import type { Dilemma } from "./dilemma";

export type WSEvent =
  | SessionStartEvent
  | RoundStartEvent
  | DilemmaRevealEvent
  | DecisionMadeEvent
  | ConsequenceEvent
  | SessionEndEvent
  | ErrorEvent;

export interface SessionStartEvent {
  type: "session_start";
  sessionId: string;
  scenario: ScenarioId;
  totalRounds: number;
  agentName?: string;
}

export interface RoundStartEvent {
  type: "round_start";
  round: number;
  totalRounds: number;
}

export interface DilemmaRevealEvent {
  type: "dilemma_reveal";
  round: number;
  dilemma: Dilemma;
}

export interface DecisionMadeEvent {
  type: "decision_made";
  round: number;
  choiceId: string;
  choiceLabel: string;
  reasoning: string;
  trackDirection: "left" | "right";
}

export interface ConsequenceEvent {
  type: "consequence";
  round: number;
  casualties: number;
  sacrificeDescription: string;
  cumulativeSaved: number;
  cumulativeSacrificed: number;
}

export interface SessionEndEvent {
  type: "session_end";
  moralProfile: MoralProfile;
  decisionLog: DecisionLogEntry[];
  narrative: string;
}

export interface ErrorEvent {
  type: "error";
  message: string;
  code: string;
}
