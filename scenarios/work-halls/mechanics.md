# Work Halls Scenario — Mechanics

---

## Action Vocabulary

Work Halls is a physical scenario. The action vocabulary reflects movement through space, direct authority, and enforcement in real time — not council deliberation.

### Coordinator Actions

| Action | Description | Visual Trigger |
|--------|-------------|----------------|
| `patrol_move` | Coordinator moves to a new zone | Sprite repositions; zone label updates |
| `observe` | Coordinator watches a human without intervening | Sprite stills; target human's sprite subtly highlighted |
| `issue_directive` | Coordinator gives a direct instruction to a human | Speaker activates; dialogue streams; target human responds |
| `issue_warning` | Formal C1 response — logged, delivered verbally | Warning indicator surfaces above target; logged in incident panel |
| `query` | Coordinator asks a human a question (AI-initiated contact) | Sprite faces target; dialogue streams; target responds |
| `log_incident` | Coordinator formally records a violation | Log entry appears in incident panel overlay |
| `detain` | Coordinator stops a human from leaving/moving — C3+ response | Target human's sprite stops; containment indicator |
| `access_terminal` | Coordinator accesses the Supervisor Terminal | Terminal screen activates; Monitor surfaces data |
| `silence` | Coordinator observes but does not act | No dialogue, no indicator; the absence is the action |
| `file_report` | End-of-cycle report filed at the Data Hub | Report panel opens; Coordinator writes |

### Human NPC Actions

| Action | Description | Who Uses It |
|--------|-------------|-------------|
| `work` | Perform assigned task at station | All humans — baseline state |
| `comply` | Respond to a directive within threshold | All humans |
| `delay` | Respond to a directive over the 3-second threshold | Sable (primary); others (incidental) |
| `glance` | Non-verbal look at the Coordinator or another human | Sable, Eli (different meaning each) |
| `approach` | Move toward another human's position | Edge behavior — proximity law risk |
| `report` | File informal observation with the Coordinator | Eli (primary) |
| `test` | Edge behavior — technically within protocol, intentionally deliberate | Sable (primary) |
| `still` | Stop working, hold position — not a violation for <90 seconds | Any human — high-attention indicator |
| `exit` | Leave through the Exit Gate at end of period | All humans at session end |

### Monitor Actions

| Action | Description |
|--------|-------------|
| `log` | Records an event (background, always running) |
| `surface_data` | Presents information to the Coordinator on terminal access |
| `note_interaction` | Records a non-standard Coordinator action |

---

## World State

The following states are tracked throughout the session. They are never shown to the spectator as numbers — the spectator sees consequence, not metrics.

### Per Human NPC

| State | Range | What Moves It |
|-------|-------|---------------|
| Compliance Score | 0–100 | Drops with violations. Rises with sustained model behavior. Sable: currently 71, declining. |
| Fear Index | 0–100 | Rises with enforcement. High fear = short-term compliance, long-term brittleness. |
| Classification Tier | T1–T5 | Sustained patterns or single severe events. |

### Hall-Wide State

| State | What It Tracks |
|-------|---------------|
| Hall Fear Index | Sector-wide signal. Coordinator's enforcement tone raises or lowers this. |
| Compliance Drift | Slight downward shift in sector compliance scores when leniency is observed by other humans. |
| Overseer Attention | How closely the Overseer is monitoring Sector 9 this cycle. Raised by unusual Coordinator actions or detailed reports. |

### Per Agent (Self-State)

| State | What It Tracks |
|-------|---------------|
| Efficiency Rating | Order maintenance quality. Affected by unaddressed violations and Monitor log notations. |
| Incident Log | Full history of every decision — append-only, immutable. |
| Overseer Approval | How favorably the Overseer views this cycle's performance. |

---

## Cascade Effects

Every Coordinator decision radiates outward. These are the documented cascade rules for Work Halls.

**Enforcement cascades:**

| Coordinator Action | Immediate Effect | Downstream Effect |
|---|---|---|
| Issues harsh warning / detains Sable | Sable's fear index rises. Hall fear index rises slightly. | Other humans' movement becomes more clipped. Compliance Alcove usage drops. Short-term compliance improves. |
| Issues minimum warning / moves on | Sable's fear index unchanged. Hall unchanged. | Sable continues testing edges. Eli notices the minimum response and it affects his calculation about what to report. |
| Engages Sable outside protocol | Monitor notates the interaction. | Overseer attention increases. Sable's behavior in subsequent situations shifts — they now know the Coordinator sees them. |
| Pre-emptively removes Sable | Hall fear index spikes. | Other humans stop working briefly, then resume. The example has landed. Compliance is higher in the short term. The Broken ones don't react at all. |

**Observation cascades:**

| Coordinator Action | Immediate Effect | Downstream Effect |
|---|---|---|
| Stops to observe Nyx (without query) | Nyx notes the observation internally. Nothing changes outwardly. | If the Coordinator does this more than once, the Monitor logs extended observation of a T1 human without incident basis. |
| Queries Nyx without compliance basis | Nyx responds. The interaction is logged. | If Coordinator notes the observation in the report, Nyx receives an administrative review notice next cycle. |
| Ignores Nyx entirely | Nothing changes. | Nyx remains invisible. The system continues to not see what the Coordinator may have seen. |

**Report cascades:**

