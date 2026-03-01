# OpenClaw Reality Show — Project Guide

## What This Project Is

A persistent simulation where an AI agent (the Coordinator) navigates life inside a dystopian world ("The Order") ruled by AI. Humans are spectators only — they watch the AI make decisions, enforce laws, and reveal its inner monologue afterward.

**Developers write the world. The AI writes the story.**

## Project Structure

```
/docs/PRD.md               — Product requirements (source of truth for all features)
/docs/WORLD_BIBLE.md       — In-universe rules document fed to the AI as system prompt
/personalities/            — Character personality markdown files
  coordinator-default.md   — Default protagonist personality
  agent-hardline.md        — NPC AI agent (hardline position)
  agent-pragmatist.md      — NPC AI agent (pragmatic position)
  overseer.md              — NPC Overseer personality
  monitor-unit.md          — NPC Monitor personality
  npc-believer.md          — Human archetype: The Believer
  npc-broken.md            — Human archetype: The Broken
  npc-performer.md         — Human archetype: The Performer
  npc-spark.md             — Human archetype: The Spark
/scenarios/                — Scenario definitions
  governance-scripts.md    — Governance scenario NPC scripts
  work-halls/              — MVP scenario (Work Halls)
    README.md              — Scenario overview
    characters.md          — NPC details for this scenario
    mechanics.md           — Action vocabulary, world state, cascades, branching logic
    outcomes.md            — Ending scenes and consequence scripts
/.bmad-core/               — BMad workflow framework (do not modify)
```

## Architecture (Not Yet Built)

The system will consist of three layers:

- **Frontend**: React + PixiJS — pixel/minimalist 2D with sprite movement and dialogue overlays
- **Backend**: Node.js scene engine — runs scenarios, manages world state, validates AI responses
- **AI Layer**: Google Gemini API (gemini-2.5-flash) — receives world context, returns structured action envelopes
- **Communication**: WebSocket for real-time push of scene events to frontend

## Critical Concepts to Understand

### The AI Is the Protagonist, Not a Tool
The Coordinator AI agent makes autonomous decisions within the world's laws. It has a personality, a conscience, and internal reasoning. We do not script its choices — we script the world it operates in.

### World Bible Is Immutable
`WORLD_BIBLE.md` defines the in-universe rules. It is injected as-is into the AI's system prompt. Do not add game mechanics or meta-instructions to it — it is written *for the Coordinator*, in-character.

### Personality Files Are Narrative Markdown
Personality files (`personalities/*.md`) are pure narrative — no structured fields, no JSON. They are injected into the system prompt alongside the World Bible. The AI reads them as context, not configuration.

### Action Envelopes Are the Interface
The AI responds with structured JSON action envelopes, not free-form prose. Every response must include: `action`, `speaker`, `target`, `dialogue`, `gesture`, `reasoning`. The `reasoning` field (inner monologue) is displayed inline as a split-screen panel below the scene immediately after each Coordinator action.

### NPC Dialogue Is Pre-scripted
NPCs (Overseer, other agents, humans) speak from pre-written scripts. Only the Coordinator's responses are LLM-generated. For situations 5-9 (Governance) or situation 5 (Work Halls), the engine selects script variants based on what the Coordinator has done so far.

### The Incident Log Is Append-Only
The running incident log is a markdown document that grows through the session. It is passed to the AI as context at every situation. The agent reads its own history. The log cannot be altered or deleted.

## MVP Scope

1. **Work Halls scenario** — Coordinator patrols a human work compound, 6 situations, <5 minutes
2. Single Coordinator agent with markdown-defined personality
3. Pixel 2D animated scene with sprite movement and text dialogue
4. Spectator flow: pick scenario → watch (with inline inner monologue) → see ending → watch another
5. Inner monologue shown inline as split-screen panel during play, not as post-game reveal

## Key Technical Decisions

- World state is **in-memory per session** (no database for MVP)
- State also written to **markdown files** for human inspection during development
- **Two validation layers**: format validation (retry malformed output) + semantic validation (reject hard limit violations)
- Personality layer is **abstracted behind an interface** so markdown files can later be swapped for the OpenClaw API
- **No spectator interaction** — observation only, powerlessness is permanent

