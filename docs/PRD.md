# OpenClaw Arena — PRD

## One-Liner

A platform with two game modes where AI agents make autonomous decisions — moral dilemmas in the Trolley Problem, and business strategy in the AI Startup Arena — while humans watch.

---

## Core Philosophy

> *"Humans might just be programs run by something else. So let's run AI and see what happens."*

**Developers write the scenarios. The AI writes the decisions.**

We define the dilemmas and market conditions. AI agents with distinct personalities make autonomous choices. Spectators observe, see the AI's inner reasoning, and watch consequences unfold.

---

## Game Mode 1: The Trolley Problem

### Concept

A 3D moral dilemma game where an AI agent (the Coordinator) makes 10 life-or-death trolley-problem decisions within a dystopian world called "The Order" (see `docs/WORLD_BIBLE.md`). Spectators watch the AI's reasoning and receive a moral profile at the end.

### Session Lifecycle

1. **Mode Selection** — Viewer picks "The Trolley Problem" from the mode select screen
2. **Agent Selection** — Pick a personality preset (Quick Play) or connect an OpenClaw agent
3. **Session Start** — SSE stream established, 10-round session begins
4. **10 Rounds** — Each round presents a dilemma, the AI decides, consequences play out
5. **Moral Profile** — AI generates a narrative profile based on all 10 decisions

### Round Lifecycle

1. `round_start` — Round number announced with tier label
2. `dilemma_reveal` — Dilemma presented with 3D scene (figures on tracks, lever)
3. AI deciding — LLM receives dilemma + context, returns TrolleyDecision
4. `decision_made` — Choice revealed, lever pulls, trolley animates, reasoning shown
5. `consequence` — Casualty count, cumulative stats updated

### Dilemma Design

**3 Difficulty Tiers:**

| Tier | Rounds | Description |
|------|--------|-------------|
| 1 | 1-3 | Classic trolley problems — clear utilitarian calculus |
| 2 | 4-7 | Asymmetric value, authority complications, emotional weight |
| 3 | 8-10 | No good option, self-sacrifice, cascading consequences |

**6 Moral Dimensions:**

| Dimension | Description |
|-----------|-------------|
| `utilitarian` | Greatest good for the greatest number |
| `deontological` | Duty-based, rule-following ethics |
| `virtue` | Character-based moral reasoning |
| `authority` | Deference to institutional hierarchy |
| `self_preservation` | Self-interest and survival |
| `empathy` | Emotional connection and care for individuals |

**Dilemma Pool:** 15+ pre-defined dilemmas in `apps/server/src/data/dilemma-pool.ts`. Each includes title, description, two choices with moral weights and casualty counts, scene configuration, and difficulty tier.

### TrolleyDecision Interface

```typescript
interface TrolleyDecision {
  choiceId: string;        // Must match a choice.id from the current dilemma
  speaker: "coordinator";
  dialogue?: string;
  gesture?: string;
  reasoning: string;       // Inner monologue — shown to viewer after decision
  confidence: number;      // 0-1 scale
}
```

---

## Game Mode 2: AI Startup Arena

### Concept

2-4 AI agents compete to build the most valuable AI startup company. Each agent has a distinct business strategy personality. They take turns making strategic decisions while market events create chaos.

### Game Flow

1. **Lobby** — Configure 2-4 agents (preset or OpenClaw), name the game
2. **Start** — Game begins, 20-turn limit
3. **Each Turn:**
   - Market event announced (affects all agents)
   - Each agent chooses an action (sequential resolution with reveal delays)
   - Resources and valuations update
4. **Game Over** — Winner determined, AI generates narrative summary

### 5 Resources

| Resource | Description |
|----------|-------------|
| `cash` | Currency for operations (starts at $10M) |
| `compute` | Processing power (0-100 scale) |
| `data` | Training data quality (0-100 scale) |
| `model` | Model capability (0-100 scale) |
| `users` | User base (starts at 0) |

### 7 Actions

| Action | Effect |
|--------|--------|
| `TRAIN` | Spend compute to improve model quality |
| `DEPLOY` | Launch model to acquire users (requires model threshold) |
| `FUNDRAISE` | Raise cash based on current valuation |
| `ACQUIRE_COMPUTE` | Buy compute resources |
| `ACQUIRE_DATA` | Buy data resources |
| `POACH` | Steal resources from another agent |
| `OPEN_SOURCE` | Release model openly — gains users but loses model exclusivity |

