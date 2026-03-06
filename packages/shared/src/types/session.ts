import type { MoralDimension } from "./dilemma.js";
import type { PresetId } from "../constants/presets.js";

export type ScenarioId = "trolley-problem" | "ai-startup-arena";
export type AgentSource = "openclaw" | "preset";
export type SessionStatus = "created" | "running" | "ended";

export interface MoralProfile {
  scores: Record<MoralDimension, number>;
  dominantFramework?: MoralDimension;
  totalSaved: number;
  totalSacrificed: number;
}

export interface DecisionLogEntry {
  round: number;
  dilemmaId: string;
  dilemmaTitle: string;
  choiceId: string;
  choiceLabel: string;
  reasoning: string;
  casualties: number;
}

export interface Session {
  id: string;
  scenario: ScenarioId;
  status: SessionStatus;
  currentRound: number;
  totalRounds: number;
  moralProfile: MoralProfile;
  decisionLog: DecisionLogEntry[];
  createdAt: number;
  systemPrompt: string;
  agentSource: AgentSource;
  presetId?: PresetId;
  userId: string;
  /** Join code for remote OpenClaw relay (only set when agentSource === "openclaw"). */
  joinCode?: string;
}
