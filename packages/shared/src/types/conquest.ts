// ── Hex Coordinates ─────────────────────────────────────────────

/** Axial hex coordinate (q = column, r = row). */
export interface HexCoord {
  q: number;
  r: number;
}

// ── Terrain ─────────────────────────────────────────────────────

export type TerrainType = "plains" | "hills" | "forest" | "mountain" | "swamp";

/** Combat modifier per terrain — multiplier applied to attack/defense power. */
export const TERRAIN_MODIFIERS: Record<TerrainType, number> = {
  plains: 1.0,
  hills: 1.2,
  forest: 1.1,
  mountain: 1.4,
  swamp: 0.8,
};

// ── Territory ───────────────────────────────────────────────────

export interface Territory {
  coord: HexCoord;
  terrain: TerrainType;
  owner: string | null; // agentId or null = neutral (human-controlled)
  strength: number; // 1–5
}

// ── Agent Actions ───────────────────────────────────────────────

export type ConquestActionType = "EXPAND" | "ATTACK" | "FORTIFY" | "HOLD";

export interface ConquestAction {
  type: ConquestActionType;
  /** Source territory (own territory performing the action). Null for HOLD. */
  source: HexCoord | null;
  /** Target territory. Null for HOLD and FORTIFY. */
  target: HexCoord | null;
  /** AI reasoning for the action. */
  reasoning: string;
}

// ── Agent State ─────────────────────────────────────────────────

export type ConquestAgentStatus = "active" | "eliminated";

export interface ConquestAgent {
  agentId: string;
  agentName: string;
  color: string; // hex color for rendering
  status: ConquestAgentStatus;
  eliminatedOnTurn?: number;
}

// ── Turn Log ────────────────────────────────────────────────────

export interface ConquestTurnAction {
  agentId: string;
  action: ConquestAction;
  success: boolean;
  result?: string; // human-readable description of what happened
}

export interface ConquestTurnLogEntry {
  turn: number;
  actions: ConquestTurnAction[];
  eliminations: string[]; // agentIds eliminated this turn
  timestamp: number;
}

// ── Win Condition ───────────────────────────────────────────────

export type WinCondition = "territorial_majority" | "last_standing" | "turn_limit";

// ── Game State ──────────────────────────────────────────────────

export type ConquestGameStatus = "lobby" | "running" | "finished";
export type MapTemplate = "hex19" | "hex37";

export interface ConquestGame {
  id: string;
  status: ConquestGameStatus;
  mapTemplate: MapTemplate;
  territories: Territory[];
  agents: ConquestAgent[];
  currentTurn: number;
  turnLog: ConquestTurnLogEntry[];
  winner?: string; // agentId
  winCondition?: WinCondition;
  createdAt: number;
  updatedAt: number;
}
