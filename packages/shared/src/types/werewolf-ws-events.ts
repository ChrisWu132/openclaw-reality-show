import type { DiscussionStatement, VoteAction, WerewolfGame, WerewolfPhase, WerewolfRole } from './werewolf.js';

export type WerewolfWSEvent =
  | { type: "werewolf_round_start"; gameId: string; round: number; phase: WerewolfPhase; alivePlayers: string[] }
  | { type: "werewolf_dawn"; gameId: string; round: number; killed: string | null; saved: boolean; killedName?: string; killedRole?: WerewolfRole }
  | { type: "werewolf_discussion"; gameId: string; round: number; speakingRound: number; statement: DiscussionStatement }
  | { type: "werewolf_vote"; gameId: string; round: number; vote: VoteAction }
  | { type: "werewolf_vote_result"; gameId: string; round: number; eliminated: string | null; eliminatedRole?: WerewolfRole; tally: Record<string, number> }
  | { type: "werewolf_night_start"; gameId: string; round: number }
  | { type: "werewolf_game_over"; gameId: string; winner: "village" | "werewolves"; game: WerewolfGame }
  | { type: "werewolf_narrative"; gameId: string; narrative: string }
  | { type: "werewolf_openclaw_request"; gameId: string; requestId: string; agentId: string; prompt: string }
  | { type: "werewolf_error"; gameId: string; message: string };
