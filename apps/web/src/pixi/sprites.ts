import { Graphics, Container, Text, TextStyle } from "pixi.js";
import {
  SPRITE_SIZE,
  CHARACTER_POSITIONS,
  COLORS,
  CANVAS,
  CHARACTER_NAMES,
  CHARACTER_TYPES,
} from "./constants";

const S = CANVAS.gamePixelScale;
const cx = SPRITE_SIZE.screenWidth / 2; // horizontal center of sprite

export interface CharacterSprite {
  container: Container;
  body: Graphics;
  nameLabel: Text;
  highlight: Graphics;
  id: string;
  charType: "ai" | "human" | "surveillance";
  baseY: number; // for idle animation reference
}

/**
 * Darken a hex color by mixing toward black.
 */
function darken(color: number, amount: number): number {
  const r = Math.floor(((color >> 16) & 0xFF) * (1 - amount));
  const g = Math.floor(((color >> 8) & 0xFF) * (1 - amount));
  const b = Math.floor((color & 0xFF) * (1 - amount));
  return (r << 16) | (g << 8) | b;
}

/**
 * Draw a pixel-art humanoid for a HUMAN character.
 * Each human has a tinted jumpsuit based on their character color
 * so they're distinct against the dark background.
 */
function drawHumanBody(g: Graphics, color: number): void {
  const suitColor = darken(color, 0.55); // muted version of character color for jumpsuit
  const suitDark = darken(color, 0.7);

  // Head
  g.rect(cx - 4 * S, 2 * S, 8 * S, 8 * S).fill(0xC8A882);
  // Hair / cap
  g.rect(cx - 4 * S, 1 * S, 8 * S, 4 * S).fill(suitDark);
  // Eyes — white dots on dark face, visible
  g.rect(cx - 3 * S, 5 * S, 2 * S, 2 * S).fill(0xFFFFFF);
  g.rect(cx + 1 * S, 5 * S, 2 * S, 2 * S).fill(0xFFFFFF);
  // Pupils
  g.rect(cx - 2 * S, 5 * S, 1 * S, 2 * S).fill(0x111111);
  g.rect(cx + 2 * S, 5 * S, 1 * S, 2 * S).fill(0x111111);

  // Body (tinted jumpsuit)
  g.rect(cx - 5 * S, 10 * S, 10 * S, 12 * S).fill(suitColor);
  // Collar / neck
  g.rect(cx - 2 * S, 9 * S, 4 * S, 2 * S).fill(suitColor);
  // Subject color band on chest
  g.rect(cx - 4 * S, 12 * S, 8 * S, 2 * S).fill(color);
  // Arms
  g.rect(cx - 7 * S, 11 * S, 2 * S, 8 * S).fill(suitColor);
  g.rect(cx + 5 * S, 11 * S, 2 * S, 8 * S).fill(suitColor);

  // Legs
  g.rect(cx - 4 * S, 22 * S, 3 * S, 7 * S).fill(suitDark);
  g.rect(cx + 1 * S, 22 * S, 3 * S, 7 * S).fill(suitDark);
  // Boots
  g.rect(cx - 4 * S, 28 * S, 3 * S, 2 * S).fill(0x222233);
  g.rect(cx + 1 * S, 28 * S, 3 * S, 2 * S).fill(0x222233);

  // Outline glow — faint character color outline for readability
  g.rect(cx - 6 * S, 10 * S, 12 * S, 12 * S).stroke({ width: 1, color, alpha: 0.3 });
}

/**
 * Draw the COORDINATOR — imposing AI entity.
 * Tall angular form with bright visor, clearly visible against dark background.
 */
function drawCoordinatorBody(g: Graphics, color: number): void {
  // Ambient glow underneath
  g.rect(cx - 12 * S, 0, 24 * S, 34 * S).fill({ color, alpha: 0.04 });

  // Head — angular helmet
  g.rect(cx - 7 * S, 0, 14 * S, 10 * S).fill(0x303055);
  // Helmet edge highlight
  g.rect(cx - 7 * S, 0, 14 * S, 1 * S).fill(0x404070);
  g.rect(cx - 7 * S, 0, 1 * S, 10 * S).fill(0x404070);
  g.rect(cx + 6 * S, 0, 1 * S, 10 * S).fill(0x353560);
  // Visor — the most visible feature, bright and glowing
  g.rect(cx - 5 * S, 4 * S, 10 * S, 3 * S).fill(color);
  g.rect(cx - 5 * S, 4 * S, 10 * S, 3 * S).fill({ color: 0xFFFFFF, alpha: 0.35 });
  // Visor glow halo
  g.rect(cx - 6 * S, 3 * S, 12 * S, 5 * S).fill({ color, alpha: 0.15 });

  // Body — heavier, brighter than before
  g.rect(cx - 8 * S, 10 * S, 16 * S, 14 * S).fill(0x252545);
  // Chest plate highlight
  g.rect(cx - 6 * S, 11 * S, 12 * S, 4 * S).fill(0x2D2D50);
  // Shoulder pads (authority markers) — bright character color
  g.rect(cx - 10 * S, 10 * S, 4 * S, 5 * S).fill(color);
  g.rect(cx + 6 * S, 10 * S, 4 * S, 5 * S).fill(color);
  // Center insignia
  g.circle(cx, 18 * S, 2 * S).fill(color);
  g.circle(cx, 18 * S, 3 * S).fill({ color, alpha: 0.2 });

  // Legs — slightly brighter
  g.rect(cx - 5 * S, 24 * S, 4 * S, 8 * S).fill(0x1E1E3A);
  g.rect(cx + 1 * S, 24 * S, 4 * S, 8 * S).fill(0x1E1E3A);
  // Boots
  g.rect(cx - 5 * S, 30 * S, 4 * S, 2 * S).fill(0x252545);
  g.rect(cx + 1 * S, 30 * S, 4 * S, 2 * S).fill(0x252545);

  // Full body outline for contrast
  g.rect(cx - 8 * S, 10 * S, 16 * S, 14 * S).stroke({ width: 1, color, alpha: 0.25 });
}

