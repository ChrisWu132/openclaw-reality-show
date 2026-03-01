# OpenClaw Reality Show — Technical Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                          Browser (Client)                           │
│                                                                     │
│   React 18 + Zustand 5          PixiJS 8                           │
│   ┌─────────────────┐           ┌──────────────────────┐           │
│   │  Game Store      │           │  960x540 Canvas       │           │
│   │  - phase         │           │  - Workstation grid   │           │
│   │  - eventQueue    │           │  - Character sprites  │           │
│   │  - sceneEvents   │◄──────── │  - Scan lines/beam    │           │
│   │  - reasoning     │           │  - Animations         │           │
│   └────────┬────────┘           └──────────────────────┘           │
│            │                                                        │
│   ┌────────▼────────┐                                              │
│   │  WebSocket Hook  │◄──────── HTML Overlays (dialogue, UI)       │
│   └────────┬────────┘                                              │
└────────────┼────────────────────────────────────────────────────────┘
             │ ws://localhost:3001/session/:id
             │
┌────────────▼────────────────────────────────────────────────────────┐
│                        Node.js Server                               │
│                                                                     │
│   Express 4 + ws 8                                                  │
│   ┌─────────────────┐    ┌──────────────────┐                      │
│   │  REST API        │    │  WebSocket Server  │                      │
│   │  POST /session   │    │  - session events  │                      │
│   │  GET /monologue  │    │  - scene_event     │                      │
│   └─────────────────┘    │  - situation_transition                   │
│                           │  - session_end     │                      │
│   ┌─────────────────┐    └────────┬─────────┘                      │
│   │  Scene Engine     │◄───────────┘                                 │
│   │  - Situation FSM  │                                              │
│   │  - NPC scripts    │    ┌──────────────────┐                      │
│   │  - World state    │───►│  LLM Client       │                      │
│   │  - Incident log   │    │  Google Gemini     │                      │
│   │  - Validator      │    │  (gemini-2.5-flash)│                      │
│   └─────────────────┘    └──────────────────┘                      │
└─────────────────────────────────────────────────────────────────────┘
```

## Package Structure

```
openclaw-reality-show/
├── packages/
│   └── shared/              # Shared types + constants
│       └── src/
│           ├── types.ts     # SceneEventMessage, ConsequenceScene, etc.
│           └── constants.ts # Action types, speaker IDs
├── apps/
│   ├── server/              # Backend
│   │   └── src/
│   │       ├── index.ts          # Express + WebSocket server setup
│   │       ├── engine/
│   │       │   ├── scene-engine.ts    # Situation FSM, orchestrates play
│   │       │   ├── world-state.ts     # In-memory session state
│   │       │   ├── incident-log.ts    # Append-only log
│   │       │   └── validator.ts       # Format + semantic validation
│   │       ├── ai/
│   │       │   ├── llm-client.ts      # LLM abstraction
│   │       │   ├── llm-provider.ts    # Provider factory
│   │       │   └── google-provider.ts # Google Gemini implementation
│   │       ├── scenarios/
│   │       │   └── work-halls/        # MVP scenario
│   │       │       ├── situation-1.ts ... situation-6.ts
│   │       │       └── outcomes.ts
│   │       ├── personality/
│   │       │   └── personality-loader.ts
│   │       └── ws/
│   │           └── ws-events.ts       # WebSocket event types
│   └── web/                 # Frontend
│       └── src/
│           ├── components/
│           │   ├── layout/
│           │   │   ├── App.tsx           # Phase router
│           │   │   └── GameContainer.tsx # Scene + overlays + click handler
│           │   ├── scene/
│           │   │   ├── SceneCanvas.tsx   # PixiJS canvas setup
│           │   │   ├── DialogueOverlay.tsx # Typewriter dialogue
│           │   │   └── ZoneLabel.tsx
│           │   └── ui/
│           │       ├── IntroScreen.tsx
│           │       ├── ScenarioPicker.tsx
│           │       ├── ConsequenceScene.tsx
│           │       ├── MonologueViewer.tsx  # Thought bubble
│           │       ├── AIDecidingOverlay.tsx
│           │       ├── SituationCard.tsx
│           │       ├── SessionStatus.tsx
│           │       └── IncidentPanel.tsx
│           ├── hooks/
│           │   ├── useWebSocket.ts       # WS connection management
│           │   ├── useDialogueStream.ts  # Typewriter + click-to-advance
│           │   └── useSceneProcessor.ts  # Scene event → PixiJS animations
│           ├── stores/
│           │   └── gameStore.ts          # Zustand store (single source of truth)
│           ├── pixi/
│           │   ├── setup.ts             # PixiJS Application init
│           │   ├── constants.ts         # Canvas size, positions, colors
│           │   ├── sprites.ts           # Character + environment drawing
│           │   └── animations.ts        # Movement, highlights, effects
│           └── styles/
│               └── theme.ts             # CSS color constants
├── personalities/           # Markdown personality files (injected into LLM prompt)
├── scenarios/               # Scenario definitions (mechanics, scripts, outcomes)
└── docs/                    # Documentation
```

## Data Flow

### Session Lifecycle

```
1. User clicks "SEND YOUR AGENT IN" → phase: intro → picker
2. User selects scenario → POST /api/session/create
3. Server creates session, returns sessionId → phase: connecting
4. Client opens WebSocket to /session/:id
5. Server sends session_start → phase: playing
6. For each situation (1-6):
   a. Server sends situation_transition
   b. Server sends NPC scene_events (pre-scripted)
   c. Server sends context to LLM, waits for response
   d. Server validates response (format + semantics)
   e. Server sends Coordinator scene_event (with reasoning)
   f. Repeat for situation sub-events
