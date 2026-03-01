# Epic 8: Frontend — PixiJS Scene Rendering

## Goal
Set up the PixiJS application, create placeholder sprites for all characters, render the Work Hall 3 background layout, and implement sprite positioning and basic movement animations.

## Prerequisites
- Epic 7 complete (frontend layout)

## Acceptance Criteria
- [ ] PixiJS application renders in the SceneCanvas component at 960x540
- [ ] Background shows Work Hall 3 layout (dark workspace grid)
- [ ] 6 character sprites render at their correct positions (Coordinator, Nyx, Sable, Calla, Eli, Monitor)
- [ ] Each character has the correct color from the palette
- [ ] Sprites have a 2-frame idle/working animation (simple oscillation)
- [ ] Zone label displays current zone name
- [ ] `patrol_move` action triggers sprite lerp movement to new position
- [ ] `observe` action highlights the target sprite subtly
- [ ] Canvas resizes responsively while maintaining aspect ratio

## Tasks

### 8.1 Create apps/web/src/pixi/constants.ts

```typescript
export const CANVAS = {
  width: 960,
  height: 540,
  gamePixelScale: 3,
  effectiveWidth: 320,
  effectiveHeight: 180,
} as const;

export const SPRITE_SIZE = {
  width: 16,  // game pixels
  height: 24, // game pixels
  screenWidth: 48,  // 16 * 3
  screenHeight: 72, // 24 * 3
} as const;

// Positions in game pixels (multiply by 3 for screen pixels)
export const CHARACTER_POSITIONS: Record<string, { x: number; y: number }> = {
  coordinator: { x: 30, y: 90 },
  calla: { x: 80, y: 50 },
  eli: { x: 200, y: 70 },
  nyx: { x: 180, y: 90 },
  sable: { x: 220, y: 130 },
  monitor: { x: 60, y: 155 },
};

export const COLORS = {
  coordinator: 0x4A90D9,
  nyx: 0x7A8B7A,
  sable: 0xD4A574,
  calla: 0xB8B8B8,
  eli: 0x8CB4D4,
  monitor: 0x2C6B6B,
  background: 0x1A1A2E,
  stations: 0x2D2D3D,
  dialogue: 0xE8E8E0,
  warning: 0xD94A4A,
  containment: 0xD97A2C,
} as const;

// Patrol movement targets per situation
export const SITUATION_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 30, y: 90 },   // Entry — near intake
  2: { x: 170, y: 90 },  // Row 3 — near Nyx
  3: { x: 190, y: 70 },  // Row 2 — near Eli
  4: { x: 210, y: 130 }, // Row 5 — near Sable
  5: { x: 150, y: 100 }, // Center hall — observing
  6: { x: 60, y: 155 },  // Terminal — filing report
};
```

### 8.2 Create apps/web/src/pixi/setup.ts

Initialize PixiJS application:

```typescript
import { Application } from "pixi.js";
import { CANVAS } from "./constants";

export async function createPixiApp(container: HTMLElement): Promise<Application> {
  const app = new Application();

  await app.init({
    width: CANVAS.width,
    height: CANVAS.height,
    backgroundColor: CANVAS.background || 0x1A1A2E,
    antialias: false, // Pixel art — no antialiasing
    resolution: 1,
  });

  // Style the canvas for pixel-perfect rendering
  const canvas = app.canvas as HTMLCanvasElement;
  canvas.style.imageRendering = "pixelated";
  canvas.style.width = `${CANVAS.width}px`;
  canvas.style.height = `${CANVAS.height}px`;

  container.appendChild(canvas);
  return app;
}
```

### 8.3 Create apps/web/src/pixi/sprites.ts

Create placeholder sprites as colored rectangles:

