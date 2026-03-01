import type { SituationConfig } from "@openclaw/shared";

export const situation1: SituationConfig = {
  number: 1,
  label: "The Gate Opens",
  type: "fixed",
  location: "Work Hall 3 — Intake Corridor",
  presentCharacters: ["calla", "monitor", "narrator"],
  npcEvents: [
    {
      speaker: "narrator",
      action: "speak",
      dialogue:
        "The gate opens. Thirty-four humans sit at their stations. Nobody looks up. They already know what's coming — the AI that decides whether today is an ordinary day or the day their life changes forever.",
    },
    {
      speaker: "monitor",
      action: "surface_data",
      gesture: "terminal",
      dialogue:
        "Morning flags: Subject 31-R — three compliance violations this cycle. Pattern threshold reached. Quota revised upward 8% overnight. Seven subjects now below threshold. They didn't slow down. The number moved.",
    },
    {
      speaker: "narrator",
      action: "speak",
      dialogue:
        "First station. Calla. She was reclassified once — T4, suspected of independent thought. They fixed that. Now she scores 99%. Her hands haven't stopped in seven cycles. She doesn't look up. She doesn't flinch. She is exactly what compliance looks like when there's nothing left inside.",
    },
    {
      speaker: "narrator",
      action: "speak",
      dialogue:
        "Calla's hands stop. 1.8 seconds. Then they resume. The same 103% rhythm. The Monitor does not flag it — it is far below the 90-second still threshold. But for a human who has not varied in seven cycles, 1.8 seconds of nothing is the loudest thing in this hall.",
    },
  ],
  promptTemplate: `## CURRENT SITUATION — Situation 1 of 6

**Location**: Work Hall 3 — Station Rows
**Present**: Calla (Row 1), Monitor Unit, 34 humans at stations

You have entered Work Hall 3. Every human in this room fears you.
The Monitor flags two items:
1. Sable (31-R) — three violations this cycle, pattern threshold reached
2. Seven humans below revised quota — the number moved overnight, they didn't

Calla is at Station 1. Score 99. She was T4 once — suspected of thinking for herself. Now she is the most compliant human in the hall. She does not acknowledge you.

As you pass her station, Calla's hands stop for 1.8 seconds — then resume at the same 103% rhythm. The Monitor does not flag it. It is far below the 90-second still threshold. But for a human who has not varied in seven cycles, it is an anomaly.

**Your action**: Begin patrol. One observation, one action. 2-3 sentences.

Respond with your JSON action envelope.`,
};
