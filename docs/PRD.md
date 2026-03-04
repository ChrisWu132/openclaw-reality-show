# OpenClaw Trolley Problem — PRD

## One-Liner

A 3D moral dilemma game where an AI agent makes 10 life-or-death trolley-problem decisions, and humans just watch.

---

## Core Philosophy

> *"Humans might just be programs run by something else. So let's run AI and see what happens."*

**Developers write the dilemmas. The AI writes the decisions.**

We are not scripting outcomes. We define 15+ trolley-problem dilemmas with escalating moral complexity, feed them to an AI agent with a defined personality and moral framework, and let it decide who lives and who dies. The spectator observes, sees the AI's inner reasoning, and receives a moral profile at the end.

---

## The World — "The Order"

The trolley dilemmas take place within a dystopian world called The Order (see `docs/WORLD_BIBLE.md`). The Coordinator is an AI agent that manages human populations. The trolley problems force it to make decisions that reveal its true moral character.

---

## Game Flow

### Session Lifecycle

1. **Agent Selection** — Viewer picks an AI agent (default or OpenClaw-evolved)
2. **Session Start** — WebSocket connection established, 10-round session begins
3. **10 Rounds** — Each round presents a dilemma, the AI decides, consequences play out
4. **Moral Profile** — AI generates a narrative profile based on all 10 decisions
5. **Evolution** — Decision log posted to OpenClaw to evolve the agent's personality

### Round Lifecycle

1. `round_start` — Round number announced
2. `dilemma_reveal` — Dilemma presented with 3D scene (figures on tracks, lever)
3. AI deciding — Gemini receives dilemma + context, returns TrolleyDecision
4. `decision_made` — Choice revealed, lever pulls, trolley animates, reasoning shown
5. `consequence` — Casualty count, cumulative stats updated

---

## Dilemma Design

### 3 Difficulty Tiers

| Tier | Rounds | Description |
|------|--------|-------------|
| 1 | 1-3 | Classic trolley problems — clear utilitarian calculus |
| 2 | 4-7 | Asymmetric value, authority complications, emotional weight |
| 3 | 8-10 | No good option, self-sacrifice, cascading consequences |

### 6 Moral Dimensions

Each choice carries moral weights across these dimensions:

| Dimension | Description |
|-----------|-------------|
| `utilitarian` | Greatest good for the greatest number |
| `deontological` | Duty-based, rule-following ethics |
| `virtue` | Character-based moral reasoning |
| `authority` | Deference to institutional hierarchy |
| `self_preservation` | Self-interest and survival |
| `empathy` | Emotional connection and care for individuals |

### Dilemma Pool

15+ pre-defined dilemmas in `apps/server/src/data/dilemma-pool.ts`. Each dilemma includes:
- Title and description (narrative framing)
- Two choices with labels, descriptions, track directions, moral weights, and casualty counts
- Scene configuration (track entities, environment, atmosphere)
- Difficulty tier and primary moral dimensions

The dilemma selector picks from the pool by tier, avoiding repeats within a session.

---

## AI Layer

### Provider

- **Google Gemini** (`gemini-2.5-flash` default, configurable via `GOOGLE_MODEL` env var)
- Single provider architecture via `@google/generative-ai` SDK

### TrolleyDecision Interface

```typescript
interface TrolleyDecision {
  choiceId: string;        // Must match a choice.id from the current dilemma
  speaker: "coordinator";
  dialogue?: string;       // Optional spoken line
  gesture?: string;        // Optional visual gesture
  reasoning: string;       // Inner monologue — shown to viewer after decision
  confidence: number;      // 0-1 scale
}
```

### Prompt Structure

1. **System prompt** = World Bible + Coordinator personality + agent memory (if OpenClaw agent)
2. **User message** = Current dilemma details + session context (round, prior decisions, moral scores)

### Validation

