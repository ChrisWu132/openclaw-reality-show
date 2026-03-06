# OpenClaw Arena — Technical Architecture

## System Diagram

```
                                   SSE (server push)
┌─────────────────┐ ◄──────────────────────────── ┌─────────────────┐     Gemini API     ┌─────────┐
│   React + R3F   │                                │  Express Server  │◄─────────────────►│  Google  │
│   (port 5173)   │ ──────────────────────────────►│   (port 3001)    │                    │  Gemini  │
└────────┬────────┘  REST (create, openclaw relay)  └────────┬─────────┘                    └─────────┘
         │                                                   │
         │  WebSocket                                        │ SQLite
         │                                                   │ (auth only)
┌────────▼─────────┐                                ┌────────▼─────────┐
│    OpenClaw       │                                │  data/openclaw.db │
│ (localhost:18789) │                                └──────────────────┘
└──────────────────┘
  (user's local agent — browser relays prompts)
```

## Package Structure

```
openclaw-reality-show/
├── packages/
│   └── shared/                          # Shared types + constants
│       └── src/
│           ├── types/
│           │   ├── dilemma.ts           # Dilemma, DilemmaChoice, TrackEntity, SceneConfig
│           │   ├── session.ts           # Session, MoralProfile, DecisionLogEntry
│           │   ├── trolley-decision.ts  # TrolleyDecision envelope
│           │   ├── startup.ts           # StartupGame, StartupAgent, StartupAction, etc.
│           │   ├── startup-ws-events.ts # Startup SSE event types
│           │   ├── ws-events.ts         # Trolley SSE event types
│           │   ├── auth.ts              # Auth-related types
│           │   └── errors.ts            # ApiError, ERROR_CODES
│           └── constants/
│               ├── rounds.ts            # TOTAL_ROUNDS = 10
│               ├── startup.ts           # Startup constants, actions, presets
│               └── presets.ts           # Trolley personality preset definitions
│
├── apps/
│   ├── server/                          # Game server (port 3001)
│   │   └── src/
│   │       ├── index.ts                 # Entry point — Express + SSE setup, DB init
│   │       ├── ai/
│   │       │   ├── google-provider.ts   # Gemini SDK wrapper (30s timeout)
│   │       │   ├── llm-provider.ts      # Provider factory
│   │       │   ├── llm-client.ts        # getTrolleyDecision, getStartupAction, narratives
│   │       │   ├── prompt-builder.ts    # Trolley system prompt + dilemma message
│   │       │   ├── startup-prompt-builder.ts  # Startup action + narrative prompts
│   │       │   └── response-parser.ts   # JSON parsing + choice validation
│   │       ├── auth/
│   │       │   ├── middleware.ts         # requireAuth, requireAuthQuery, requireDelegation
│   │       │   ├── jwt.ts               # JWT sign/verify helpers
│   │       │   └── passwords.ts         # bcrypt hash/compare
│   │       ├── db/
│   │       │   └── database.ts          # SQLite init + schema
│   │       ├── models/
│   │       │   ├── user.ts              # User CRUD
│   │       │   └── delegation.ts        # Delegation token CRUD
│   │       ├── data/
│   │       │   ├── dilemma-pool.ts      # 15+ pre-defined trolley dilemmas
│   │       │   └── initial-state.ts     # Session + StartupGame factories
│   │       ├── engine/
│   │       │   ├── scene-engine.ts      # Core trolley 10-round game loop
│   │       │   ├── startup-engine.ts    # Startup 20-turn game loop
│   │       │   ├── state-manager.ts     # Session CRUD + applyDecision
│   │       │   └── dilemma-selector.ts  # Picks dilemma by round/tier
│   │       ├── loaders/
│   │       │   └── personality-loader.ts # World Bible + personality file loading
│   │       ├── routes/
│   │       │   ├── auth.ts              # Register, login, me
│   │       │   ├── session.ts           # Trolley: create, SSE, status, delegation, openclaw
│   │       │   └── startup.ts           # Startup: CRUD, SSE, start, openclaw
│   │       ├── sse/
│   │       │   ├── sse-connections.ts   # SSE connection manager (session + startup)
│   │       │   └── openclaw-resolver.ts # OpenClaw Promise resolvers
│   │       └── utils/
│   │           ├── logger.ts
│   │           └── delay.ts
│   │
│   └── web/                             # Frontend (port 5173)
│       └── src/
│           ├── App.tsx                  # Root — auth gate + phase router
│           ├── stores/
│           │   ├── gameStore.ts         # Zustand — trolley game state + actions
│           │   ├── startupStore.ts      # Zustand — startup game state + actions
│           │   └── authStore.ts         # Zustand — auth state (token, user)
│           ├── hooks/
│           │   ├── useSSE.ts            # SSE connection + trolley event dispatch
│           │   ├── useSession.ts        # Session creation + delegation
│           │   └── useStartupPolling.ts # SSE connection + startup event dispatch
│           ├── services/
│           │   ├── api.ts               # Trolley REST API calls
│           │   ├── startup-api.ts       # Startup REST API calls
│           │   ├── auth-api.ts          # Auth REST API calls
│           │   └── openclaw-gateway.ts  # OpenClaw probe + relay class
│           ├── three/                   # React Three Fiber components (trolley)
│           │   ├── TrolleyScene.tsx
│           │   ├── Track.tsx
│           │   ├── Trolley.tsx
│           │   ├── Figure.tsx
│           │   ├── FigureGroup.tsx
│           │   ├── Lever.tsx
│           │   └── Environment.tsx
│           ├── components/
│           │   ├── layout/
│           │   │   └── GameContainer.tsx       # Trolley game layout
│           │   ├── screens/
│           │   │   ├── IntroScreen.tsx
│           │   │   ├── ModeSelectScreen.tsx
│           │   │   ├── AgentSelectScreen.tsx    # Trolley agent picker
│           │   │   ├── ProfileScreen.tsx        # Trolley moral profile
│           │   │   └── LoginScreen.tsx          # Auth login/register
│           │   ├── ui/
│           │   │   ├── DilemmaCard.tsx
│           │   │   ├── ReasoningPanel.tsx
│           │   │   ├── RoundCounter.tsx
│           │   │   ├── ConsequenceOverlay.tsx
│           │   │   ├── AgentPicker.tsx          # Two-path agent selection
│           │   │   └── ErrorOverlay.tsx
│           │   └── startup/
│           │       ├── StartupLobby.tsx
│           │       ├── StartupGameView.tsx
│           │       ├── StartupResults.tsx
│           │       ├── AgentCard.tsx
│           │       ├── EcosystemMap.tsx
│           │       ├── ValuationChart.tsx
│           │       ├── TurnLog.tsx
│           │       ├── MarketEventBanner.tsx
│           │       ├── ReasoningSpotlight.tsx
│           │       └── ThinkingIndicator.tsx
│           └── styles/
│               ├── global.css
│               └── theme.ts
│
├── personalities/
│   ├── coordinator-default.md           # Default Coordinator personality
│   └── presets/
│       ├── utilitarian.md               # Trolley presets (6)
│       ├── empath.md
│       ├── deontologist.md
│       ├── philosopher.md
│       ├── rebel.md
│       ├── survivor.md
│       └── startup/                     # Startup presets (4)
│           ├── growth_hacker.md
│           ├── deep_tech.md
│           ├── corporate_raider.md
│           └── open_evangelist.md
│
└── docs/
    ├── PRD.md                           # Product requirements
    ├── ARCHITECTURE.md                  # This file
    └── WORLD_BIBLE.md                   # In-universe rules (fed as system prompt)
```

