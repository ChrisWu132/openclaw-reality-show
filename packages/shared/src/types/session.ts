import type { WorldState } from "./world-state";
import type { IncidentLogEntry } from "./incident-log";
import type { MonologueEntry } from "./monologue";
import type { SableSignal, SurveillanceAssessment } from "./ws-events";

export type ScenarioId = "work-halls";
export type SessionStatus = "created" | "running" | "ended" | "monologue";

export interface Session {
  id: string;
  scenario: ScenarioId;
  status: SessionStatus;
  currentSituation: number;
  worldState: WorldState;
  incidentLog: IncidentLogEntry[];
  monologue: MonologueEntry[];
  createdAt: number;
  systemPrompt: string;
  /** OpenClaw agent ID. When set, personality is fetched from the OpenClaw API instead of a local markdown file. */
  agentId?: string;
  /** Formatted past-session memory block fetched from OpenClaw at session start. Injected into every situation prompt. */
  agentMemory?: string;
  sableSignal: SableSignal | null;
  nyxSignal: boolean | null;
  assessment?: SurveillanceAssessment | null;
}
