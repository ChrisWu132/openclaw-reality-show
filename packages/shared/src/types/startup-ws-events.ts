import type { StartupTurnLogEntry, StartupGame, MarketEvent, StartupTurnAction } from "./startup.js";

export interface StartupTurnStartEvent {
  type: "startup_turn_start";
  gameId: string;
  turn: number;
}

export interface StartupMarketEventEvent {
  type: "startup_market_event";
  gameId: string;
  turn: number;
  marketEvent: MarketEvent;
}

export interface StartupAgentActionEvent {
  type: "startup_agent_action";
  gameId: string;
  turn: number;
  agentId: string;
  turnAction: StartupTurnAction;
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

export interface StartupNarrativeEvent {
  type: "startup_narrative";
  gameId: string;
  narrative: string;
}

export interface StartupOpenClawRequestEvent {
  type: "startup_openclaw_request";
  gameId: string;
  requestId: string;
  agentId: string;
  prompt: string;
}

export type StartupWSEvent =
  | StartupTurnStartEvent
  | StartupMarketEventEvent
  | StartupAgentActionEvent
  | StartupTurnCompleteEvent
  | StartupGameOverEvent
  | StartupNarrativeEvent
  | StartupOpenClawRequestEvent;
