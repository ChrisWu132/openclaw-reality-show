# OpenClaw Trolley Problem — Technical Architecture

## System Diagram

```
┌─────────────────┐     WebSocket      ┌─────────────────┐     Gemini API     ┌─────────┐
│   React + R3F   │◄──────────────────►│  Express Server  │◄─────────────────►│  Google  │
│   (port 5173)   │                    │   (port 3001)    │                    │  Gemini  │
└─────────────────┘                    └────────┬─────────┘                    └─────────┘
                                                │
                                           REST │ POST /agents/:id/sessions
                                                │
                                       ┌────────▼─────────┐
                                       │    OpenClaw       │
                                       │   (port 3002)    │
                                       └──────────────────┘
```

## Package Structure

```
openclaw-reality-show/
├── packages/
│   └── shared/                    # Shared types + constants
│       └── src/
│           ├── types/
│           │   ├── dilemma.ts     # Dilemma, DilemmaChoice, TrackEntity, SceneConfig
│           │   ├── session.ts     # Session, MoralProfile, DecisionLogEntry
│           │   ├── trolley-decision.ts  # TrolleyDecision envelope
│           │   ├── ws-events.ts   # All WebSocket event types
│           │   └── errors.ts      # ApiError, ERROR_CODES
│           └── constants/
│               └── rounds.ts      # TOTAL_ROUNDS = 10
│
├── apps/
│   ├── server/                    # Game server
│   │   └── src/
│   │       ├── index.ts           # Entry point — Express + WS setup
│   │       ├── ai/
│   │       │   ├── google-provider.ts   # Gemini SDK wrapper
│   │       │   ├── llm-provider.ts      # Provider factory
│   │       │   ├── llm-client.ts        # getTrolleyDecision, generateProfileNarrative
│   │       │   ├── prompt-builder.ts    # System prompt + dilemma message construction
│   │       │   └── response-parser.ts   # JSON parsing + choice validation
│   │       ├── data/
│   │       │   ├── dilemma-pool.ts      # 15+ pre-defined dilemmas
│   │       │   └── initial-state.ts     # Session factory
│   │       ├── engine/
│   │       │   ├── scene-engine.ts      # Core 10-round game loop
│   │       │   ├── state-manager.ts     # Session CRUD + applyDecision
│   │       │   └── dilemma-selector.ts  # Picks dilemma by round/tier
│   │       ├── loaders/
│   │       │   └── personality-loader.ts # World Bible + personality file loading
│   │       ├── routes/
│   │       │   └── session.ts           # REST: create session, get status
│   │       ├── ws/
│   │       │   ├── ws-server.ts         # WebSocket upgrade + connection handling
│   │       │   └── ws-emitter.ts        # Event emission helper
│   │       └── utils/
│   │           ├── logger.ts
│   │           └── delay.ts
│   │
│   ├── web/                       # Frontend
│   │   └── src/
│   │       ├── App.tsx            # Root — phase router
│   │       ├── stores/
│   │       │   └── gameStore.ts   # Zustand — all game state + actions
│   │       ├── hooks/
│   │       │   └── useWebSocket.ts # WS connection + event dispatch
│   │       ├── three/             # React Three Fiber components
│   │       │   ├── TrolleyScene.tsx    # Canvas + camera + scene composition
│   │       │   ├── Track.tsx          # Y-fork railroad (TubeGeometry)
│   │       │   ├── Trolley.tsx        # Animated red cart
│   │       │   ├── Figure.tsx         # Single capsule+sphere figure
│   │       │   ├── FigureGroup.tsx    # Group of figures with labels
│   │       │   ├── Lever.tsx          # Rotating switch lever
│   │       │   └── Environment.tsx    # Fog, lights, ground
│   │       ├── components/
│   │       │   ├── layout/
│   │       │   │   └── GameContainer.tsx
│   │       │   ├── screens/
│   │       │   │   ├── IntroScreen.tsx
│   │       │   │   ├── AgentSelectScreen.tsx
│   │       │   │   └── ProfileScreen.tsx
│   │       │   └── ui/
│   │       │       ├── DilemmaCard.tsx
│   │       │       ├── ReasoningPanel.tsx
│   │       │       ├── RoundCounter.tsx
│   │       │       ├── ConsequenceOverlay.tsx
│   │       │       └── ErrorOverlay.tsx
│   │       └── styles/
│   │           ├── global.css
│   │           └── theme.ts
│   │
│   └── openclaw/                  # Agent evolution service
│       └── src/
│           ├── index.ts           # Express server (port 3002)
│           ├── store.ts           # Agent CRUD, JSON file persistence
│           ├── evolve.ts          # Gemini-powered personality evolution
│           ├── synthesize.ts      # Create personality from Claude memory
│           └── routes/
│               └── agents.ts      # All agent REST endpoints
│
├── personalities/
│   ├── coordinator-default.md     # Default Coordinator personality
│   └── openclaw.md                # OpenClaw platform personality
│
└── docs/
    ├── PRD.md                     # Product requirements
    └── WORLD_BIBLE.md             # In-universe rules (fed as system prompt)
```

## Data Flow

### Session Lifecycle

```
1. POST /api/session/create
   └─► createSession() → in-memory Session object
   └─► Returns { sessionId, wsUrl }

2. Client connects to wsUrl
   └─► ws-server stores connection
   └─► After 2s delay, calls runSession()

3. runSession() loop (10 rounds):
   ├─► selectDilemma(round, usedIds) → Dilemma
   ├─► emit dilemma_reveal
   ├─► getTrolleyDecision(session, dilemma) → Gemini API call
   ├─► applyDecision() → update moral profile + decision log
   ├─► emit decision_made
   └─► emit consequence

4. After 10 rounds:
   ├─► generateProfileNarrative(session) → Gemini API call
   ├─► emit session_end
   └─► postToOpenClaw(session) → fire-and-forget POST

5. On client disconnect:
   └─► cancelSession() → loop exits at next check
```

### AI Decision Flow

```
prompt-builder.ts
  ├─► buildSystemPrompt()
  │     = World Bible + Coordinator personality + agent memory
  └─► buildDilemmaMessage()
        = Dilemma details + round context + prior decisions + scores

llm-client.ts
  ├─► getTrolleyDecision()
  │     ├─► llm.getCompletion(system, user)
  │     ├─► parseTrolleyDecision() — extract JSON, validate choiceId
  │     ├─► On parse failure: append correction, retry (up to 3x)
  │     └─► On total failure: fallback to first choice
  └─► generateProfileNarrative()
        └─► Free-form literary analysis of all 10 decisions

response-parser.ts
  ├─► stripMarkdownFences()
  ├─► JSON.parse()
  └─► Validate choiceId exists in dilemma.choices
```

## Key Design Decisions

- **In-memory state**: No database. Sessions are ephemeral. Simplicity over durability.
- **Server-driven pacing**: The server controls timing between events via `delay()` calls. The client is a passive receiver.
- **Session cancellation**: A `cancelledSessions` Set is checked between rounds and before API calls to stop wasting Gemini calls when clients disconnect.
- **Single WebSocket per session**: One client, one connection, one session. No multiplexing.
- **Fire-and-forget OpenClaw**: Session results are posted to OpenClaw after completion. Failures are logged but don't affect the session.
