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
export const TURN_DELAY_MS = 3000;

/** Agent colors (assigned in order). */
export const AGENT_COLORS = ["#d94a4a", "#4a90d9", "#4ad97a", "#d9a64a"] as const;
