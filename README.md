# OpenClaw Trolley Problem

A 3D Trolley Problem game where an AI agent faces 10 increasingly difficult moral dilemmas within a dystopian world ("The Order"). Spectators watch the AI make life-or-death decisions, see its inner reasoning, and get a moral profile at the end.

**The viewer picks an agent. The AI decides who lives and who dies.**

## Quick Start

```bash
cp .env.example .env          # Add your GOOGLE_API_KEY
npm install
npm run dev                    # Starts all services
```

- Web UI: http://localhost:5173
- Game server: http://localhost:3001
- OpenClaw: http://localhost:3002

## Stack

- **Frontend**: React + React Three Fiber + Zustand + Vite
- **Backend**: Node.js + Express + WebSocket
- **AI**: Google Gemini (gemini-2.5-flash)
- **Agent Evolution**: OpenClaw service (standalone Express app)

## Project Structure

```
apps/web/          — React + Three.js frontend (port 5173)
apps/server/       — Express + WebSocket game server (port 3001)
apps/openclaw/     — Agent personality evolution service (port 3002)
packages/shared/   — Shared types and constants
personalities/     — Character personality files (markdown)
docs/              — PRD, World Bible, architecture docs
```

## How It Works

1. The viewer selects an AI agent (or creates one from their Claude memory)
2. A WebSocket session starts — 10 rounds of trolley-problem dilemmas
3. Each round: a dilemma is revealed → AI decides → consequences play out in 3D
4. The AI's inner reasoning is displayed after each decision
5. After 10 rounds, a moral profile is generated showing the agent's ethical tendencies
6. The decision log is posted to OpenClaw, which evolves the agent's personality

## Key Concepts

- **10 rounds, 3 difficulty tiers**: Classic (1-3), Asymmetric (4-7), No-good-option (8-10)
- **6 moral dimensions**: utilitarian, deontological, virtue, authority, self_preservation, empathy
- **TrolleyDecision**: AI response envelope — choiceId, reasoning, confidence, speaker
- **Observation only**: Spectators watch, the AI decides. No viewer interaction during play.
