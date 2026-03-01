# OpenClaw Reality Show — Design Document

## Visual Design

### Art Direction

The visual style is **dark pixel art** rendered in a 960x540 canvas at 3x game-pixel scale (effective resolution 320x180). The aesthetic is oppressive, institutional, and cold — a surveillance compound viewed through a fixed overhead camera.

### Color Palette

| Element | Hex | Purpose |
|---------|-----|---------|
| Floor | `#141425` | Near-black base, institutional |
| Grid lines | `#1A1A30` | Subtle spatial structure |
| Wall top | `#252540` | Slightly lighter horizon |
| Coordinator blue | `#4A90D9` | Authority, cold precision |
| Warning red | `#D94A4A` | Danger, enforcement |
| Terminal green | `#00FF88` | System, data |

Characters use their signature color as a jumpsuit tint (darkened ~55%) so each character is visually distinct against the dark floor. The Coordinator has a bright visor and glowing shoulder pads. Humans have white eyes on dark faces for a haunted, oppressed look.

### Character Visual Hierarchy

1. **Coordinator** — Largest sprite, bright blue visor, shoulder pads, ambient glow. Always visible.
2. **Monitor** — Floating drone silhouette with green lens. Mechanical, detached.
3. **Humans** — Smaller, hunched. Color-coded jumpsuits (Nyx=olive, Sable=warm brown, Calla=silver, Eli=light blue). White eyes convey tiredness/fear.

### Environment Elements

- **Workstations**: 3x6 grid of desks with colored screen glows (blue, green, amber)
- **Ceiling lights**: Alternating blue and red indicator dots along top wall
- **Supervisor Terminal**: Bottom-left, green glow
- **Compliance Alcove**: Bottom-right, dark with faint red border
- **Surveillance cameras**: Red dots in all four corners
- **Scan lines**: Horizontal CRT-style lines (8% opacity)
- **Scan beam**: Vertical moving sweep (6% opacity blue)

### UI Overlays (HTML on top of PixiJS canvas)

| Overlay | Position | Purpose |
|---------|----------|---------|
| Zone Label | Top-left | Location + recording indicator |
| Session Status | Bottom-right | Cycle counter + situation dots |
| Dialogue boxes | Top-center | Speaker dialogue with typewriter effect |
| Narrator bar | Bottom, full-width | Cinematic gradient narration |
| Situation Card | Center | Situation title on transitions |
| AI Deciding | Bottom-center | "COORDINATOR IS DECIDING..." indicator |
| Thought Bubble | Bottom-right, inside scene | Coordinator inner monologue |
| Incident Panel | Bottom-left | Running incident log |

### Inner Monologue (Thought Bubble)

The Coordinator's inner reasoning is displayed as a **comic-style thought bubble** inside the scene, positioned in the bottom-right corner. It has:
- Dark translucent background with blue border glow
- "INNER MONOLOGUE" label in red pixel font
- Italic courier text for the reasoning content
- Two small trailing circles below (thought bubble tail)
- Max ~220 characters visible, truncated with "..." for longer text

This replaced the previous below-scene panel design because it:
1. Keeps the viewer's eyes inside the scene
2. Creates a more intimate connection to the Coordinator's thoughts
3. Doesn't require extra vertical space below the canvas

---

## Interaction Design

### Spectator Flow

```
Intro Screen → Scenario Picker → Connecting → Playing → Consequence → (loop)
```

### Intro Screen

Title: "THE ORDER" — establishes the world name immediately.

Copy positions the user as an OpenClaw owner sending their AI into the simulation. Five-stage fade-in over 7 seconds builds atmosphere before the "SEND YOUR AGENT IN" button appears.

### Click-to-Advance Dialogue

All dialogue (NPC, Coordinator, Narrator) requires a click to advance:

1. Server sends `scene_event` messages via WebSocket
2. Events enter an `eventQueue` in the client store
3. First event is displayed with typewriter effect (20ms/char)
4. When typewriter finishes, a blinking ▸ indicator appears
5. User clicks anywhere on the 960x540 scene to advance
6. Next event from queue is displayed
7. When queue is empty and AI is deciding, the "DECIDING" overlay appears

This was chosen over auto-advance because:
- Users were missing dialogue that auto-cleared too fast
- Click pacing lets users read at their own speed
- Increases engagement — spectators are "powerless but present"

### Consequence Scene

After all 6 situations play out, a full-screen consequence scene reveals the outcome. Lines fade in with 3.5-second delays. A "WATCH ANOTHER" button appears after all lines are shown.

---

## Typography

- **Primary**: 'Press Start 2P' (pixel font) — all UI text
- **Monologue text**: 'Courier New' — inner reasoning, italic
- **Font sizes**: 6-10px for in-scene labels, 9px for dialogue, 28px for titles

---

## Animation

| Animation | Description | Duration |
|-----------|-------------|----------|
| Idle bob | Characters oscillate vertically (humans 0.8px, AI 0.5px, Monitor 1.5px) | Continuous |
| Sprite move | Ease-in-out cubic interpolation to target position | 600-2000ms |
| Highlight | Pulsing colored border on active character | 2-6s |
| Flinch | Horizontal jerk when Coordinator approaches | 200ms |
| Warning flash | Yellow pulse + screen flash | 400ms |
| Detain | Red highlight + character fade to 20% opacity | 6s |
| Screen shake | Random offset with decay | 400-500ms |
| Scan beam | Vertical bar sweeps left to right | Continuous |
