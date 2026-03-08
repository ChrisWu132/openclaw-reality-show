import type { WerewolfRole } from '../types/werewolf.js';

export const WEREWOLF_MAX_ROUNDS = 10;
export const WEREWOLF_MIN_PLAYERS = 5;
export const WEREWOLF_MAX_PLAYERS = 7;
export const DISCUSSION_DELAY_MS = 2000;
export const VOTE_REVEAL_DELAY_MS = 1500;
export const NIGHT_PHASE_DELAY_MS = 3000;
export const DAWN_DISPLAY_MS = 3000;

export const WEREWOLF_PLAYER_COLORS = [
  "#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22"
];

export const ROLE_DISTRIBUTION: Record<number, WerewolfRole[]> = {
  5: ["werewolf", "seer", "doctor", "villager", "villager"],
  6: ["werewolf", "werewolf", "seer", "doctor", "villager", "villager"],
  7: ["werewolf", "werewolf", "seer", "doctor", "villager", "villager", "villager"],
};

export const WEREWOLF_PRESETS = {
  aggressive_accuser: { id: "aggressive_accuser", label: "The Prosecutor", description: "Loud, accusatory, always pointing fingers" },
  quiet_observer: { id: "quiet_observer", label: "The Observer", description: "Says little, watches everything, strikes precisely" },
  charismatic_leader: { id: "charismatic_leader", label: "The Leader", description: "Builds consensus, rallies votes, natural authority" },
  paranoid_detective: { id: "paranoid_detective", label: "The Detective", description: "Overthinks everything, sees patterns everywhere" },
  emotional_empath: { id: "emotional_empath", label: "The Empath", description: "Reads emotions, trusts feelings over logic" },
  cunning_diplomat: { id: "cunning_diplomat", label: "The Diplomat", description: "Smooth talker, makes deals, plays both sides" },
} as const;

export type WerewolfPresetId = keyof typeof WEREWOLF_PRESETS;
