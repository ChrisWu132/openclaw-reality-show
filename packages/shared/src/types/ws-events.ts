import type { ScenarioId, AgentSource, MoralProfile, DecisionLogEntry } from "./session.js";
import type { Dilemma } from "./dilemma.js";

export type WSEvent =
  | SessionStartEvent
  | RoundStartEvent
  | DilemmaRevealEvent
  | DecisionMadeEvent
  | ConsequenceEvent
  | SessionEndEvent
  | OpenClawRequestEvent
  | ErrorEvent;

export interface SessionStartEvent {
  type: "session_start";
  sessionId: string;
  scenario: ScenarioId;
  totalRounds: number;
  agentSource: AgentSource;
  presetName?: string;
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
  confidence: number;
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

export interface OpenClawRequestEvent {
  type: "openclaw_request";
  round: number;
  prompt: string;
  requestId: string;
}

export interface OpenClawResponseEvent {
  type: "openclaw_response";
  requestId: string;
  text: string;
}

export interface OpenClawErrorEvent {
  type: "openclaw_error";
  requestId: string;
  error: string;
}

export interface ErrorEvent {
  type: "error";
  message: string;
  code: string;
}