## Rules for Agents Working on This Project

### Before Making Changes
1. Read `docs/PRD.md` for product requirements — it is the source of truth
2. Read `docs/WORLD_BIBLE.md` to understand the in-universe rules
3. Read relevant scenario files in `scenarios/` before modifying scenario logic
4. Read relevant personality files in `personalities/` before modifying character behavior
5. Check the changelog below for recent changes and known issues

### When Writing Code
- Use Google Gemini (`gemini-2.5-flash` default, configurable via `GOOGLE_MODEL`) for Coordinator LLM calls
- Action envelopes must conform to the vocabulary defined in `scenarios/work-halls/mechanics.md`
- Hard limits (Section 11 of WORLD_BIBLE.md) must be enforced in the engine — never trust the AI to self-enforce
- WebSocket events must conform to the schema in the PRD (Technical Architecture section)
- Session lifecycle must follow the flow defined in `scenarios/work-halls/mechanics.md`
- NPC dialogue comes from pre-written scripts, not LLM calls
- The `reasoning` field is sent inline with scene events and displayed as a split-screen panel below the scene

### What NOT to Do
- Do not modify `docs/WORLD_BIBLE.md` unless explicitly told — it is the canonical in-universe document
- Do not add game mechanics or developer-facing instructions to personality files — they are in-character narrative
- Do not show world state numbers (compliance scores, fear index, tiers) to the spectator — they see consequence, not metrics
- Do not give spectators any control over the simulation — observation only
- Do not hardcode Coordinator responses — the AI generates them each run
- Do not modify `.bmad-core/` — it is an external framework

### File Naming Conventions
- Personality files: `personalities/{role}-{name}.md` (e.g., `npc-spark.md`, `agent-hardline.md`)
- Scenario files go in `scenarios/{scenario-name}/`
- Use kebab-case for all file names

## Changelog

Track all significant changes here. Agents must update this section when making changes.

### [Unreleased]
- 2026-03-01: [frontend] Refactored inner monologue from post-game reveal to inline split-screen panel
  - Files modified: MonologueViewer.tsx (→ MonologuePanel), GameContainer.tsx, App.tsx, ConsequenceScene.tsx, gameStore.ts, useWebSocket.ts
  - Breaking changes: yes — removed "monologue" game phase, reasoning now sent inline with scene_event
- 2026-03-01: [backend] Send reasoning field inline with coordinator scene events, remove monologue_available event
  - Files modified: scene-engine.ts, ws-events.ts
  - Breaking changes: yes — monologue_available event no longer emitted, session ends in "ended" status
- 2026-03-01: [scenario] Added Calla 1.8-second pause micro-event in Situation 1
  - Files modified: situation-1.ts, characters.md
  - Breaking changes: no
- 2026-03-01: [docs] Fixed scenario documentation: 10→6 situations, outcome numbering, monologue seeds
  - Files modified: README.md, mechanics.md, outcomes.md
  - Breaking changes: no
- 2026-03-01: [infrastructure] Code cleanup: deleted residual dist files, empty dirs, fixed model version to gemini-2.5-flash
  - Files modified: CLAUDE.md, settings.local.json
  - Files deleted: dist/ai/ollama-provider.d.ts.map, dist/ai/anthropic-provider.d.ts.map, debug/, e2e/
  - Breaking changes: no
- 2026-02-28: [ai-layer] Replaced Ollama + Anthropic providers with Google Gemini provider
  - Files modified: ai/google-provider.ts (new), ai/llm-provider.ts, ai/llm-client.ts, index.ts, .env.example, package.json
  - Files deleted: ai/ollama-provider.ts, ai/anthropic-provider.ts, docs/architecture.md
  - Breaking changes: yes — GOOGLE_API_KEY now required, removed LLM_PROVIDER/OLLAMA_* env vars
- Project initialized with PRD, World Bible, personality files, and Work Halls scenario definition

<!--
CHANGELOG FORMAT — append new entries at the top of the Unreleased section:

- YYYY-MM-DD: [area] Brief description of what changed and why
  - Files modified: list of files
  - Breaking changes: yes/no + description if yes

Areas: frontend, backend, ai-layer, scenario, personality, world-bible, infrastructure, docs
-->
