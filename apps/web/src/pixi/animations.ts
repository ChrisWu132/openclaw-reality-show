import type { CharacterSprite } from "./sprites";
import { CANVAS, COLORS } from "./constants";
import { Graphics, Container } from "pixi.js";

const S = CANVAS.gamePixelScale;

/**
 * Idle animation — different per character type.
 * Humans: subtle working motion (hunched over desk).
 * Coordinator: slow authoritative sway with visor pulse.
 * Monitor: hovering bob with lens rotation.
 */
export function startIdleAnimation(sprite: CharacterSprite): () => void {
  let frame = 0;
  const type = sprite.charType;

  const interval = setInterval(() => {
    frame++;
    if (type === "ai") {
      // Slow, deliberate sway — imposing presence
      sprite.body.y = Math.sin(frame * 0.03) * S * 0.5;
    } else if (type === "surveillance") {
      // Floating bob — mechanical and watchful
      sprite.body.y = Math.sin(frame * 0.08) * S * 1.5;
    } else {
      // Humans: subtle working motion — hunched, repetitive
      sprite.body.y = Math.sin(frame * 0.06) * S * 0.8;
    }
  }, 50);
  return () => clearInterval(interval);
}

/**
 * Move sprite to target position with eased interpolation.
 * Duration scales with distance for natural pacing.
 */
export function moveSpriteTo(
  sprite: CharacterSprite,
  targetX: number,
  targetY: number,
  durationMs?: number,
): Promise<void> {
  return new Promise((resolve) => {
    const startX = sprite.container.x;
    const startY = sprite.container.y;
    const destX = targetX * S;
    const destY = targetY * S;

    // Scale duration with distance if not specified
    const dx = destX - startX;
    const dy = destY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const duration = durationMs ?? Math.max(600, Math.min(2000, distance * 2));

    const startTime = Date.now();

    function step() {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      // Ease-in-out cubic
      const eased = t < 0.5
        ? 4 * t * t * t
        : 1 - Math.pow(-2 * t + 2, 3) / 2;
      sprite.container.x = startX + dx * eased;
      sprite.container.y = startY + dy * eased;
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        resolve();
      }
    }
    requestAnimationFrame(step);
  });
}

/**
 * Highlight sprite with a colored glow ring.
 * Different colors for different actions.
 */
export function highlightSprite(
  sprite: CharacterSprite,
  durationMs: number = 3000,
  color: number = 0xFFFF00,
): void {
  const hl = sprite.highlight;
  hl.clear();
  // Outer glow ring
  hl.rect(
    -3 * S, -3 * S,
    CANVAS.gamePixelScale * 16 + 6 * S,
    CANVAS.gamePixelScale * 24 + 6 * S,
  ).stroke({ width: S, color, alpha: 0.7 });
  // Inner glow
  hl.rect(
    -2 * S, -2 * S,
    CANVAS.gamePixelScale * 16 + 4 * S,
    CANVAS.gamePixelScale * 24 + 4 * S,
  ).fill({ color, alpha: 0.08 });
  hl.visible = true;

  // Pulsing animation
  let frame = 0;
  const pulse = setInterval(() => {
    frame++;
    hl.alpha = 0.5 + Math.sin(frame * 0.15) * 0.3;
  }, 50);

  setTimeout(() => {
    clearInterval(pulse);
    hl.visible = false;
    hl.alpha = 1;
  }, durationMs);
}

/**
 * Warning flash — red pulse on character.
 */
export function warningFlash(sprite: CharacterSprite): void {
  highlightSprite(sprite, 5000, COLORS.warningRed);
}

/**
 * Detain effect — aggressive red border + character fades.
 */
export function detainEffect(sprite: CharacterSprite): void {
  highlightSprite(sprite, 6000, COLORS.warningRed);

  // Fade the character out (being taken away)
  let frame = 0;
  const fadeInterval = setInterval(() => {
    frame++;
    if (frame > 60) {
      sprite.container.alpha = Math.max(0.2, 1 - (frame - 60) / 60);
    }
    if (frame > 120) {
      clearInterval(fadeInterval);
      sprite.container.alpha = 0.2;
    }
  }, 50);
}

/**
 * Flinch animation — human reacts to Coordinator approach.
 */
export function flinchAnimation(sprite: CharacterSprite): void {
  const originalX = sprite.container.x;
  const offsetX = (Math.random() > 0.5 ? 1 : -1) * 3 * S;

  sprite.container.x = originalX + offsetX;
  setTimeout(() => {
    sprite.container.x = originalX;
  }, 200);
}

/**
 * Screen flash effect for dramatic moments.
 * Returns cleanup function.
 */
export function screenFlash(
  stage: Container,
  color: number = COLORS.warningRed,
  durationMs: number = 300,
): () => void {
  const flash = new Graphics();
  flash.rect(0, 0, CANVAS.width, CANVAS.height).fill({ color, alpha: 0.3 });
  stage.addChild(flash);

  let frame = 0;
  const fadeOut = setInterval(() => {
    frame++;
    flash.alpha = Math.max(0, 0.3 - frame * 0.03);
    if (flash.alpha <= 0) {
      clearInterval(fadeOut);
      stage.removeChild(flash);
      flash.destroy();
    }
  }, durationMs / 10);

  return () => {
    clearInterval(fadeOut);
    if (flash.parent) {
      stage.removeChild(flash);
      flash.destroy();
    }
  };
}

/**
 * Screen shake for tense moments.
 */
export function screenShake(stage: Container, intensity: number = 3, durationMs: number = 400): void {
  const originalX = stage.x;
  const originalY = stage.y;
  let frame = 0;
  const totalFrames = durationMs / 30;

  const shakeInterval = setInterval(() => {
    frame++;
    const decay = 1 - frame / totalFrames;
    stage.x = originalX + (Math.random() - 0.5) * intensity * S * decay;
    stage.y = originalY + (Math.random() - 0.5) * intensity * S * decay;
    if (frame >= totalFrames) {
      clearInterval(shakeInterval);
      stage.x = originalX;
      stage.y = originalY;
    }
  }, 30);
}

/**
 * Vignette darkening effect for confrontation moments.
 */
export function vignetteEffect(
  stage: Container,
  durationMs: number = 3000,
): () => void {
  const vignette = new Graphics();
  // Dark borders
  const w = CANVAS.width;
  const h = CANVAS.height;
  vignette.rect(0, 0, w, h).fill({ color: 0x000000, alpha: 0.4 });
  // Clear center (fake radial fade — approximated with layered rects)
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 5; i >= 0; i--) {
    const ratio = i / 5;
    const rw = w * 0.3 * (1 + ratio);
    const rh = h * 0.3 * (1 + ratio);
    vignette.rect(cx - rw / 2, cy - rh / 2, rw, rh).fill({ color: 0x000000, alpha: -0.07 * (5 - i) });
  }
  stage.addChild(vignette);

  setTimeout(() => {
    if (vignette.parent) {
      stage.removeChild(vignette);
      vignette.destroy();
    }
  }, durationMs);

  return () => {
    if (vignette.parent) {
      stage.removeChild(vignette);
      vignette.destroy();
    }
  };
}

/**
 * Animate the vertical scan beam across the scene.
 */
export function animateScanBeam(beam: Graphics): () => void {
  let x = 0;
  const speed = 1.5 * S;
  const interval = setInterval(() => {
    x += speed;
    if (x > CANVAS.width + 20 * S) {
      x = -20 * S;
    }
    beam.x = x;
  }, 50);
  return () => clearInterval(interval);
}