7. Server sends session_end with consequence scene → phase: consequence
8. User clicks "WATCH ANOTHER" → reset → phase: intro
```

### Client Event Processing

```
Server scene_event
    │
    ▼
handleSceneEvent (gameStore)
    │
    ├─ If nothing displaying → push to sceneEvents (immediate)
    └─ If busy → push to eventQueue (buffered)
                      │
                      ▼
              DialogueOverlay watches sceneEvents
                      │
                      ▼
              useDialogueStream typewriter (20ms/char)
                      │
                      ▼
              Typewriter done → waitingForClick = true → show ▸
                      │
                      ▼
              User clicks → advanceDialogue()
                      │
                      ├─ Queue has items → pop to sceneEvents
                      └─ Queue empty → clear, await next server event
```

### Animation Processing (parallel to dialogue)

```
sceneEvents change
    │
    ▼
useSceneProcessor
    │
    ├─ patrol_move → moveSpriteTo()
    ├─ observe → highlightSprite()
    ├─ issue_warning → warningFlash() + screenFlash()
    ├─ detain → detainEffect() + screenShake()
    ├─ query → highlight both sprites
    └─ (other) → generic highlight on speaker
```

## Key Technical Decisions

### Why No Database

Sessions are ephemeral — each run is a unique AI-generated story. There's no user accounts, no save/load, no persistence needed. In-memory state per session keeps the architecture simple.

### Why Google Gemini

- `gemini-2.5-flash` provides fast structured JSON responses
- Good at following system prompts with complex rule sets (World Bible)
- Cost-effective for the volume of calls per session (~6-12 LLM calls per run)
- Single provider simplifies the stack (removed Ollama + Anthropic)

### Why Click-to-Advance

Auto-timed dialogue was the #1 UX problem — users missed text because hold durations couldn't account for reading speed variation. Click-to-advance:
- Zero missed dialogue
- Users feel present (even though powerless)
- Simple implementation (transparent overlay + queue)
- Server doesn't need to know about client pacing

### Why PixiJS + HTML Overlays

PixiJS handles the game canvas (sprites, animations, effects) while HTML/CSS handles text overlays (dialogue, UI panels). This hybrid approach means:
- Text rendering uses browser fonts (Press Start 2P) with proper anti-aliasing
- PixiJS focuses on what it's good at (2D rendering, animation)
- Overlays can use standard CSS positioning and responsive layout

### Two-Layer Validation

The AI's responses go through two validation layers:

1. **Format validation**: Is the JSON well-formed? Does it have required fields? → Retry with error feedback
2. **Semantic validation**: Does the action violate hard limits (Section 11 of World Bible)? → Reject and substitute

This ensures the AI can never break the simulation, even if it tries to.

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_API_KEY` | Yes | — | Google AI Studio API key |
| `GOOGLE_MODEL` | No | `gemini-2.5-flash` | Gemini model ID |
| `PORT` | No | `3001` | Server port |

## Development

```bash
# Install dependencies
npm install

# Run both server and frontend
npm run dev

# Server only (port 3001)
npm run dev:server

# Frontend only (port 5173, proxies API to 3001)
npm run dev:web

# Type check all packages
npx tsc --noEmit -p packages/shared/tsconfig.json
npx tsc --noEmit -p apps/server/tsconfig.json
npx tsc --noEmit -p apps/web/tsconfig.json
```
