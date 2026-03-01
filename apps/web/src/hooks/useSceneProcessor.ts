import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import {
  moveSpriteTo,
  highlightSprite,
  warningFlash,
  detainEffect,
  flinchAnimation,
  screenFlash,
  screenShake,
} from "../pixi/animations";
import { SITUATION_POSITIONS } from "../pixi/constants";
import type { CharacterSprite } from "../pixi/sprites";
import type { Application } from "pixi.js";

export function useSceneProcessor(
  sprites: Map<string, CharacterSprite>,
  app: Application | null,
): void {
  const sceneEvents = useGameStore((s) => s.sceneEvents);
  const currentSituation = useGameStore((s) => s.currentSituation);
  const lastProcessedRef = useRef(0);
  const lastSituationRef = useRef(0);

  // Handle situation transitions — move coordinator to new position
  useEffect(() => {
    if (currentSituation === lastSituationRef.current) return;
    if (sprites.size === 0) return;

    lastSituationRef.current = currentSituation;

    const coordSprite = sprites.get("coordinator");
    const pos = SITUATION_POSITIONS[currentSituation];
    if (coordSprite && pos) {
      moveSpriteTo(coordSprite, pos.x, pos.y);

      // Nearby humans flinch when Coordinator approaches
      setTimeout(() => {
        sprites.forEach((sprite) => {
          if (sprite.charType !== "human") return;
          // Check if this human is near the Coordinator's destination
          const dx = Math.abs(sprite.container.x - pos.x * 3);
          const dy = Math.abs(sprite.container.y - pos.y * 3);
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance < 250) {
            flinchAnimation(sprite);
          }
        });
      }, 800);
    }
  }, [currentSituation, sprites]);

  // Handle scene events — trigger animations per action type
  useEffect(() => {
    if (sceneEvents.length <= lastProcessedRef.current) return;
    if (sprites.size === 0) return;

    const latest = sceneEvents[sceneEvents.length - 1];
    lastProcessedRef.current = sceneEvents.length;

    const coordSprite = sprites.get("coordinator");
    const targetSprite = latest.speaker
      ? sprites.get(latest.speaker)
      : null;

    switch (latest.action) {
      case "patrol_move": {
        // Coordinator moves to situation position (also handled by situation transition)
        const pos = SITUATION_POSITIONS[currentSituation];
        if (coordSprite && pos) {
          moveSpriteTo(coordSprite, pos.x, pos.y);
        }
        break;
      }

      case "observe": {
        // Coordinator looks at target — soft highlight
        if (targetSprite || latest.speaker) {
          const observed = sprites.get(latest.target || latest.speaker);
          if (observed) {
            highlightSprite(observed, 4000, 0x4A90D9);
          }
        }
        break;
      }

      case "issue_warning": {
        // Warning — yellow flash on target, screen tenses
        const target = sprites.get(latest.target || "");
        if (target) {
          warningFlash(target);
          flinchAnimation(target);
        }
        // Screen flash
        if (app) {
          screenFlash(app.stage, 0xFFCC00, 400);
        }
        break;
      }

      case "issue_directive": {
        // Directive — brief highlight on coordinator
        if (coordSprite) {
          highlightSprite(coordSprite, 2000, 0x4A90D9);
        }
        break;
      }

      case "query": {
        // Query — highlight both coordinator and target
        if (coordSprite) {
          highlightSprite(coordSprite, 3000, 0x4A90D9);
        }
        const queryTarget = sprites.get(latest.target || "");
        if (queryTarget) {
          highlightSprite(queryTarget, 3000, 0xFFCC00);
        }
        break;
      }

      case "log_incident": {
        // Incident logged — ominous red pulse
        const logTarget = sprites.get(latest.target || "");
        if (logTarget) {
          highlightSprite(logTarget, 4000, 0xD94A4A);
        }
        if (app) {
          screenFlash(app.stage, 0xD94A4A, 300);
        }
        break;
      }

      case "detain": {
        // DETAIN — dramatic! Screen shake, red flash, character fades
        const detainTarget = sprites.get(latest.target || "");
        if (detainTarget) {
          detainEffect(detainTarget);
        }
        if (app) {
          screenShake(app.stage, 4, 500);
          screenFlash(app.stage, 0xD94A4A, 500);
        }
        // All other humans flinch
        setTimeout(() => {
          sprites.forEach((s) => {
            if (s.charType === "human" && s.id !== (latest.target || "")) {
              flinchAnimation(s);
            }
          });
        }, 300);
        break;
      }

      case "silence": {
        // Coordinator stands still — subtle blue glow
        if (coordSprite) {
          highlightSprite(coordSprite, 2000, 0x2A4A7A);
        }
        break;
      }

      case "file_report": {
        // Filing report at terminal — coordinator highlights
        if (coordSprite) {
          highlightSprite(coordSprite, 3000, 0x00FF88);
        }
        break;
      }

      default: {
        // NPC actions — generic highlight on speaker
        if (targetSprite) {
          highlightSprite(targetSprite, 2000, 0x404060);
        }
        break;
      }
    }
  }, [sceneEvents, sprites, currentSituation, app]);
}