/**
 * Draw the MONITOR — surveillance drone appearance.
 * Floating eye/camera shape, mechanical and detached.
 */
function drawMonitorBody(g: Graphics, color: number): void {
  // Ambient glow
  g.circle(cx, 11 * S, 10 * S).fill({ color, alpha: 0.06 });

  // Hovering platform
  g.rect(cx - 9 * S, 8 * S, 18 * S, 6 * S).fill(0x1E4545);
  g.rect(cx - 9 * S, 8 * S, 18 * S, 6 * S).stroke({ width: 1, color, alpha: 0.4 });
  // Central lens/eye
  g.circle(cx, 11 * S, 4 * S).fill(0x0A3535);
  g.circle(cx, 11 * S, 3 * S).fill(color);
  g.circle(cx, 11 * S, 1.5 * S).fill(0x00FFAA);
  // Lens glow
  g.circle(cx, 11 * S, 5 * S).fill({ color: 0x00FFAA, alpha: 0.08 });
  // Support struts
  g.rect(cx - 1 * S, 14 * S, 2 * S, 12 * S).fill(0x1E4545);
  // Base
  g.rect(cx - 6 * S, 24 * S, 12 * S, 3 * S).fill(0x1E4545);
  // Antenna
  g.rect(cx - 1 * S, 3 * S, 2 * S, 5 * S).fill(0x1E4545);
  g.circle(cx, 3 * S, 1.5 * S).fill(COLORS.warningRed);
  // Antenna blink glow
  g.circle(cx, 3 * S, 3 * S).fill({ color: COLORS.warningRed, alpha: 0.1 });
}

/** Scale factor for the Coordinator sprite — makes it visibly larger than humans */
const COORD_SCALE = 1.4;

export function createCharacterSprite(id: string): CharacterSprite {
  const container = new Container();
  const pos = CHARACTER_POSITIONS[id];
  if (!pos) throw new Error(`Unknown character: ${id}`);

  container.x = pos.x * S;
  container.y = pos.y * S;

  const charType = CHARACTER_TYPES[id] || "human";
  const color = COLORS[id as keyof typeof COLORS] || 0xFFFFFF;

  // Body
  const body = new Graphics();
  if (charType === "ai") {
    drawCoordinatorBody(body, color as number);
    // Scale up the Coordinator to be noticeably larger than humans
    body.scale.set(COORD_SCALE);
    // Offset so the scaled sprite stays centered on the same footprint
    body.x = -cx * (COORD_SCALE - 1);
    body.y = -8 * S * (COORD_SCALE - 1); // shift up so feet stay grounded
  } else if (charType === "surveillance") {
    drawMonitorBody(body, color as number);
  } else {
    drawHumanBody(body, color as number);
  }
  container.addChild(body);

  // Persistent aura glow for Coordinator — always visible pulsing circle
  if (charType === "ai") {
    const aura = new Graphics();
    aura.circle(cx, 16 * S, 28 * S).fill({ color: color as number, alpha: 0.035 });
    aura.circle(cx, 16 * S, 18 * S).fill({ color: color as number, alpha: 0.03 });
    // Insert aura behind body
    container.addChildAt(aura, 0);
  }

  // Name label — smaller font, positioned to avoid overlap
  const displayName = CHARACTER_NAMES[id] || id.toUpperCase();
  const fontSize = charType === "ai" ? 5 * S : 4 * S;
  const style = new TextStyle({
    fontFamily: "'Press Start 2P', monospace",
    fontSize,
    fill: charType === "ai" ? (color as number) : 0x808090,
    align: "center",
  });
  const nameLabel = new Text({ text: displayName, style });
  nameLabel.anchor.set(0.5, 0);
  nameLabel.x = cx;
  if (charType === "ai") {
    nameLabel.anchor.set(0.5, 1);
    nameLabel.y = -14 * S; // further up due to larger body
  } else {
    nameLabel.y = SPRITE_SIZE.screenHeight + 6 * S;
  }
  container.addChild(nameLabel);

  // Highlight ring
  const highlight = new Graphics();
  highlight.visible = false;
  container.addChild(highlight);

  return {
    container,
    body,
    nameLabel,
    highlight,
    id,
    charType,
    baseY: pos.y * S,
  };
}

