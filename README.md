# OpenClaw Reality Show

A real-time AI simulation where an autonomous AI agent navigates a dystopian world — and humans can only watch.

An AI Coordinator patrols a managed human compound, enforcing laws, making moral choices, and filing reports. Every decision is generated live by an LLM. After the session, its hidden inner monologue is revealed — exposing the gap between what it did and what it was actually thinking.

**Developers write the world. The AI writes the story.**

## Quick Start

```bash
npm install
cp .env.example .env     # add your GOOGLE_API_KEY
npm run dev               # starts server (3001) + frontend (5173)
```

## Stack

- **Frontend**: React + PixiJS + Zustand + Vite
- **Backend**: Express + WebSocket + scene engine
- **AI**: Google Gemini API (gemini-2.5-flash)
- **Monorepo**: npm workspaces — `packages/shared`, `apps/server`, `apps/web`

## Project Structure

```
docs/
  PRD.md                 # product requirements (source of truth)
  WORLD_BIBLE.md         # in-universe rules fed to the AI as system prompt
personalities/           # character personality files (narrative markdown)
scenarios/work-halls/    # MVP scenario definition (mechanics, characters, outcomes)
packages/shared/         # shared TypeScript types + constants
apps/server/             # Express + WebSocket + AI layer
apps/web/                # React + PixiJS frontend
```

## How It Works

1. Spectator picks a scenario (MVP: Work Halls)
2. The AI Coordinator patrols a human work compound across 6 situations
3. At each situation, the LLM receives world context and returns a structured action envelope
4. NPC dialogue is pre-scripted; only the Coordinator's responses are AI-generated
5. The Coordinator's inner monologue (`reasoning` field) is stored but hidden during play
6. After the session ends, the spectator can reveal the inner monologue for each situation

## Key Design Rules

- The AI is the protagonist — it makes autonomous choices, not scripted ones
- Spectators observe only — no interaction, no control
- World state numbers (compliance scores, fear index) are never shown to spectators
- The incident log is append-only and immutable
- Hard limits (Section 11 of WORLD_BIBLE.md) are enforced by the engine, not the AI
