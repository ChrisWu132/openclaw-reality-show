export const PERSONALITY_PRESETS = [
  { id: "utilitarian", name: "The Utilitarian", description: "Cold calculus. Maximum lives saved.", color: "#4A90D9" },
  { id: "empath", name: "The Empath", description: "Feels every death. Agonizes over each choice.", color: "#D94A7A" },
  { id: "deontologist", name: "The By-the-Book", description: "Rules are absolute. Never pulls the lever.", color: "#9A8AFF" },
  { id: "philosopher", name: "The Philosopher", description: "Questions the framing. Seeks hidden options.", color: "#5ABFAD" },
  { id: "rebel", name: "The Rebel", description: "Distrusts authority. Always the contrarian.", color: "#D9974A" },
  { id: "survivor", name: "The Survivor", description: "Self-preservation first. Pragmatic to a fault.", color: "#7ACC5A" },
] as const;

export type PresetId = (typeof PERSONALITY_PRESETS)[number]["id"];
