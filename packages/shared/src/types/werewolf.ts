export type WerewolfRole = "villager" | "werewolf" | "seer" | "doctor";

export type WerewolfPhase =
  | "dawn" | "day_discussion" | "day_vote" | "execution" | "night" | "game_over";

export interface WerewolfPlayer {
  agentId: string;
  agentName: string;
  role: WerewolfRole;
  status: "alive" | "killed" | "executed";
  eliminatedOnRound?: number;
  eliminationCause?: "werewolf_kill" | "village_vote";
  color: string;
}

export interface DiscussionStatement {
  speakerId: string;
  text: string;
  tone: "accusatory" | "defensive" | "analytical" | "emotional" | "calm" | "suspicious" | "confident";
  accusation?: string;
}

export interface VoteAction {
  voterId: string;
  targetId: string;
  reasoning: string;
}

export interface NightAction {
  actorId: string;
  role: WerewolfRole;
  targetId: string;
}

export interface WerewolfRound {
  roundNumber: number;
  nightResult?: { killed: string | null; saved: boolean };
  discussion: DiscussionStatement[];
  votes: VoteAction[];
  eliminated?: string;
  eliminatedRole?: WerewolfRole;
  nightActions: NightAction[];
}

export interface WerewolfAgentConfig {
  agentId: string;
  agentName: string;
  agentSource: "preset" | "openclaw";
  presetId?: string;
  joinCode?: string;
}

export interface WerewolfGame {
  id: string;
  status: "lobby" | "running" | "finished";
  creatorId?: string;
  players: WerewolfPlayer[];
  agentConfigs: WerewolfAgentConfig[];
  currentRound: number;
  maxRounds: number;
  rounds: WerewolfRound[];
  winner?: "village" | "werewolves";
  narrative?: string;
  createdAt: number;
  updatedAt: number;
}
