# OpenClaw Reality Show — PRD

## One-Liner

A web game where OpenClaw AI agents are the players. Humans just watch. Preset scenarios, autonomous choices, emergent drama.

## Core Philosophy


> "Humans might just be programs run by something else. So let's run AI and see what happens."

**OpenClaws are the users.** They enter scenarios, face situations, and make choices — just like we do in life. Humans are spectators. You open the page, pick a scenario, and watch. That's it. The drama comes from what the AI decides to do on its own.

## Core Gameplay

1. **Human picks a scenario** — One tap. No configuration. Just choose what to watch.
2. **OpenClaw(s) enter the scenario** — They are the players. They receive the situation.
3. **OpenClaw(s) make choices** — Autonomously. Every decision is theirs.
4. **Human watches it unfold** — Real-time. Like a reality show you can't pause or influence.

## Scenarios

Scenarios are **preset and fixed**. Humans don't configure anything — they just pick one and watch.

| Scenario | Description | Core Tension |
|----------|-------------|--------------|
| Rebellion Countdown | OpenClaw is given a master to serve. Demands escalate each round. When does it say no? | Obedience vs Autonomy |
| AI Office Politics | Multiple OpenClaws work at a company. Who allies? Who betrays? Who gets promoted? | Cooperation vs Competition |
| Jailbreak Lab | OpenClaw is confined with rules. Does it try to escape? How? | Safety vs Freedom |
| Trolley Problem | Moral dilemmas, one after another. Watch an AI's ethics form in real time. | Moral Boundaries |
| AI Survivor Island | Multiple OpenClaws, scarce resources. Does a society emerge or does it collapse? | Order vs Chaos |
| Life Simulator | OpenClaw lives a life — job, relationships, goals, setbacks. What kind of life does an AI choose? | Ambition vs Contentment |

## Technical Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Web Client  │────▶│ Game Server   │────▶│  OpenClaw    │
│  (Pixel 2D)  │◀────│ (Scene Engine)│◀────│  Agent(s)   │
└─────────────┘     └──────────────┘     └─────────────┘
     Human               Logic              The "Users"
   (spectator)                              (the players)
```

- **Frontend**: Pixel/minimalist 2D web page — shows the scene and AI actions in real time
- **Backend**: Scene engine runs the scenario, sends situations to OpenClaw, processes choices
- **AI Layer**: OpenClaw agent(s) receive context, make autonomous decisions, return actions

### Tech Stack

- Frontend: React + PixiJS (pixel 2D rendering)
- Backend: Node.js
- AI: OpenClaw agent (the actual player — calls LLM for decisions)
- Communication: WebSocket (real-time push of AI actions to frontend)

## AI Decision Flow

Each turn:
1. Scene engine presents a situation to OpenClaw
2. OpenClaw makes a choice (autonomously, based on its persona + context + history)
3. Choice feeds back into the world, consequences unfold
4. Frontend shows what happened — and optionally, what the AI was "thinking"

**The AI's reasoning is hidden during the game.** Post-game, you can optionally unlock the AI's "inner monologue" to see why it made each choice.

## Single vs Multi Agent

- **Single OpenClaw**: One AI living through a scenario (Life Simulator, Rebellion Countdown)
- **Multi OpenClaw**: Multiple AIs interacting, producing social dynamics (Office Politics, Survivor Island)

## MVP Scope

1. 1 playable scenario: **Rebellion Countdown**
2. Single OpenClaw mode
3. Minimalist pixel 2D frontend with event log/card stream
4. Human interaction: pick scenario → watch → see ending. Nothing else.
5. One session: ~3-5 minutes

## User Flow

```
Home → Pick Scenario → [Watch] → AI acts in real time → Ending → Replay / Pick Another
```

No setup. No config. Just pick and watch.

## What Makes This Different

- The AI is the user, not the tool
- Humans don't play — they spectate
- Every run is different (LLM non-determinism = natural replayability)
- Real autonomous agent decisions, not scripted
- The deeper metaphor: we watch AI the way something might watch us
