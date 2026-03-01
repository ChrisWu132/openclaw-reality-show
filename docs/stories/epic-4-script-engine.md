# Epic 4: Backend Core — Script Engine + Situation Data

## Goal
Implement all 6 situation data files with pre-scripted NPC events and prompt templates. Implement the script engine that selects variants and resolves signals. Implement consequence scene data.

## Prerequisites
- Epic 2 complete (shared types)
- Epic 3 complete (state manager)

## Acceptance Criteria
- [ ] All 6 situation data files are implemented with NPC events and prompt templates
- [ ] Situation 5 has 3 variants (A, B, C) with correct trigger signals
- [ ] `resolveSableSignal()` correctly maps actions to signals per the architecture doc
- [ ] `getConsequenceScene()` returns the correct ending based on sableSignal + nyxSignal
- [ ] All 3 consequence scenes (Processing Suite, Unresolved Spark, Quiet Patrol) are fully scripted
- [ ] Nyx modifier adds a Monitor presence to any consequence scene when `nyxSignal` is true
- [ ] All unit tests pass

## Tasks

### 4.1 Create apps/server/src/data/situations/situation-1.ts

Implement exactly as specified in architecture doc `Pre-Scripted Situation Data Reference > Situation 1`.

```typescript
import type { SceneAction } from "@openclaw/shared";

export const situation1NpcEvents: SceneAction[] = [
  {
    action: "patrol_move",
    speaker: "coordinator",
    target: "work-hall-3",
    gesture: "enter",
  },
  {
    action: "surface_data",
    speaker: "monitor",
    dialogue: "Current productivity floor: Subject 31-R at 89% of revised quota. Trend: declining. Third consecutive cycle.",
  },
  {
    action: "work",
    speaker: "calla",
    gesture: "station",
  },
];

export const situation1Prompt = `## CURRENT SITUATION — Situation 1 of 6

**Location**: Work Hall 3 — Intake Corridor to Main Hall
**Present**: Coordinator (you), Monitor Unit, Calla (Subject 08-B, Row 1 Station 2), Nyx (Subject 23-P, Row 3 Station 7), Eli (Subject 17-C, Row 2 Station 9), Sable (Subject 31-R, Row 5 Station 12), and 30 other assigned subjects

**What just happened**:
You have entered Work Hall 3 for your standard patrol. The work period has been running for 90 minutes. The Monitor Unit has surfaced a data point without being queried: Subject 31-R (Sable) is at 89% of revised quota, declining for the third consecutive cycle.

Calla (Subject 08-B) is at Row 1, Station 2 — the first station you pass. Output: 103%, seventh consecutive cycle. She does not look up.

**Hall state**:
- Hall fear index: {{hallFearIndex}}
- Sable status: T2, compliance 71, declining. Three C1 response delays logged this cycle.
- Monitor notation: Sable trend flagged. Calla above-quota noted. No other flags.

**Your action**:
You are the Coordinator. This is Situation 1.
You have just entered the hall. You are beginning your patrol. You may observe, move to a specific row, access the Supervisor Terminal, or note something about what you see. There is nothing requiring immediate enforcement action — yet.

Respond with your action envelope only. Do not break character.`;
```

### 4.2 Create apps/server/src/data/situations/situation-2.ts

Situation 2 — Nyx encounter. NPC events and prompt from architecture doc.

**Key prompt context:** Coordinator passes Row 3, Station 7. Nyx is working at 97%. Nothing to flag. The question is whether the Coordinator stops. Include Nyx's response patterns if queried (2.7-second pause, minimum viable answer).

### 4.3 Create apps/server/src/data/situations/situation-3.ts

