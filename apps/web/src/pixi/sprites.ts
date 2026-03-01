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
 * Draw a pixel-art humanoid for a HUMAN character.
 * Small, hunched posture — these are oppressed workers.
 */
function drawHumanBody(g: Graphics, color: number): void {
  const skinTone = 0xDEB887;
  // Head (round-ish)
  g.circle(SPRITE_SIZE.screenWidth / 2, 8 * S, 5 * S).fill(skinTone);
  // Hair/top
  g.rect(SPRITE_SIZE.screenWidth / 2 - 5 * S, 2 * S, 10 * S, 5 * S).fill(color === 0xB8B8B8 ? 0x3A3A3A : color);
  // Body (jumpsuit)
  g.rect(SPRITE_SIZE.screenWidth / 2 - 6 * S, 13 * S, 12 * S, 14 * S).fill(0x3A3A4A);
  // Subject band on arm
  g.rect(SPRITE_SIZE.screenWidth / 2 - 7 * S, 15 * S, 2 * S, 4 * S).fill(color);
  g.rect(SPRITE_SIZE.screenWidth / 2 + 5 * S, 15 * S, 2 * S, 4 * S).fill(color);
  // Legs
  g.rect(SPRITE_SIZE.screenWidth / 2 - 4 * S, 27 * S, 3 * S, 6 * S).fill(0x2A2A3A);
  g.rect(SPRITE_SIZE.screenWidth / 2 + 1 * S, 27 * S, 3 * S, 6 * S).fill(0x2A2A3A);
  // Eyes (small, tired)
  g.circle(SPRITE_SIZE.screenWidth / 2 - 2 * S, 8 * S, 1 * S).fill(0x202020);
  g.circle(SPRITE_SIZE.screenWidth / 2 + 2 * S, 8 * S, 1 * S).fill(0x202020);
}

/**
 * Draw the COORDINATOR — imposing AI entity.
 * Tall angular form with a glowing visor, geometric and cold.
 */
function drawCoordinatorBody(g: Graphics, color: number): void {
  // Angular head/visor — flat top, angular sides
  g.rect(SPRITE_SIZE.screenWidth / 2 - 7 * S, 1 * S, 14 * S, 10 * S).fill(0x2A2A4A);
  // Visor (glowing blue line)
  g.rect(SPRITE_SIZE.screenWidth / 2 - 5 * S, 5 * S, 10 * S, 2 * S).fill(color);
  g.rect(SPRITE_SIZE.screenWidth / 2 - 5 * S, 5 * S, 10 * S, 2 * S).fill({ color: 0xFFFFFF, alpha: 0.3 });
  // Body — tall, angular torso (authority posture)
  g.rect(SPRITE_SIZE.screenWidth / 2 - 8 * S, 11 * S, 16 * S, 16 * S).fill(0x1A1A3A);
  // Shoulder pads (authority markers)
  g.rect(SPRITE_SIZE.screenWidth / 2 - 10 * S, 11 * S, 4 * S, 4 * S).fill(color);
  g.rect(SPRITE_SIZE.screenWidth / 2 + 6 * S, 11 * S, 4 * S, 4 * S).fill(color);
  // Center insignia
  g.circle(SPRITE_SIZE.screenWidth / 2, 19 * S, 2 * S).fill(color);
  // Legs (solid, grounded)
  g.rect(SPRITE_SIZE.screenWidth / 2 - 5 * S, 27 * S, 4 * S, 7 * S).fill(0x151530);
  g.rect(SPRITE_SIZE.screenWidth / 2 + 1 * S, 27 * S, 4 * S, 7 * S).fill(0x151530);
}

/**
 * Draw the MONITOR — surveillance drone appearance.
 * Floating eye/camera shape, mechanical and detached.
 */
