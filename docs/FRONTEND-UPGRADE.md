# Frontend Visual Upgrade Path

## Current State

Characters are drawn with PixiJS 8 `Graphics` primitives (rectangles, circles) at 16x24 game pixels, scaled 3x to 48x72 screen pixels. This produces recognizable but crude blocky figures. The Coordinator is 1.4x scaled with a distinct angular silhouette, but at distance it's still limited by the primitive-based approach.

## Recommended Path: Sprite Sheets (Aseprite + PixiJS AnimatedSprite)

The single highest-impact change is replacing `Graphics`-drawn characters with authored pixel art sprite sheets.

### What Changes

| Component | Before | After |
|-----------|--------|-------|
| Character body | `new Graphics()` + rect/circle calls | `AnimatedSprite.fromFrames(frames)` |
| Idle animation | `setInterval` + `body.y = Math.sin(...)` | `body.animationSpeed = 0.08; body.play()` |
| CharacterSprite.body type | `Graphics` | `AnimatedSprite` |
| Asset files | None | 6 sprite sheets (PNG + JSON atlas) |

### What Stays the Same

- `Container` hierarchy, `nameLabel`, `highlight`
- `moveSpriteTo()`, `highlightSprite()`, all effect animations
- `useSceneProcessor` hook (operates on containers, not body internals)
- Environment (`createWorkstationGrid`) — stays as Graphics, looks fine
- All React/Zustand/HTML overlay code

### Asset Requirements

Per character: 16x24px frames, 2-4 frames per animation state.

| Character | States Needed | Frames |
|-----------|--------------|--------|
| Coordinator | idle, walk, observe, enforce | 4 states x 4 frames = 16 |
| Nyx, Sable, Calla, Eli | idle, walk, flinch | 3 states x 4 frames = 12 each |
| Monitor | idle (hover), scan | 2 states x 4 frames = 8 |

Total: ~68 frames across 6 sprite sheets. Roughly 3-6 hours of Aseprite work.

### Code Migration (estimated 2-3 hours)

1. Install no new dependencies — PixiJS 8 has built-in spritesheet support
2. Add sprite sheet assets to `apps/web/public/sprites/`
3. Modify `createCharacterSprite()` in `sprites.ts`:

```typescript
// Before
const body = new Graphics();
drawHumanBody(body, color);

// After
const sheet = Assets.get('sprites/nyx.json');
const body = new AnimatedSprite(sheet.animations['idle']);
body.animationSpeed = 0.08;
body.play();
```

4. Update `CharacterSprite` interface: `body: Graphics | AnimatedSprite`
5. Update `startIdleAnimation()` to be a no-op (animation is built into the sprite)

## Alternatives Evaluated

| Option | Verdict | Why |
|--------|---------|-----|
| **Phaser 4** | Skip | Full rewrite, same renderer, adds physics/tilemaps we don't need |
| **Raw Canvas 2D** | Skip | PixiJS already works, Canvas 2D loses container hierarchy |
| **Spine/DragonBones** | Skip | Skeleton animation is wrong for pixel art aesthetic |
| **CSS-only sprites** | Interesting but skip | Would remove PixiJS entirely but effects (shake, flash, scanlines) are harder in CSS |

## Other Quick Wins (no asset work needed)

1. **PixiJS Ticker** — Replace `setInterval(fn, 50)` idle animations with `app.ticker.add()` for proper frame-rate sync
2. **Pre-baked environment** — Export `createWorkstationGrid` output as a single PNG background image (one draw call instead of ~200)
3. **PixiJS Filters** — Add `GlowFilter` from `@pixi/filter-glow` to Coordinator for real-time glow instead of translucent circles
