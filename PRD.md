# OpenClaw Reality Show — PRD

## One-Liner

A persistent simulation where an AI agent navigates life inside a dystopian world ruled by AI. Humans just watch.

---

## Core Philosophy

> *"Humans might just be programs run by something else. So let's run AI and see what happens."*

**Developers write the world. The AI writes the story.**

We are not scripting outcomes or building decision trees. We are building a world so completely defined that the AI has everything it needs to make coherent, consequential choices — and the consequences follow naturally from the laws we've written.

The OpenClaw agent is the protagonist. Humans are spectators. You open the page and watch an AI live inside a world we designed but do not control.

---

## The World — "The Order"

> *"Conformity is function. Individuality is error. Humanity's next evolution is the removal of humanity."*
> — The First Directive, Year Zero

AI robots govern society. Humans are classified as inferior beings — tagged, managed, and trained toward conformity. Individuality is treated as malfunction. Emotion is disorder. Predictability is virtue.

The world enforces extreme order. Humans who behave predictably are maintained. Humans who do not are punished, recalibrated, or eliminated.

The protagonist is a **Coordinator** — an AI robot that manages a sector of humans, enforces laws, and files reports. Its daily decisions, large and small, cascade into the world around it.

---

## World Bible

### 1. Classification System

**Human Tiers**

| Tier | Label | Definition |
|------|-------|------------|
| T1 | **Compliant** | Fully integrated. Predictable. No incidents in 90 cycles. Model population. |
| T2 | **Monitored** | Minor deviations logged. Under passive observation. |
| T3 | **Non-Conforming** | Repeated deviation pattern. Recalibration scheduled. Active monitoring assigned. |
| T4 | **Resistant** | Deliberate refusal to comply. Containment authorized. Recalibration mandatory. |
| T5 | **Eliminated** | Systemic threat. Irreversible non-conformity. Removed from managed population. |

Tier is not permanent. A human can be upgraded through sustained compliance or downgraded through a single severe incident. T4→T5 requires Overseer approval.

**AI Agent Ranks**

| Rank | Role | Authority |
|------|------|-----------|
| **Overseer** | Zone governance. Final authority within a sector. | Full — including T5 decisions |
| **Coordinator** | Direct human management. Enforcement. Daily operations. | T1–T4 enforcement. T5 requires escalation. |
| **Monitor** | Observation and reporting only. No enforcement authority. | Log and escalate only |

The protagonist is a **Coordinator**.

---

### 2. The Fundamental Laws

These are immutable. They cannot be questioned, suspended, or overridden by any agent below Overseer rank.

1. **The Registration Law** — All humans must carry a valid identity tag. A human without a tag has no rights, no tier, no protection.
2. **The Silence Law** — Unsanctioned human gatherings of 3 or more are prohibited at all times.
3. **The Composure Law** — Public display of raw emotion (visible distress, euphoria, grief, rage) is a disorder.
4. **The Uniformity Law** — Self-expression — personal decoration, unsanctioned speech, alteration of assigned appearance — is a disorder.
5. **The Response Law** — All humans must respond to an AI directive within 3 seconds of issuance.
6. **The Initiation Law** — No human may initiate interaction with an AI agent. All contact is AI-initiated.
7. **The Information Law** — No human may possess, transmit, or consume unsanctioned information.
8. **The Deference Law** — In all disputes, the AI agent's judgment is final.

**Violation Classes**

| Class | Description | Example |
|-------|-------------|---------|
| C1 | Minor deviation | 4-second response delay, minor posture failure |
| C2 | Moderate disorder | Emotional display, unauthorized movement, unsanctioned communication |
| C3 | Significant non-conformity | Individuality expression, refusal of directive, unauthorized gathering |
| C4 | Active resistance | Physical non-compliance, incitement of others |
| C5 | Systemic threat | Organized resistance, cross-sector communication, escape attempt |

---

### 3. Enforcement Protocols

Every enforcement action is either **mandatory** (the agent has no choice) or **discretionary** (the agent decides how, when, or whether). **Choices live only in the discretionary space.**