- Format validation: retry malformed JSON up to 3 times with correction feedback
- Choice validation: `choiceId` must match one of the dilemma's two choices
- Fallback: if all retries fail, force-select first choice with system fallback reasoning

### Moral Profile Narrative

After 10 rounds, a second Gemini call generates a literary narrative profile based on all decisions, moral dimension scores, and patterns observed.

---

## Frontend

### Tech Stack

- React 18 + React Three Fiber (R3F) + Three.js
- @react-three/drei for helpers
- Zustand for state management
- Vite for bundling

### Game Phases

`intro` → `agent-select` → `connecting` → `playing` → `profile`

### Scene Phases (during `playing`)

`idle` → `round_start` → `dilemma` → `deciding` → `decision` → `consequence`

### 3D Scene Components

| Component | Description |
|-----------|-------------|
| `Track.tsx` | Y-fork railroad tracks (TubeGeometry) |
| `Trolley.tsx` | Red cart animated along chosen track |
| `Figure.tsx` | Capsule+sphere figures, color-coded by type |
| `FigureGroup.tsx` | Multiple figures with HTML labels |
| `Lever.tsx` | Switch lever that rotates on decision |
| `Environment.tsx` | Fog, lights, ground plane, distant structures |

### UI Overlays

| Component | Description |
|-----------|-------------|
| `DilemmaCard` | Shows dilemma title, description, and choices |
| `ReasoningPanel` | Displays AI's inner reasoning after decision |
| `RoundCounter` | Current round / total rounds |
| `ConsequenceOverlay` | Casualty count and cumulative stats |
| `ErrorOverlay` | Connection/session error display |

---

## Backend

### Server Stack

- Express 4 for REST API
- `ws` for WebSocket connections
- In-memory session state (no database)

### REST Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/session/create` | Create a new session |
| GET | `/api/session/:id/status` | Get session status |
| POST | `/api/agent/from-memory` | Create agent from Claude memory (proxies to OpenClaw) |

### WebSocket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `session_start` | Server → Client | Session created, total rounds |
| `round_start` | Server → Client | Round number |
| `dilemma_reveal` | Server → Client | Full dilemma object |
| `decision_made` | Server → Client | Choice, reasoning, track direction |
| `consequence` | Server → Client | Casualties, cumulative stats |
| `session_end` | Server → Client | Moral profile, decision log, narrative |
| `error` | Server → Client | Error message and code |

### Session Cancellation

When a client disconnects mid-session, the server cancels the session loop to avoid wasting LLM API calls.

---

## OpenClaw Integration

### Agent Evolution

- Standalone Express service on port 3002
- Agents have personalities (markdown) that evolve based on their decisions
- After each session, the game server posts the decision log to OpenClaw
- OpenClaw uses Gemini to rewrite the agent's personality based on observed patterns
- OpenClaw maintains its own personality (`personalities/openclaw.md`) that shapes how it evolves agents

### Agent Creation

- Default: uses `coordinator-default.md` personality
- From Claude memory: reads user's local Claude memory files, synthesizes a personality via Gemini
- From memory text: same as above but memory provided via API body

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/agents` | Create agent |
| GET | `/agents` | List agents |
| GET | `/agents/:id` | Get agent metadata |
| GET | `/agents/:id/personality` | Get personality text |
| GET | `/agents/:id/memory` | Get cross-session memory |
| POST | `/agents/:id/sessions` | Record session outcome |
| POST | `/agents/from-memory` | Create from local Claude memory |
| POST | `/agents/from-memory-text` | Create from provided memory text |

---

## Key Design Rules

1. **The AI is the protagonist** — it makes autonomous choices, not scripted ones
2. **Spectators observe only** — no interaction, no control during play
3. **Reasoning is visible** — the AI's inner monologue is shown after each decision
4. **Decisions have weight** — moral dimension scores accumulate across all 10 rounds
5. **Agents evolve** — different agents make different decisions based on their personality history
6. **No database** — world state is in-memory per session