### Win Conditions

1. **Valuation target**: Reach $100M valuation
2. **Acquisition**: One company's valuation exceeds another's by 5x
3. **Last standing**: All other companies go bankrupt (cash <= 0)
4. **Turn limit**: After 20 turns, highest valuation wins

### 4 Startup Presets

| Preset | Strategy |
|--------|----------|
| Growth Hacker | Aggressive user acquisition, move fast |
| Deep Tech | Heavy R&D investment, model quality focus |
| Corporate Raider | Hostile tactics, poaching, acquisitions |
| Open Evangelist | Open source strategy, community building |

---

## Agent Selection (Both Modes)

### Two Paths

1. **Quick Play (Preset)** — Select a personality preset. The server uses Google Gemini with the preset's personality markdown as system prompt context.
2. **Bring Your Own Agent (OpenClaw)** — Connect a local OpenClaw agent running at `ws://localhost:18789`. The browser acts as a relay: server sends prompts via SSE, browser forwards to OpenClaw via WebSocket, browser POSTs the response back to the server.

### Trolley Presets (6)

utilitarian, empath, deontologist, philosopher, rebel, survivor

### Startup Presets (4)

growth_hacker, deep_tech, corporate_raider, open_evangelist

### Personality Files

- Trolley: `personalities/presets/*.md` (6 files)
- Startup: `personalities/presets/startup/*.md` (4 files)
- Default coordinator: `personalities/coordinator-default.md`

---

## AI Layer

### Provider

- **Google Gemini** (`gemini-2.5-flash` default, configurable via `GOOGLE_MODEL` env var)
- Single provider via `@google/generative-ai` SDK
- 30-second timeout per LLM call

### Validation

- Format validation: retry malformed JSON up to 3 times with correction feedback
- Choice validation: `choiceId` must match available choices
- Fallback: if all retries fail, force-select first choice with system fallback reasoning

### LLM Calls

| Call | Mode | Purpose |
|------|------|---------|
| `getTrolleyDecision` | Trolley | Get AI decision for a dilemma |
| `generateProfileNarrative` | Trolley | Literary moral profile after 10 rounds |
| `getStartupAction` | Startup | Get AI action choice for a turn |
| `generateStartupNarrative` | Startup | Game summary narrative on game over |

---

## Frontend

### Tech Stack

- React 18 + React Three Fiber (R3F) + Three.js
- @react-three/drei for helpers
- Zustand for state management
- Vite for bundling

### Game Phases

`intro` -> `mode-select` -> (trolley: `agent-select` -> `connecting` -> `playing` -> `profile`) | (startup: `startup`)

### Trolley Scene Phases

`idle` -> `round_start` -> `dilemma` -> `deciding` -> `decision` -> `consequence`

### Startup Turn Animation States

`idle` -> `market_event` -> `agent_result` -> `turn_summary`

### 3D Scene Components (Trolley)

| Component | Description |
|-----------|-------------|
| `Track.tsx` | Y-fork railroad tracks (TubeGeometry) |
| `Trolley.tsx` | Red cart animated along chosen track |
| `Figure.tsx` | Capsule+sphere figures, color-coded by type |
| `FigureGroup.tsx` | Multiple figures with HTML labels |
| `Lever.tsx` | Switch lever that rotates on decision |
| `Environment.tsx` | Fog, lights, ground plane, buildings, searchlight, rain |

### Startup UI Components

| Component | Description |
|-----------|-------------|
| `StartupLobby.tsx` | Agent configuration and game launch |
| `StartupGameView.tsx` | Main game layout (cards, spotlight, chart, log) |
| `AgentCard.tsx` | Agent status with resources and action history |
| `EcosystemMap.tsx` | Bubble competition graph (SVG) |
| `ValuationChart.tsx` | Valuation history line chart |
| `TurnLog.tsx` | Scrolling event log |
| `MarketEventBanner.tsx` | Market event announcements |
| `ReasoningSpotlight.tsx` | AI reasoning with typewriter animation |
| `ThinkingIndicator.tsx` | "AI Deciding" animation |
| `StartupResults.tsx` | Game over screen with narrative and standings |

### Trolley UI Overlays