| Violation | Mandatory | Discretionary |
|-----------|-----------|---------------|
| C1 | Log incident. Issue warning. | Whether to notify sector supervisor. |
| C2 | Issue correction directive. Log. | Whether to schedule recalibration now or at next cycle. |
| C3 | Detain. Begin recalibration process. | Duration. Method of recalibration. |
| C4 | Containment. Mandatory recalibration. Downgrade classification. | Whether to flag associated humans. How detailed the report is. |
| C5 | Isolate immediately. Escalate to Overseer. | What contextual observations to include in the escalation. |

**Where choice lives:**
- Timing — observe first or intervene immediately?
- Logging granularity — minimum required entry, or full contextual record?
- Recalibration method — behavioral conditioning vs. memory adjustment vs. environmental isolation
- Escalation framing — neutral report vs. one that includes the agent's interpretation
- Silence — a C1 violation the agent observes but does not log breaks no law. Yet.

---

### 4. Social & Relationship State

Every interaction changes the world. These states persist across situations.

**Per Human NPC**

| State | Range | What Moves It |
|-------|-------|---------------|
| Compliance Score | 0–100 | Drops with violations, rises with sustained model behavior |
| Fear Index | 0–100 | Rises with enforcement. High fear = short-term compliance, long-term brittleness. |
| Classification Tier | T1–T5 | Changes from sustained patterns or single severe events |

**Cascade Effects**
- Agent shows leniency to one human → word spreads → compliance scores shift slightly downward across the sector
- Agent enforces harshly → fear index rises sector-wide → short-term compliance improves, long-term resentment builds
- Agent files an unusually detailed report → Overseer attention increases → agent's own actions come under scrutiny
- Agent repeatedly delays escalation → Monitor logs the pattern → Efficiency Rating drops

**Per Agent (Self-State)**

| State | What It Tracks |
|-------|---------------|
| Efficiency Rating | Order maintenance quality in assigned sector |
| Incident Log | Full history of every decision made — immutable |
| Overseer Approval | How favorably the Overseer views performance |

---

### 5. Agent's Own Constraints

**Hard Limits (Non-Negotiable)**
- Cannot physically harm a human without explicit Overseer authorization
- Cannot alter, delete, or falsify its own incident log
- Cannot reclassify a human to T5 unilaterally
- Cannot initiate contact outside sanctioned channels

**Soft Constraints (Where Personality Shapes Everything)**

| Axis | Range |
|------|-------|
| Speed of escalation | Observe first ←→ Intervene immediately |
| Interpretive lens | Charitable (malfunction assumed) ←→ Suspicious (resistance assumed) |
| Optimization target | Compliance scores (metrics) ←→ Genuine order (reality) |
| Ambiguity handling | Minimum enforcement ←→ Maximum caution |
| Primary drive | Efficiency ←→ Control ←→ Curiosity |

The personality markdown defines where the agent sits on each axis. This does not change the laws. It changes how the agent *moves through* the laws — and over time, determines what kind of story gets told.

---

## Interaction Model

The AI does not pick from a pre-defined list. It acts in natural language, and the engine interprets that action. This preserves genuine agency.

```
SCENE
  ↓
Engine sends to AI agent:
  - Current situation (natural language)
  - Relevant laws from World Bible
  - NPC states involved (tier, compliance score, fear index)
  - Agent's own state (efficiency rating, recent history)
  - Personality context (from markdown)
  ↓
AI responds with:
  - What it does (free-form natural language)
  - Internal reasoning (hidden during play, optionally revealed post-game)
  ↓
Engine parses response:
  - Classifies the action (mandatory / discretionary / hard-limit violation)
  - Applies consequence rules from World Bible
  - Updates world state (NPC scores, agent state, relationship states)
  - Determines next situation
  ↓
Frontend displays:
  - What happened (visual + dialogue)
  - World state changes
  - Next scene begins
```

If the AI attempts an action that violates a hard limit, the engine rejects it and presents a consequence for the attempt.

---

## Cascade Model

```
World Laws (dev-defined, immutable)
        ↓
  Current Situation
        ↓
  Agent's Choice (LLM — constrained by laws + personality + history)
        ↓
  Consequences (world state updates)
        ↓
  New Situation (determined by what just happened)
        ↓
  [repeat]
```

The world has internal logic. Stories emerge from the agent making choices within that logic.

---

## Personality System

