/** Maximum turns before the game ends. */
export const MAX_TURNS = 20;

/** Starting cash for each agent. */
export const STARTING_CASH = 500_000;

/** Starting compute for each agent. */
export const STARTING_COMPUTE = 10;

/** Starting data for each agent. */
export const STARTING_DATA = 10;

/** Starting model score for each agent. */
export const STARTING_MODEL = 5;

/** Starting users for each agent. */
export const STARTING_USERS = 0;

/** Valuation threshold to win ($100M). */
export const VALUATION_THRESHOLD = 100_000_000;

/** Acquisition ratio — if your valuation >= 5x theirs, you can acquire them. */
export const ACQUISITION_RATIO = 5;

/** Delay in ms between turns (spectator pacing). */
export const TURN_DELAY_MS = 6000;

/** Delay in ms before revealing each agent's action. */
export const ACTION_REVEAL_DELAY_MS = 1500;

/** Delay in ms to display market event before actions. */
export const MARKET_EVENT_DISPLAY_MS = 2500;

/** Agent colors (assigned in order). */
export const AGENT_COLORS = ["#d94a4a", "#4a90d9", "#4ad97a", "#d9a64a"] as const;

/** Startup-specific personality presets. */
export const STARTUP_PRESETS = [
  { id: "growth_hacker", name: "Growth Hacker", description: "Move fast, deploy early, blitz users.", color: "#d94a4a" },
  { id: "deep_tech", name: "Deep Tech", description: "Max compute + data, then one big launch.", color: "#4a90d9" },
  { id: "corporate_raider", name: "Corporate Raider", description: "Poach aggressively, acquire the weak.", color: "#d9a64a" },
  { id: "open_evangelist", name: "Open Evangelist", description: "Open-source everything, win by community.", color: "#4ad97a" },
] as const;

export type StartupPresetId = (typeof STARTUP_PRESETS)[number]["id"];

/** Delay in ms between dialogue statements. */
export const DIALOGUE_STATEMENT_DELAY_MS = 2000;