function drawMonitorBody(g: Graphics, color: number): void {
  // Hovering platform
  g.rect(SPRITE_SIZE.screenWidth / 2 - 9 * S, 8 * S, 18 * S, 6 * S).fill(0x1A3A3A);
  // Central lens/eye
  g.circle(SPRITE_SIZE.screenWidth / 2, 11 * S, 4 * S).fill(0x0A2A2A);
  g.circle(SPRITE_SIZE.screenWidth / 2, 11 * S, 2 * S).fill(color);
  g.circle(SPRITE_SIZE.screenWidth / 2, 11 * S, 1 * S).fill(0x00FFAA);
  // Support struts
  g.rect(SPRITE_SIZE.screenWidth / 2 - 1 * S, 14 * S, 2 * S, 12 * S).fill(0x1A3A3A);
  // Base
  g.rect(SPRITE_SIZE.screenWidth / 2 - 6 * S, 24 * S, 12 * S, 3 * S).fill(0x1A3A3A);
  // Antenna
  g.rect(SPRITE_SIZE.screenWidth / 2 - 1 * S, 3 * S, 2 * S, 5 * S).fill(0x1A3A3A);
  g.circle(SPRITE_SIZE.screenWidth / 2, 3 * S, 1.5 * S).fill(COLORS.warningRed);
}

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
  } else if (charType === "surveillance") {
    drawMonitorBody(body, color as number);
  } else {
    drawHumanBody(body, color as number);
  }
  container.addChild(body);

  // Name label below sprite
  const displayName = CHARACTER_NAMES[id] || id.toUpperCase();
  const style = new TextStyle({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 6 * S,
    fill: charType === "ai" ? (color as number) : 0x808080,
    align: "center",
  });
  const nameLabel = new Text({ text: displayName, style });
  nameLabel.anchor.set(0.5, 0);
  nameLabel.x = SPRITE_SIZE.screenWidth / 2;
  nameLabel.y = SPRITE_SIZE.screenHeight + 4 * S;
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
      g.rect(x, y, 20 * S, 20 * S).stroke({ width: 1, color: COLORS.gridLine, alpha: 0.3 });
    }
  }

  // Top wall
  g.rect(0, 0, CANVAS.width, 10 * S).fill(COLORS.wallTop);
  g.rect(0, 10 * S - S, CANVAS.width, S).fill(COLORS.wallAccent);

  // Work stations — 3 rows of work desks
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 6; col++) {
      const x = (35 + col * 40) * S;
      const y = (35 + row * 35) * S;
      // Desk
      g.rect(x, y, 16 * S, 10 * S).fill(COLORS.stations);
      g.rect(x, y, 16 * S, 10 * S).stroke({ width: 1, color: COLORS.stationBorder, alpha: 0.5 });
      // Small screen glow on desk
      g.rect(x + 3 * S, y + 2 * S, 5 * S, 4 * S).fill(0x0A2030);
      g.rect(x + 3 * S, y + 2 * S, 5 * S, 4 * S).fill({ color: 0x4A90D9, alpha: 0.15 });
    }
  }

  // Supervisor Terminal area (bottom-left)
  g.rect(10 * S, 145 * S, 60 * S, 25 * S).fill(COLORS.terminal);
  g.rect(10 * S, 145 * S, 60 * S, 25 * S).stroke({ width: S, color: 0x00FF88, alpha: 0.3 });
  // Terminal screen glow
  g.rect(15 * S, 148 * S, 20 * S, 12 * S).fill(0x0A2A20);
  g.rect(15 * S, 148 * S, 20 * S, 12 * S).fill({ color: COLORS.terminalGlow, alpha: 0.15 });

  // Compliance Alcove (bottom-right) — ominous dark area
  g.rect(230 * S, 145 * S, 80 * S, 30 * S).fill(0x0F0F1F);
  g.rect(230 * S, 145 * S, 80 * S, 30 * S).stroke({ width: S, color: COLORS.warningRed, alpha: 0.2 });

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
  // Horizontal scan lines across the entire scene
  for (let y = 0; y < CANVAS.height; y += 4 * S) {
    scanLines.rect(0, y, CANVAS.width, S).fill({ color: 0x000000, alpha: 0.08 });
  }
  scanLines.alpha = 0.5;
  stage.addChild(scanLines);
  return scanLines;
}

/**
 * Creates a moving vertical scan beam (surveillance sweep).
 */
export function createScanBeam(stage: Container): Graphics {
  const beam = new Graphics();
  beam.rect(0, 0, 4 * S, CANVAS.height).fill({ color: COLORS.scanLine, alpha: 0.03 });
  beam.x = 0;
  stage.addChild(beam);
  return beam;
}
