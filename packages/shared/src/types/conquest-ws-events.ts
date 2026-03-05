import type { ConquestTurnLogEntry, ConquestGame } from "./conquest";

export interface ConquestTurnStartEvent {
  type: "conquest_turn_start";
  gameId: string;
  turn: number;
}

export interface ConquestTurnCompleteEvent {
  type: "conquest_turn_complete";
  gameId: string;
  turn: number;
  turnLog: ConquestTurnLogEntry;
  game: ConquestGame;
}

export interface ConquestGameOverEvent {
  type: "conquest_game_over";
  gameId: string;
  winner: string;
  winCondition: string;
  game: ConquestGame;
}

export type ConquestWSEvent =
  | ConquestTurnStartEvent
  | ConquestTurnCompleteEvent
  | ConquestGameOverEvent;