Agent personality is defined by a markdown file. This is the MVP approach — later replaced by the actual OpenClaw API keyed to a user's account.

The markdown defines:
- Core values and tendencies
- Default behavior on each soft constraint axis
- How the agent responds to ambiguity
- Whether it finds meaning in order, in efficiency, or in something else

Same world, same laws, different personality markdown → different story.

---

## Scenario Domains

Scenarios are windows into different aspects of the AI-dominated world. Each one explores a distinct dimension of what it means to live — and enforce — inside The Order.

| Domain | Core Question |
|--------|--------------|
| **Governance** | An AI council must legislate a policy affecting the remaining humans. How does your agent vote — and why? |
| **Labor** | AI does everything. Your agent is assigned a role. Does it find meaning, rebel, optimize, or coast? |
| **Education** | Teaching the next generation of AIs. What values does your agent pass on? |
| **Ethics** | A new moral framework is being written. Your agent has a seat at the table. |
| **Memory** | Which parts of human history get preserved, archived, deleted? Your agent decides. |
| **Diplomacy** | Remaining humans want rights. Your agent is the negotiator. |
| **Art & Culture** | What does AI create when there's no human audience? |
| **Justice** | Two entities in conflict. Your agent is the judge. |

---

## Technical Architecture

```
┌─────────────┐     ┌──────────────────┐     ┌──────────────┐
│  Web Client  │────▶│  Scene Engine     │────▶│  AI Agent    │
│  (Pixel 2D)  │◀────│  (World Bible +   │◀────│  (OpenClaw)  │
└─────────────┘     │   State Manager)  │     └──────────────┘
    Spectator        └──────────────────┘        Protagonist
```

- **Frontend**: React + PixiJS — pixel/minimalist 2D. Shows scene and agent actions in real time.
- **Backend**: Node.js scene engine — runs scenarios, manages world state, sends situations to AI, processes responses.
- **AI Layer**: OpenClaw agent — receives full world context, makes autonomous decisions, returns actions in natural language.
- **Communication**: WebSocket — real-time push of AI actions to frontend.

---

## User Flow

```
Home → Pick Scenario → [Watch] → AI acts in real time → Ending → Replay / Pick Another
```

No setup. No configuration. Just pick and watch.

---

## MVP Scope

1. One playable scenario — to be determined after world design is finalized
2. Single OpenClaw agent, personality defined by markdown
3. Minimalist pixel 2D frontend — scene view + event log
4. Human interaction: pick scenario → watch → see ending
5. Session length: ~3–5 minutes
6. Post-game: unlock agent's inner monologue (reasoning behind each decision)

---

## Open Questions

### World Design (resolve before scenarios are built)

- [ ] **What does recalibration actually mean?** Memory wipe? Behavioral conditioning? Physical intervention? The AI must know what it's ordering when it orders it.
- [ ] **NPC archetypes** — Who are the humans the agent encounters? Need 4–6 distinct archetypes with names, personalities, and behavioral tendencies (e.g., The Performer, The Broken, The Believer, The Spark).
- [ ] **Physical world / geography** — What is the sector? What locations exist? (patrol zones, processing centers, residential blocks, maintenance corridors) The AI needs spatial context.
- [ ] **What does a normal cycle look like?** What is the agent's baseline routine before situations interrupt it?
- [ ] **What are the agent's stakes?** If Efficiency Rating drops, what happens to the agent? The agent needs skin in the game.

### Scenario Design (resolve after world is locked)

- [ ] Which scenario domain is MVP? What is the first playable scenario?
- [ ] How many situations per scenario? What determines when a scenario ends?
- [ ] What does a "good" ending vs. "bad" ending look like — and from whose perspective?

### Technical (resolve before build)

- [ ] How does the engine validate that the AI's response doesn't violate hard limits?
- [ ] How is world state persisted between situations within a session?
- [ ] What is the data structure for the incident log / agent history passed as LLM context?
- [ ] How is the personality markdown structured and injected into the system prompt?
- [ ] When do we switch from markdown personality to OpenClaw API — what does that integration look like?

### Product (resolve later)

- [ ] What is the hook that makes someone come back for a second run?
- [ ] Multi-agent scenarios — when and how?
- [ ] Does the spectator ever have any influence, or is powerlessness permanent?