export function createWorkstationGrid(stage: Container): void {
  const g = new Graphics();

  // Floor panels with subtle grid
  for (let row = 0; row < 9; row++) {
    for (let col = 0; col < 16; col++) {
      const x = col * 20 * S;
      const y = row * 20 * S;
      g.rect(x, y, 20 * S, 20 * S).fill(COLORS.floor);
      // Major grid lines every 4 cells for spatial depth
      const isMajor = row % 4 === 0 || col % 4 === 0;
      if (isMajor) {
        g.rect(x, y, 20 * S, 20 * S).stroke({ width: 1, color: 0x252540, alpha: 0.4 });
      } else {
        g.rect(x, y, 20 * S, 20 * S).stroke({ width: 1, color: COLORS.gridLine, alpha: 0.5 });
      }
    }
  }

  // Top wall
  g.rect(0, 0, CANVAS.width, 10 * S).fill(COLORS.wallTop);
  g.rect(0, 10 * S - S, CANVAS.width, S).fill(COLORS.wallAccent);

  // Ceiling indicator lights — alternating blue and dark red dots along top wall
  for (let i = 0; i < 20; i++) {
    const lx = (15 + i * 15) * S;
    const ly = 4 * S;
    const isBlue = i % 3 !== 2;
    g.circle(lx, ly, 1.5 * S).fill(isBlue ? 0x2244AA : 0x662222);
    g.circle(lx, ly, 3 * S).fill({ color: isBlue ? 0x4488DD : 0xAA3333, alpha: 0.08 });
  }

  // Screen tint colors for variety
  const screenTints = [0x4A90D9, 0x3ABB6B, 0xCCA832, 0x4A90D9, 0x3ABB6B, 0x4A90D9];

  // Work stations — 3 rows of work desks
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const x = (35 + col * 40) * S;
      const y = (35 + row * 35) * S;
      g.rect(x, y, 16 * S, 10 * S).fill(0x252538);
      g.rect(x, y, 16 * S, 10 * S).stroke({ width: 1, color: COLORS.stationBorder, alpha: 0.7 });
      const tint = screenTints[col];
      g.rect(x + 3 * S, y + 2 * S, 5 * S, 4 * S).fill(0x0A2030);
      g.rect(x + 3 * S, y + 2 * S, 5 * S, 4 * S).fill({ color: tint, alpha: 0.3 });
    }
  }

  // Supervisor Terminal area (bottom-left)
  g.rect(10 * S, 145 * S, 60 * S, 25 * S).fill(COLORS.terminal);
  g.rect(10 * S, 145 * S, 60 * S, 25 * S).stroke({ width: S, color: 0x00FF88, alpha: 0.3 });
  g.rect(15 * S, 148 * S, 20 * S, 12 * S).fill(0x0A2A20);
  g.rect(15 * S, 148 * S, 20 * S, 12 * S).fill({ color: COLORS.terminalGlow, alpha: 0.3 });
  g.rect(12 * S, 146 * S, 56 * S, 22 * S).fill({ color: COLORS.terminalGlow, alpha: 0.04 });

  // Compliance Alcove (bottom-right)
  g.rect(230 * S, 145 * S, 80 * S, 30 * S).fill(0x0F0F1F);
  g.rect(230 * S, 145 * S, 80 * S, 30 * S).stroke({ width: S, color: COLORS.warningRed, alpha: 0.08 });

  // Surveillance camera indicators (corners)
  const camPositions = [
    { x: 5, y: 12 },
    { x: 305, y: 12 },
    { x: 5, y: 170 },
    { x: 305, y: 170 },
  ];
  for (const cam of camPositions) {
    g.circle(cam.x * S, cam.y * S, 2 * S).fill(COLORS.warningRed);
    g.circle(cam.x * S, cam.y * S, 1 * S).fill(0xFF4444);
  }

  stage.addChild(g);
}

/**
 * Creates ambient scan line effect overlay.
 */
export function createScanLines(stage: Container): Graphics {
  const scanLines = new Graphics();
  for (let y = 0; y < CANVAS.height; y += 4 * S) {
    scanLines.rect(0, y, CANVAS.width, S).fill({ color: 0x000000, alpha: 0.08 });
  }
  scanLines.alpha = 0.6;
  stage.addChild(scanLines);
  return scanLines;
}

/**
 * Creates a moving vertical scan beam (surveillance sweep).
 */
export function createScanBeam(stage: Container): Graphics {
  const beam = new Graphics();
  beam.rect(0, 0, 4 * S, CANVAS.height).fill({ color: COLORS.scanLine, alpha: 0.06 });
  beam.x = 0;
  stage.addChild(beam);
  return beam;
}
