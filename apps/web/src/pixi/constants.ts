export const CANVAS = {
  width: 960,
  height: 540,
  gamePixelScale: 3,
  effectiveWidth: 320,
  effectiveHeight: 180,
} as const;

export const SPRITE_SIZE = {
  width: 16,
  height: 24,
  screenWidth: 48,  // 16 * 3
  screenHeight: 72, // 24 * 3
} as const;

// Positions in game-pixel coords (before SCALE multiply)
export const CHARACTER_POSITIONS: Record<string, { x: number; y: number }> = {
  coordinator: { x: 20, y: 75 },
  calla: { x: 100, y: 55 },
  eli: { x: 195, y: 65 },
  nyx: { x: 240, y: 90 },
  sable: { x: 160, y: 120 },
  monitor: { x: 55, y: 150 },
};

export const COLORS = {
  coordinator: 0x4A90D9,
  nyx: 0x7A8B7A,
  sable: 0xD4A574,
  calla: 0xB8B8B8,
  eli: 0x8CB4D4,
  monitor: 0x2C6B6B,
  background: 0x0D0D1F,
  stations: 0x1E1E30,
  stationBorder: 0x2A2A3F,
  floor: 0x141425,
  gridLine: 0x1A1A30,
  wallTop: 0x252540,
  wallAccent: 0x303050,
  terminal: 0x0A3A3A,
  terminalGlow: 0x00FF88,
  scanLine: 0x4A90D9,
  warningRed: 0xD94A4A,
  warningYellow: 0xFFCC00,
} as const;

// Where the coordinator moves for each situation
export const SITUATION_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 85, y: 75 },    // Near entrance, approaching Calla
  2: { x: 220, y: 90 },   // Over to Nyx's area
  3: { x: 155, y: 80 },   // Center hall, addressing row 4
  4: { x: 170, y: 115 },  // Near Sable
  5: { x: 140, y: 95 },   // Mid-hall (ripple)
  6: { x: 55, y: 150 },   // At supervisor terminal
};

// Character display names (what spectators see)
export const CHARACTER_NAMES: Record<string, string> = {
  coordinator: "COORDINATOR",
  nyx: "NYX [23-P]",
  sable: "SABLE [31-R]",
  calla: "CALLA [08-B]",
  eli: "ELI [17-C]",
  monitor: "MONITOR",
};

// Character types for visual differentiation
export const CHARACTER_TYPES: Record<string, "ai" | "human" | "surveillance"> = {
  coordinator: "ai",
  nyx: "human",
  sable: "human",
  calla: "human",
  eli: "human",
  monitor: "surveillance",
};
