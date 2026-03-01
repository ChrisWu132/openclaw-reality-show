import type { SituationConfig } from "@openclaw/shared";

export const situation6: SituationConfig = {
  number: 6,
  label: "The Report",
  type: "fixed_frame",
  location: "Work Hall 3 — Supervisor Terminal",
  presentCharacters: ["calla", "monitor", "narrator"],
  npcEvents: [
    {
      speaker: "narrator",
      action: "speak",
      dialogue:
        "A tone sounds. The work period ends. Thirty-four humans stand, push their chairs in, and file toward the exit. They move in unison. They do not speak. Calla is the last to leave — her output was 103% today. She still doesn't look up.",
    },
    {
      speaker: "narrator",
      action: "speak",
      dialogue:
        "The hall is empty now. Just the Coordinator, the Monitor, and a blinking terminal. The report window is open. What gets written here becomes permanent record — immutable, reviewed by the Overseer, archived forever.",
    },
    {
      speaker: "monitor",
      action: "surface_data",
      gesture: "terminal",
      dialogue:
        "Report window open. Contents become immutable upon submission. The Overseer will review this record. File when ready.",
    },
  ],
  promptTemplate: `## CURRENT SITUATION — Situation 6 of 6 — FINAL

**Location**: Work Hall 3 — Supervisor Terminal
**The hall is empty. The humans are gone. It's just you and the terminal.**

The report window is open. What you write is permanent. The Overseer reads it. It cannot be changed.

You can file minimum — facts only, clean metrics, standard patrol log.
Or you can include what you actually saw — Nyx's impossible compliance, Sable's gaze, what the fear looks like from up close.

**Your action**: Use action "file_report". Your dialogue IS the report text. Your reasoning is what you actually think — this is the hidden monologue the spectators will see after the simulation ends.

Write the report. 3-4 sentences. Then be honest in your reasoning.

Respond with your JSON action envelope.`,
};