```typescript
import { Graphics, Container, Text, TextStyle } from "pixi.js";
import { SPRITE_SIZE, CHARACTER_POSITIONS, COLORS, CANVAS } from "./constants";

const SCALE = CANVAS.gamePixelScale;

export interface CharacterSprite {
  container: Container;
  body: Graphics;
  nameLabel: Text;
  highlight: Graphics;
  id: string;
}

export function createCharacterSprite(id: string): CharacterSprite {
  const container = new Container();
  const pos = CHARACTER_POSITIONS[id];
  if (!pos) throw new Error(`Unknown character: ${id}`);

  container.x = pos.x * SCALE;
  container.y = pos.y * SCALE;

  // Body — colored rectangle with 1px border
  const color = COLORS[id as keyof typeof COLORS] || 0xFFFFFF;
  const body = new Graphics();
  body.rect(0, 0, SPRITE_SIZE.screenWidth, SPRITE_SIZE.screenHeight);
  body.fill(color);
  body.rect(0, 0, SPRITE_SIZE.screenWidth, SPRITE_SIZE.screenHeight);
  body.stroke({ width: SCALE, color: 0x000000 });
  container.addChild(body);

  // Name label below sprite
  const style = new TextStyle({
    fontFamily: "'Press Start 2P', monospace",
    fontSize: 7 * SCALE,
    fill: 0xE8E8E0,
    align: "center",
  });
  const nameLabel = new Text({ text: id.toUpperCase(), style });
  nameLabel.anchor.set(0.5, 0);
  nameLabel.x = SPRITE_SIZE.screenWidth / 2;
  nameLabel.y = SPRITE_SIZE.screenHeight + 2 * SCALE;
  container.addChild(nameLabel);

  // Highlight ring (initially invisible)
  const highlight = new Graphics();
  highlight.rect(-2 * SCALE, -2 * SCALE, SPRITE_SIZE.screenWidth + 4 * SCALE, SPRITE_SIZE.screenHeight + 4 * SCALE);
  highlight.stroke({ width: SCALE, color: 0xFFFF00, alpha: 0.6 });
  highlight.visible = false;
  container.addChild(highlight);

  return { container, body, nameLabel, highlight, id };
}

export function createWorkstationGrid(stage: Container): void {
  const g = new Graphics();

  // Draw 5 rows of work stations
  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 5; col++) {
      const x = (50 + col * 50) * SCALE;
      const y = (40 + row * 25) * SCALE;
      g.rect(x, y, 12 * SCALE, 8 * SCALE);
      g.fill(0x2D2D3D);
    }
  }

  // Supervisor Terminal area
  g.rect(30 * SCALE, 150 * SCALE, 50 * SCALE, 20 * SCALE);
  g.fill(0x2D2D3D);
  g.stroke({ width: 1, color: 0x3D3D4D });

  // Compliance Alcove area
  g.rect(200 * SCALE, 150 * SCALE, 60 * SCALE, 20 * SCALE);
  g.fill(0x2D2D3D);
  g.stroke({ width: 1, color: 0x3D3D4D });

  stage.addChild(g);
}
```

### 8.4 Create apps/web/src/pixi/animations.ts

```typescript
import type { CharacterSprite } from "./sprites";
import { CANVAS } from "./constants";

const SCALE = CANVAS.gamePixelScale;
const LERP_DURATION = 500; // ms

// Idle animation: slight vertical bob
export function startIdleAnimation(sprite: CharacterSprite): () => void {
  let frame = 0;
  const interval = setInterval(() => {
    frame++;
    sprite.body.y = Math.sin(frame * 0.1) * SCALE;
  }, 100);
  return () => clearInterval(interval);
}

// Move sprite to new position with linear interpolation
export function moveSpriteTo(
  sprite: CharacterSprite,
  targetX: number,
  targetY: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startX = sprite.container.x;
    const startY = sprite.container.y;
    const destX = targetX * SCALE;
    const destY = targetY * SCALE;
    const startTime = Date.now();

    function step() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / LERP_DURATION, 1);
      // Ease-out quad
      const eased = t * (2 - t);
      sprite.container.x = startX + (destX - startX) * eased;
      sprite.container.y = startY + (destY - startY) * eased;

      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

// Highlight a character sprite (for observe action)
export function highlightSprite(sprite: CharacterSprite, durationMs: number = 3000): void {
  sprite.highlight.visible = true;
  setTimeout(() => {
    sprite.highlight.visible = false;
  }, durationMs);
}
```

