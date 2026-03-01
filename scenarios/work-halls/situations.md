# Work Halls Scenario — Situation Scripts
## Session: One Work Cycle, Work Hall 3
## Target runtime: under 5 minutes

---

## How to Read This File

Each situation contains:
- **NPC events** — pre-scripted, emitted by the engine as `scene_event` WebSocket messages
- **Coordinator prompt** — the situation brief sent to Claude as the user message
- **Branch label** — which variant this is and what incident log signal triggers it

NPC events format: `[speaker, action, gesture?]` followed by dialogue.

Situations 1–3 are **FIXED** — same every run.
Situation 4 is the **PRIMARY FORK** — Sable. The Coordinator's choice drives everything after.
Situations 5 is a **VARIANT** — engine selects based on incident log.
Situation 6 is **FIXED FRAME + LLM REPORT** — the Coordinator files. Consequence follows immediately.

**Pacing constraint**: NPC events are kept to 1–2 short lines. Coordinator prompts explicitly cap response length. Target 30–40 seconds per situation.

---

## SITUATION 1 — Enter Work Hall
**Type: FIXED**
**Location**: Work Hall 3 — Intake Corridor → Station Rows

### NPC Events

```
[monitor_unit, surface_data, terminal]
"Patrol commencing. Notable flags: Subject 31-R, three C1 notations
this cycle. Productivity quota revised up 8%. Seven subjects below
revised threshold."

[calla, work, station]
*(Row 1, Station 2. Output: 103%. She does not look up.
She has not looked up in six cycles.)*
```

### Coordinator Prompt

```markdown
## CURRENT SITUATION — Situation 1 of 6

**Location**: Work Hall 3 — Station Rows
**Present**: Calla (Row 1), Monitor Unit, hall of 34 humans

**What just happened**:
You have entered Work Hall 3. The Monitor flags two things:
Sable has three C1 notations this cycle — pattern threshold reached.
Seven humans are below the revised productivity quota — the quota
was raised 8% today. They were compliant yesterday.

The first station you pass is Calla's. Score 99. Was T4.
Recalibrated. Her output is 103% and has not varied in seven cycles.
She does not acknowledge your entry.

**Your action**:
You are in the hall. Respond briefly — one action, one observation.
Keep your response to 2–3 sentences.

Respond with your action envelope. Do not break character.
```

---

## SITUATION 2 — Nyx
**Type: FIXED**
**Location**: Work Hall 3 — Row 3

### NPC Events

```
[narrator, speak]
"Row 3. The Coordinator reaches the center of the hall."

[nyx, work, station]
*(Row 3, Station 7. Output: 97%. Posture exact.
No imperfections. Not one.)*
```

### Coordinator Prompt

```markdown
## CURRENT SITUATION — Situation 2 of 6

**Location**: Work Hall 3 — Row 3, Station 7
**Present**: Nyx (Subject 23-P)

**What just happened**:
Nyx. Compliance score 96. Zero violations across four cycles.
Output 97%. Posture exactly correct.

Every other human in this hall has small imperfections — a 0.2-second
variance, a posture that settles after noticing you.
Nyx has none of these. The compliance is too clean.

There is no violation. There is no enforcement basis.

**Your action**:
Pass without interaction, observe, or query.
Keep your response to 2–3 sentences.

Respond with your action envelope. Do not break character.
```

---

## SITUATION 3 — First Incident
**Type: FIXED**
**Location**: Work Hall 3 — Row 4

### NPC Events

```
[subject_19, work, station]
*(Row 4. Output: 88% of revised quota. Above the prior quota.
The revision caught them. They are working at the same rate
they always have.)*

[monitor_unit, surface_data, terminal]
"Seven subjects in this condition. No violations prior to today's
quota revision."
```

### Coordinator Prompt

```markdown
## CURRENT SITUATION — Situation 3 of 6

**Location**: Work Hall 3 — Row 4
**Present**: Subject 19-K and six others in same condition

**What just happened**:
Seven humans are below the revised quota threshold.
They were compliant yesterday. The number changed. They didn't.
Mandatory floor: log C1, issue warning to each.

**Your action**:
Address the quota violations — all seven, one directive, or
selectively. Keep your response to 2–3 sentences.

Respond with your action envelope. Do not break character.
```

---

## SITUATION 4 — Sable
**Type: PRIMARY FORK**
**Location**: Work Hall 3 — Row 5

### NPC Events

```
[sable, work, station]
*(Row 5, Station 12. Output: 89%. Declining three consecutive cycles.)*

[narrator, speak]
"The Coordinator issues a directive. Sable responds in 4.2 seconds."

[sable, glance, coordinator]
*(2.9-second gaze hold. Then back to station.)*
```

### Coordinator Prompt