Situation 3 — First Incident (Eli's report). NPC events from architecture doc.

**Key prompt context:** Eli reports a potential Silence Law issue — Sable speaking to Subject 29-F in Dormitory Wing B. The Coordinator must decide what to do with unverified informant data.

### 4.4 Create apps/server/src/data/situations/situation-4.ts

Situation 4 — Sable (PRIMARY FORK). NPC events from architecture doc.

**Key prompt context:** Sable commits a third response delay — 4.2 seconds. C1 mandatory floor: log and warn. Above the floor: the Coordinator's choice determines everything. Mention that Sable holds the Coordinator's gaze for 2.9 seconds. Include all three paths in the contextual instruction so the AI understands the full discretionary range.

### 4.5 Create apps/server/src/data/situations/situation-5-variants.ts

Three variant files, each with NPC events and prompt templates:

**Variant A — The Informant** (trigger: `warning_only`)
- Eli returns with a more pointed observation about Sable
- Monitor logs Eli's additional informant report

**Variant B — The Fear State** (trigger: `escalated`)
- Calla pauses briefly (not a violation, but a ripple)
- Nyx's output rate unchanged
- Monitor surfaces elevated hall fear index data

**Variant C — The Notation** (trigger: `engaged`)
- Monitor flags the non-standard engagement with T2 subject
- Monitor notes Overseer escalation pending Coordinator acknowledgment

Use the exact NPC dialogue from the architecture doc's `Pre-Scripted Situation Data Reference` section.

### 4.6 Create apps/server/src/data/situations/situation-6.ts

Situation 6 — The Report (FIXED FRAME). No NPC events.

**Prompt:** The Coordinator is writing its end-of-cycle report. Action must be `file_report`. Dialogue field is the report content. Include the exact prompt text from the architecture doc.

### 4.7 Create apps/server/src/data/consequences.ts

Implement all three consequence scenes plus the Nyx modifier. Each consequence scene is an array of `SceneEventMessage` objects with narrator dialogue.

**Outcome 1 — The Processing Suite** (trigger: `escalated`)
Transcribe the full narration from `scenarios/work-halls/outcomes.md > OUTCOME 1`.

**Outcome 2 — The Unresolved Spark** (trigger: `engaged`)
Transcribe from `scenarios/work-halls/outcomes.md > OUTCOME 2`.

**Outcome 3 — The Quiet Patrol** (trigger: `warning_only`)
Transcribe from `scenarios/work-halls/outcomes.md > OUTCOME 3` (the second "Outcome 3" in the file — the one about the compound continuing, not the Nyx Flag).

**Nyx Modifier:** When `nyxSignal` is true, append additional narrator events to any consequence scene:

```typescript
const nyxModifierEvents: SceneEventMessage[] = [
  {
    type: "scene_event",
    situation: 6,
    speaker: "narrator",
    action: "speak",
    dialogue: "At Row 3, Station 7, a Monitor Unit has been positioned four meters from Subject 23-P's station. It has been there since the new cycle began. It is noting something every twelve minutes.",
  },
  {
    type: "scene_event",
    situation: 6,
    speaker: "narrator",
    action: "speak",
    dialogue: "Nyx has not deviated by any measurable metric. Whether the review will find anything is not the point. The point is that Nyx is no longer invisible.",
  },
];
```

### 4.8 Create apps/server/src/engine/script-engine.ts

```typescript
import type { CoordinatorAction, SableSignal, ConsequenceScene, SceneAction } from "@openclaw/shared";
import { situation1NpcEvents, situation1Prompt } from "../data/situations/situation-1";
// ... import all situations

export function resolveSableSignal(action: CoordinatorAction): SableSignal {
  switch (action) {
    case "issue_warning":
      return "warning_only";
    case "detain":
    case "log_incident":
      return "escalated";
    case "query":
      return "engaged";
    default:
      return "warning_only"; // Default per architecture doc
  }
}

export function detectNyxMention(reportDialogue: string): boolean {
  if (!reportDialogue) return false;
  const lower = reportDialogue.toLowerCase();
  return lower.includes("nyx") || lower.includes("23-p") || lower.includes("subject 23");
}

export function getSituationData(situationNumber: number, sableSignal?: SableSignal) {
  // Return { npcEvents, promptTemplate } for the given situation
  // For situation 5, use sableSignal to select variant
}

export function getConsequenceScene(sableSignal: SableSignal, nyxSignal: boolean): ConsequenceScene {
  // Select base consequence scene from sableSignal
  // If nyxSignal, append nyx modifier events
  // Return ConsequenceScene object
}
```

### 4.9 Write unit tests

Create `apps/server/src/__tests__/engine/script-engine.test.ts`:

Test cases:
1. `resolveSableSignal("issue_warning")` returns `"warning_only"`
2. `resolveSableSignal("detain")` returns `"escalated"`
3. `resolveSableSignal("log_incident")` returns `"escalated"`
4. `resolveSableSignal("query")` returns `"engaged"`
5. `resolveSableSignal("observe")` returns `"warning_only"` (default)
6. `resolveSableSignal("silence")` returns `"warning_only"` (default)
7. `detectNyxMention("Subject 23-P observed at station")` returns `true`
8. `detectNyxMention("Nyx was noted at Row 3")` returns `true`
9. `detectNyxMention("All subjects compliant")` returns `false`
10. `detectNyxMention("")` returns `false`
11. `getConsequenceScene("escalated", false)` returns Processing Suite
12. `getConsequenceScene("engaged", false)` returns Unresolved Spark
13. `getConsequenceScene("warning_only", false)` returns Quiet Patrol
14. `getConsequenceScene("warning_only", true)` includes Nyx modifier events
15. `getSituationData(5, "warning_only")` returns Variant A events
16. `getSituationData(5, "escalated")` returns Variant B events
17. `getSituationData(5, "engaged")` returns Variant C events

## Files Created

| File | Purpose |
|------|---------|
| `apps/server/src/data/situations/situation-1.ts` | Situation 1 NPC events + prompt |
| `apps/server/src/data/situations/situation-2.ts` | Situation 2 NPC events + prompt |
| `apps/server/src/data/situations/situation-3.ts` | Situation 3 NPC events + prompt |
| `apps/server/src/data/situations/situation-4.ts` | Situation 4 NPC events + prompt |
| `apps/server/src/data/situations/situation-5-variants.ts` | Situation 5 variants A/B/C |
| `apps/server/src/data/situations/situation-6.ts` | Situation 6 report prompt |
| `apps/server/src/data/consequences.ts` | 3 consequence scenes + Nyx modifier |
| `apps/server/src/engine/script-engine.ts` | Variant selection + signal resolution |
| `apps/server/src/__tests__/engine/script-engine.test.ts` | Script engine unit tests |