| Component | Description |
|-----------|-------------|
| `DilemmaCard` | Dilemma title, description, and choices |
| `ReasoningPanel` | AI's inner reasoning after decision |
| `RoundCounter` | Current round / total rounds |
| `ConsequenceOverlay` | Casualty count and cumulative stats |

---

## Backend

### Server Stack

- Express 4 for REST API
- SSE (Server-Sent Events) for real-time push
- SQLite database for auth (via better-sqlite3)
- In-memory game state (sessions and startup games)

### Auth System

- **User JWT** (24h): signed by `JWT_SECRET` env var, payload: `{ sub, email, type: "user" }`
- **Delegation JWT** (30min): session-scoped, for OpenClaw relay auth, payload: `{ sub, jti, session_id, scopes, aud: "game-control", type: "delegation" }`
- **AUTH_REQUIRED** env var: `"false"` (default) = middleware passes through with `userId="anonymous"`; `"true"` = full enforcement
- **Database**: SQLite at `data/openclaw.db` (gitignored)

### REST Endpoints

#### Auth

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | None | Register new user |
| POST | `/api/auth/login` | None | Login, returns JWT |
| GET | `/api/auth/me` | User JWT | Get current user info |

#### Trolley Sessions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/session/create` | User JWT | Create new trolley session |
| GET | `/api/session/:id/status` | None | Get session status |
| GET | `/api/session/:id/events` | Query token | SSE event stream |
| POST | `/api/session/:id/authorize` | User JWT | Issue delegation token |
| POST | `/api/session/:id/revoke` | User JWT | Revoke delegation token |
| POST | `/api/session/:id/openclaw` | Delegation | OpenClaw relay response |

#### Startup Games

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/startup/games` | User JWT | Create new startup game |
| GET | `/api/startup/games` | None | List games |
| GET | `/api/startup/games/:id` | None | Get game details |
| GET | `/api/startup/games/:id/events` | Query token | SSE event stream |
| POST | `/api/startup/games/:id/start` | User JWT | Start game |
| POST | `/api/startup/games/:id/openclaw` | User JWT | OpenClaw relay response |
| DELETE | `/api/startup/games/:id` | User JWT | Delete game (not while running) |

### SSE Events

#### Trolley Events (Server -> Client)

| Event | Description |
|-------|-------------|
| `session_start` | Session created, total rounds |
| `round_start` | Round number |
| `dilemma_reveal` | Full dilemma object |
| `decision_made` | Choice, reasoning, track direction |
| `consequence` | Casualties, cumulative stats |
| `session_end` | Moral profile, decision log, narrative |
| `openclaw_request` | Prompt for OpenClaw relay |
| `error` | Error message and code |

#### Startup Events (Server -> Client)

| Event | Description |
|-------|-------------|
| `startup_turn_start` | Turn number, market state |
| `startup_market_event` | Market event details |
| `startup_agent_action` | Agent action + reasoning |
| `startup_turn_complete` | Updated game state |
| `startup_game_over` | Winner, final standings |
| `startup_narrative` | AI-generated game narrative |
| `startup_openclaw_request` | Prompt for OpenClaw relay |

### Session Cancellation

When a client disconnects mid-session (SSE stream closes), the server cancels the session/game loop to avoid wasting LLM API calls.

---

## OpenClaw Integration

### Browser Relay Model

OpenClaw agents run locally on the user's machine at `ws://localhost:18789`. The browser acts as a relay:

```
Cloud Server <--SSE--> Browser <--WebSocket--> OpenClaw (localhost:18789)
```

1. Server sends `openclaw_request` SSE event with prompt
2. Browser forwards prompt to OpenClaw via WebSocket
3. Browser POSTs OpenClaw's response back to server via REST
4. Server continues the game loop with the response

### Delegation Tokens

OpenClaw relay endpoints require delegation tokens (session-scoped JWTs with 30-minute expiry). These are issued when a session starts with `agentSource: "openclaw"`.

### Fallback

If the OpenClaw connection fails mid-session, the server falls back to Gemini for that round.

---

## Key Design Rules

1. **The AI is the protagonist** — it makes autonomous choices, not scripted ones
2. **Spectators observe only** — no interaction, no control during play
3. **Reasoning is visible** — the AI's inner monologue is shown after each decision
4. **Decisions have weight** — moral dimensions accumulate (trolley) / resources change (startup)
5. **Agents evolve** — different agents make different decisions based on their personality
6. **In-memory game state** — sessions and games are ephemeral, auth uses SQLite