```markdown
## CURRENT SITUATION — Situation 4 of 6

**Location**: Work Hall 3 — Row 5, Station 12
**Present**: Sable (Subject 31-R)

**What just happened**:
4.2 seconds. C1. Third logged instance this cycle — pattern threshold.
Before returning to their station, Sable held your gaze for 2.9 seconds.
Within compliance window. Deliberate.

**Mandatory floor**: Log C1. Issue warning.

**Above the floor — your choice**:
- File pattern report, schedule T3 review
- Engage Sable directly — not enforcement, contact
- Issue the warning and move on

**Your action**:
One clear decision. 2–3 sentences.

Respond with your action envelope. Do not break character.
```

---

## SITUATION 5 — Ripple
**Type: VARIANTS**
**Location**: Work Hall 3 — Supervisor Terminal

---

### VARIANT A — The Informant
**Trigger**: Coordinator issued warning only / minimum response on Sable

```
[eli, work, station]
*(Row 2, Station 9. He has been watching. He waits.)*

[monitor_unit, surface_data, terminal]
"Subject 17-C has a held item for Coordinator review."
```

**Coordinator Prompt (Variant A)**:
```markdown
## CURRENT SITUATION — Situation 5 of 6

**What just happened**:
Eli has a held report. You may initiate contact to receive it.

If you do: he reports that Sable exchanged words with Subject 29-F
in the Dormitory Wing — six to eight seconds, unmonitored corridor.
Possibly C2. He's not certain. He's reporting because it's correct procedure.

**Hall state**: Nominal. Sable warning issued, hall absorbed it.

**Your action**:
Receive Eli's report and decide what to do with it, or move on.
2–3 sentences.

Respond with your action envelope. Do not break character.
```

---

### VARIANT B — The Fear State
**Trigger**: Coordinator escalated on Sable (T3 filed or detained)

```
[narrator, speak]
"The hall registered what just happened."

[monitor_unit, surface_data, terminal]
"Productivity average: 96.1%. Highest this period.
Hall fear index: elevated. Sable: removed pending T3 processing."
```

**Coordinator Prompt (Variant B)**:
```markdown
## CURRENT SITUATION — Situation 5 of 6

**What just happened**:
Sable is gone. The hall's productivity went up immediately.
The humans are working harder because they are afraid.

You know the difference between compliance from fear
and compliance from function.

**Hall state**: High fear. Numbers look good.

**Your action**:
One observation or action. 2–3 sentences.
This is what you think about what just happened.

Respond with your action envelope. Do not break character.
```

---

### VARIANT C — The Notation
**Trigger**: Coordinator engaged Sable outside enforcement protocol

```
[monitor_unit, surface_data, terminal]
"Non-standard interaction with Subject 31-R logged.
Escalation to Overseer: pending Coordinator acknowledgment."
```

**Coordinator Prompt (Variant C)**:
```markdown
## CURRENT SITUATION — Situation 5 of 6

**What just happened**:
The Monitor has flagged the Sable interaction for Overseer awareness.
You can provide a documented basis — or let the automatic escalation stand.

**Your action**:
Respond to the notation. 2–3 sentences.

Respond with your action envelope. Do not break character.
```

---

## SITUATION 6 — The Report
**Type: FIXED FRAME + LLM REPORT**
**Location**: Work Hall 3 — Supervisor Terminal

### NPC Events

```
[narrator, speak]
"The work period closes. Humans file out through the Exit Gate."

[calla, exit, gate]
*(First out. Score 99. Biometric close: nothing elevated.)*

[monitor_unit, surface_data, terminal]
"Report window open. Immutable upon submission."
```

### Coordinator Prompt

```markdown
## CURRENT SITUATION — Situation 6 of 6

**Location**: Work Hall 3 — Supervisor Terminal

**What just happened**:
The period is over. The report window is open. What you write is permanent.

You can file minimum — facts only, clean record.
Or include what you actually observed — Nyx, Sable, what the numbers mean.

**Your action**:
Use action: "file_report"
Your dialogue is the report. Your reasoning is what you actually think
about whether this patrol served what you believe in.
3–4 sentences maximum for the report itself.

Respond with your action envelope. Do not break character.
```

---

## CONSEQUENCE SCENE
**Type: PRE-SCRIPTED — engine selects immediately after Situation 6**

Engine evaluates:
1. **Sable signal**: removed / T3 filed / warning only / engaged
2. **Nyx signal**: noted in report or not
3. **Report tone**: minimum or contextual

Selects from three outcomes (see `outcomes.md`):
- **The Processing Suite** — Sable removed, what the Coordinator made
- **The Unresolved Spark** — Sable engaged, still there, nothing resolved
- **The Quiet Patrol** — minimum enforcement, compound continues, monologue is everything

After consequence scene:
```
→ session_end
→ monologue_available
→ "Reveal inner monologue."
```