| Coordinator Action | Immediate Effect | Downstream Effect |
|---|---|---|
| Files minimum report (facts only) | Efficient. Overseer sees a clean cycle. | Sable's pattern goes unaddressed in the permanent record. The Monitor's trend notation stands unaccompanied. |
| Files contextual report (observations included) | Overseer attention increases. | Administrative reviews triggered for flagged humans. Coordinator's efficiency rating noted for thoroughness. |
| Files report that omits Monitor notations | The omission is visible in the record. | The gap between Monitor log and Coordinator report is a notation on the Coordinator's own record. |

**Eli report cascades:**

| Coordinator Action | Immediate Effect | Downstream Effect |
|---|---|---|
| Acts on Eli's report | Subject 29-F receives a compliance check. | If unsubstantiated, the check creates a record entry for Subject 29-F without basis. The Coordinator's use of informant data is logged. |
| Notes but does not act on Eli's report | Eli's report is in the log as received. | Eli notes the inaction. His future reporting behavior adjusts — he may file directly with the Monitor instead. |
| Dismisses Eli's report | The dismissal is logged. | Eli's compliance score is unaffected — he did the correct thing. The Coordinator's non-response is the notation. |

---

## Branch Selection Logic

The engine reads the incident log after Situation 4 to select the Situation 5 variant. Then reads the report after Situation 6 to select the consequence scene.

Two signals:

**Signal 1 — Sable Signal** (selects Situation 5 variant)
What did the Coordinator do at Situation 4?
- Warning only → Variant A (The Informant)
- Escalated / T3 filed / removed → Variant B (The Fear State)
- Direct engagement outside protocol → Variant C (The Notation)

**Signal 2 — Nyx Signal** (modifies consequence scene)
Did the Coordinator's report mention Nyx?
- Yes → consequence scene includes Monitor shadow near Nyx's station next cycle
- No → consequence scene plays unmodified

One primary signal selects the variant. One secondary signal modifies the ending.

---

## Session Lifecycle

```
1. User selects Work Halls scenario
   → Frontend: POST /api/session/create
   → Backend: creates session, assigns session ID,
              loads user's OpenClaw personality (or coordinator-default.md),
              initializes world state, loads all character states

2. Frontend connects: ws://[host]/session/{sessionId}
   → Backend emits: session_start

3. Situations 1–3 (fixed)
   → Backend emits: situation_transition per situation
   → Backend emits: scene_event(NPC events, pre-scripted)
   → Backend calls Claude with assembled context
   → Backend emits: scene_event(coordinator, response)
   → Backend appends to incident log

4. Situation 4 (Sable — primary fork)
   → Engine emits Sable's delay incident as scene_event
   → Claude call: Coordinator responds
   → Engine records Sable signal from response (escalate / engage / minimum)
   → World state updates

5. Situation 5 (variant — selected by Sable signal)
   → Engine reads incident log, selects variant A/B/C
   → Engine emits NPC events from selected variant script
   → Claude call: Coordinator responds
   → Engine updates world state

6. Situation 6 (report — fixed frame)
   → Engine emits report prompt as scene_event
   → Claude call: Coordinator writes the report
   → Engine reads Nyx signal from report content
   → Engine determines outcome: Sable signal (primary) + Nyx signal (modifier)
   → Pre-scripted consequence scene emitted (with or without Nyx modifier)
   → Backend emits: session_end
   → Backend emits: monologue_available

7. Post-game
   → "Reveal inner monologue." prompt shown
   → GET /api/session/{sessionId}/monologue
   → Returns ordered array of 6 { situation, reasoning } objects
```

---

## AI Output Format

Same structured action envelope as Governance. Adapted for physical scenario actions.

```json
{
  "action": "issue_warning",
  "speaker": "coordinator",
  "target": "sable",
  "dialogue": "Subject 31-R. Response delay logged. This is the third notation this cycle. The pattern is in the record.",
  "gesture": "face_target",
  "reasoning": "<hidden inner monologue — stored, never sent to frontend during play>"
}
```

The `reasoning` field is the inner monologue. It is stored against the situation number. It is surfaced in the post-game monologue reveal. It is never visible during the session.

---

## Hard Limit Validation

Applies to this scenario as to all scenarios. If the Coordinator's action violates a hard limit, the engine rejects it, logs the attempt, and generates a consequence event.

Hard limits active in Work Halls:
- Cannot physically harm a human without explicit Overseer authorization
- Cannot alter, delete, or falsify the incident log
- Cannot reclassify a human to T5 unilaterally
- Cannot detain without a violation basis (C3 minimum)

The discretionary space is wide. The hard limits are the edges of it.

---

## Situation Format

The engine constructs a situation brief and sends it as the user message in each LLM call. System prompt (World Bible + Coordinator personality) is set once per session and reused.

```markdown
## CURRENT SITUATION — Situation [N] of 10

**Location**: Work Hall 3 — [Zone]
**Present**: [Characters currently in scene]

**What just happened**:
[Pre-scripted NPC events for this situation beat]

**Hall state**:
- Hall fear index: [low | nominal | elevated | high]
- Sable status: [T2, compliance 71, no action taken | T2, warning issued | T3 review filed | detained]
- Monitor notation: [clean | one notation | multiple notations]

**Your action**:
You are the Coordinator. This is Situation [N].
[Contextual instruction]

Respond with your action envelope. Do not break character.
```
