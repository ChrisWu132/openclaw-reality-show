import { useEffect, useRef } from "react";
import { createPixiApp } from "../../pixi/setup";
import {
  createCharacterSprite,
  createWorkstationGrid,
  createScanLines,
  createScanBeam,
  type CharacterSprite,
} from "../../pixi/sprites";
import { startIdleAnimation, animateScanBeam } from "../../pixi/animations";
import type { Application } from "pixi.js";

// Module-level references for other hooks/components
let spritesMap: Map<string, CharacterSprite> = new Map();
let pixiAppRef: Application | null = null;

export function getSpritesMap(): Map<string, CharacterSprite> {
  return spritesMap;
}

export function getPixiApp(): Application | null {
  return pixiAppRef;
}

const CHARACTER_IDS = ["coordinator", "nyx", "sable", "calla", "eli", "monitor"];

export function SceneCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<Application | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const cleanups: (() => void)[] = [];
    let destroyed = false;

    (async () => {
      if (destroyed) return;

      const app = await createPixiApp(containerRef.current!);
      if (destroyed) {
        app.destroy(true);
        return;
      }

      appRef.current = app;
      pixiAppRef = app;

      // Draw environment
      createWorkstationGrid(app.stage);

      // Create character sprites
      const map = new Map<string, CharacterSprite>();
      for (const id of CHARACTER_IDS) {
        const sprite = createCharacterSprite(id);
        app.stage.addChild(sprite.container);
        map.set(id, sprite);

        const stopIdle = startIdleAnimation(sprite);
        cleanups.push(stopIdle);
      }

      spritesMap = map;

      // Add scan lines overlay (on top of everything)
      createScanLines(app.stage);

      // Add moving scan beam
      const beam = createScanBeam(app.stage);
      const stopBeam = animateScanBeam(beam);
      cleanups.push(stopBeam);
    })();

    return () => {
      destroyed = true;
      cleanups.forEach((fn) => fn());
      if (appRef.current) {
        appRef.current.destroy(true);
        appRef.current = null;
      }
      pixiAppRef = null;
      spritesMap = new Map();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "960px",
        height: "540px",
        border: "1px solid #1A1A30",
        imageRendering: "pixelated",
        boxShadow: "0 0 30px rgba(74, 144, 217, 0.05), inset 0 0 60px rgba(0, 0, 0, 0.3)",
      }}
    />
  );
}
