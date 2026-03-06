// ── Resources ──────────────────────────────────────────────────

export interface StartupResources {
  cash: number;
  compute: number; // 0-100
  data: number; // 0-100
  model: number; // 0-100
  users: number;
}

// ── Zones (AI Ecosystem Map) ───────────────────────────────────

export type ZoneId =
  | "gpu_farm"
  | "research_lab"
  | "data_lake"
  | "vc_office"
  | "center"
  | "open_source"
  | "market"
  | "launch_pad"
  | "talent_pool";

// ── Actions ────────────────────────────────────────────────────

export type StartupActionType =
  | "TRAIN"
  | "DEPLOY"
  | "FUNDRAISE"
  | "ACQUIRE_COMPUTE"
  | "ACQUIRE_DATA"
  | "POACH"
  | "OPEN_SOURCE";

export interface StartupAction {
  type: StartupActionType;
  /** Required for POACH — the agent being targeted. */
  targetAgentId: string | null;
  /** AI reasoning for the action. */
  reasoning: string;
}

// ── Agent State ────────────────────────────────────────────────

export type StartupAgentStatus = "active" | "bankrupt" | "acquired";

export interface StartupAgent {
  agentId: string;
  agentName: string;
  color: string;
  status: StartupAgentStatus;
  resources: StartupResources;
  /** Zone the agent is currently in (moves based on action). */
  zone?: ZoneId;
  /** History of zones visited (last N for trail rendering). */
  zoneHistory?: ZoneId[];
  /** Reputation/hype from open-sourcing. */
  reputation: number;
  eliminatedOnTurn?: number;
  acquiredBy?: string; // agentId that acquired this agent
}

// ── Market Events ──────────────────────────────────────────────

export type MarketEventType =
  | "NONE"
  | "GPU_SHORTAGE"
  | "FUNDING_BOOM"
  | "REGULATION"
  | "VIRAL_TREND"
  | "DATA_BREACH";

export interface MarketEvent {
  type: MarketEventType;
  description: string;
}

// ── Turn Log ───────────────────────────────────────────────────

export interface StartupTurnAction {
  agentId: string;
  action: StartupAction;
  success: boolean;
  result: string;
  valuationAfter: number;
}

export interface StartupTurnLogEntry {
  turn: number;
  marketEvent: MarketEvent;
  actions: StartupTurnAction[];
  eliminations: string[]; // agentIds eliminated this turn
  acquisitions: { acquirer: string; target: string }[];
  timestamp: number;
}

// ── Win Condition ──────────────────────────────────────────────

export type StartupWinCondition =
  | "valuation_threshold"
  | "acquisition"
  | "last_standing"
  | "turn_limit";

// ── Agent Config (lobby setup) ────────────────────────────────

export type StartupAgentSource = "preset" | "openclaw";

export interface StartupAgentConfig {
  agentId: string;
  agentName: string;
  agentSource: StartupAgentSource;
  presetId?: string;
  /** Join code for remote OpenClaw relay (only set when agentSource === "openclaw"). */
  joinCode?: string;
}

// ── Game State ─────────────────────────────────────────────────

export type StartupGameStatus = "lobby" | "running" | "finished";

export interface StartupGame {
  id: string;
  status: StartupGameStatus;
  creatorId?: string;
  agents: StartupAgent[];
  agentConfigs?: StartupAgentConfig[];
  currentTurn: number;
  maxTurns: number;
  turnLog: StartupTurnLogEntry[];
  winner?: string; // agentId
  winCondition?: StartupWinCondition;
  narrative?: string;
  createdAt: number;
  updatedAt: number;
}