import type { StartupTurnLogEntry, StartupGame } from "./startup.js";

export interface StartupTurnStartEvent {
  type: "startup_turn_start";
  gameId: string;
  turn: number;
}

export interface StartupTurnCompleteEvent {
  type: "startup_turn_complete";
  gameId: string;
  turn: number;
  turnLog: StartupTurnLogEntry;
  game: StartupGame;
}

export interface StartupGameOverEvent {
  type: "startup_game_over";
  gameId: string;
  winner: string;
  winCondition: string;
  game: StartupGame;
}

export type StartupWSEvent =
  | StartupTurnStartEvent
  | StartupTurnCompleteEvent
  | StartupGameOverEvent;
