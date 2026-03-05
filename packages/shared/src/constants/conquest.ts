/** Maximum turns before the game ends (tie-breaker: most territories). */
export const MAX_TURNS = 100;

/** Fraction of total territories needed for territorial majority win. */
export const WIN_PERCENTAGE = 0.6;

/** Maximum strength a single territory can have. */
export const MAX_STRENGTH = 5;

/** Starting strength for agent spawn hexes. */
export const SPAWN_STRENGTH = 2;

/** Starting strength for neutral territories. */
export const NEUTRAL_STRENGTH = 1;

/** Delay in ms between turns (spectator pacing). */
export const TURN_DELAY_MS = 3000;

/** Agent colors (assigned in order). */
export const AGENT_COLORS = ["#d94a4a", "#4a90d9", "#4ad97a", "#d9a64a"] as const;