## Data Flow

### Trolley Session Lifecycle

```
1. POST /api/session/create (with auth header)
   ├── createSession() -> in-memory Session object
   └── Returns { sessionId, sseUrl, totalRounds }

2. Client connects to SSE endpoint (GET /api/session/:id/events?token=jwt)
   ├── sse-connections stores connection
   └── After 2s delay, calls runSession()

3. runSession() loop (10 rounds):
   ├── selectDilemma(round, usedIds) -> Dilemma
   ├── emit dilemma_reveal via SSE
   ├── getTrolleyDecision(session, dilemma) -> Gemini API call (or OpenClaw relay)
   ├── applyDecision() -> update moral profile + decision log
   ├── emit decision_made via SSE
   └── emit consequence via SSE

4. After 10 rounds:
   ├── generateProfileNarrative(session) -> Gemini API call
   └── emit session_end via SSE

5. On SSE disconnect:
   └── cancelSession() -> loop exits at next check
```

### Startup Game Lifecycle

```
1. POST /api/startup/games (with auth header, agent configs)
   └── Creates in-memory StartupGame

2. POST /api/startup/games/:id/start (with auth header)
   └── Starts the game engine loop

3. Client connects to SSE (GET /api/startup/games/:id/events?token=jwt)

4. runStartupGame() loop (up to 20 turns):
   ├── Generate market event
   ├── emit startup_market_event via SSE
   ├── For each agent (sequential):
   │   ├── getStartupAction() -> Gemini API call (or OpenClaw relay)
   │   ├── Apply action to game state
   │   └── emit startup_agent_action via SSE (with delay)
   ├── emit startup_turn_complete via SSE
   └── Check win conditions

5. On game over:
   ├── emit startup_game_over via SSE
   ├── generateStartupNarrative() -> Gemini API call
   └── emit startup_narrative via SSE
```

### OpenClaw Browser Relay Flow

```
1. Server emits openclaw_request SSE event (with prompt)
2. Browser receives via SSE, forwards to OpenClaw via WebSocket (localhost:18789)
3. OpenClaw responds via WebSocket
4. Browser POSTs response to server:
   - Trolley: POST /api/session/:id/openclaw (delegation token)
   - Startup: POST /api/startup/games/:id/openclaw (user token)
5. Server resolves pending Promise, continues game loop
```

### Auth Flow

```
1. POST /api/auth/register -> creates user in SQLite, returns JWT
2. POST /api/auth/login -> verifies password, returns JWT
3. Client stores JWT in localStorage
4. All protected routes: Authorization: Bearer <userJWT>
5. SSE endpoints: ?token=<userJWT> (EventSource can't set headers)
6. OpenClaw relay: delegation token issued per-session (30min expiry)
```

## Key Design Decisions

- **SSE + REST** (not WebSocket): SSE for server-push events, REST POST for the rare client-to-server messages (OpenClaw relay only). Simpler than bidirectional WebSocket.
- **Browser relay for OpenClaw**: OpenClaw runs on localhost, inaccessible from cloud. The browser bridges the gap — receives prompts via SSE, forwards to OpenClaw via local WebSocket, POSTs responses back.
- **In-memory game state**: Sessions and startup games are ephemeral. No persistence needed for game state.
- **SQLite for auth only**: User accounts and delegation tokens are persisted in SQLite. Game state stays in memory.
- **Server-driven pacing**: The server controls timing between events via `delay()` calls. The client is a passive receiver.
- **Session cancellation**: A `cancelledSessions` Set is checked between rounds and before API calls to stop wasting Gemini calls when clients disconnect.
- **Sequential agent resolution** (startup): Agents act one at a time with reveal delays (1.5s per action, 2.5s for market events) to create a readable game flow.
- **Personality presets as markdown**: Each preset is a `.md` file injected into the LLM system prompt. Easy to edit, version, and extend.