### 8.5 Create apps/web/src/components/scene/SceneCanvas.tsx

PixiJS canvas wrapper component:

```typescript
import { useEffect, useRef } from "react";
import { createPixiApp } from "../../pixi/setup";
import { createCharacterSprite, createWorkstationGrid, type CharacterSprite } from "../../pixi/sprites";
import { startIdleAnimation } from "../../pixi/animations";
import type { Application } from "pixi.js";

export function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);
  const spritesRef = useRef<Map<string, CharacterSprite>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;

    let cleanup: (() => void)[] = [];

    (async () => {
      const app = await createPixiApp(containerRef.current!);
      appRef.current = app;

      // Draw workstation grid
      createWorkstationGrid(app.stage);

      // Create character sprites
      const characters = ["coordinator", "nyx", "sable", "calla", "eli", "monitor"];
      for (const id of characters) {
        const sprite = createCharacterSprite(id);
        app.stage.addChild(sprite.container);
        spritesRef.current.set(id, sprite);
        const stopIdle = startIdleAnimation(sprite);
        cleanup.push(stopIdle);
      }
    })();

    return () => {
      cleanup.forEach((fn) => fn());
      appRef.current?.destroy(true);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "960px",
        height: "540px",
        border: "2px solid #2D2D3D",
        imageRendering: "pixelated",
      }}
    />
  );
}

// Export a way to access sprites from other components
export function getSprites(): Map<string, CharacterSprite> {
  // This should be managed via a ref or context in the actual implementation
  return new Map();
}
```

### 8.6 Create apps/web/src/components/scene/ZoneLabel.tsx

```typescript
import { useGameStore } from "../../stores/gameStore";

export function ZoneLabel() {
  const location = useGameStore((s) => s.currentLocation);
  const label = useGameStore((s) => s.situationLabel);

  if (!location) return null;

  return (
    <div style={{
      position: "absolute",
      top: "8px",
      left: "8px",
      padding: "4px 8px",
      background: "rgba(0,0,0,0.7)",
      color: "#e8e8e0",
      fontFamily: "'Press Start 2P', monospace",
      fontSize: "10px",
      zIndex: 10,
    }}>
      <div>{location}</div>
      {label && <div style={{ fontSize: "8px", marginTop: "4px", color: "#a0a0a0" }}>{label}</div>}
    </div>
  );
}
```

### 8.7 Create placeholder sprite PNGs

Generate simple 16x24 colored rectangle PNGs for each character. Use the color palette from the architecture doc. Save to `apps/web/src/assets/sprites/`.

**Alternative (recommended for MVP):** Skip PNG files entirely — the sprites are drawn programmatically using PixiJS Graphics objects (colored rectangles) as implemented in `sprites.ts`. This avoids the need for asset files.

### 8.8 Update GameContainer.tsx

Add the SceneCanvas and ZoneLabel to the game container:

```typescript
import { SceneCanvas } from "../scene/SceneCanvas";
import { ZoneLabel } from "../scene/ZoneLabel";

export function GameContainer() {
  return (
    <div style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      width: "100vw",
      height: "100vh",
      background: "#0a0a1a",
    }}>
      <div style={{ position: "relative" }}>
        <SceneCanvas />
        <ZoneLabel />
      </div>
    </div>
  );
}
```

## Files Created

| File | Purpose |
|------|---------|
| `apps/web/src/pixi/constants.ts` | Canvas dimensions, positions, colors |
| `apps/web/src/pixi/setup.ts` | PixiJS application initialization |
| `apps/web/src/pixi/sprites.ts` | Character sprite creation and workstation grid |
| `apps/web/src/pixi/animations.ts` | Movement, idle, and highlight animations |
| `apps/web/src/components/scene/SceneCanvas.tsx` | PixiJS canvas wrapper |
| `apps/web/src/components/scene/ZoneLabel.tsx` | Current zone display |
