import { create } from "zustand";
import type { StartupGame, StartupTurnAction, MarketEvent, StartupAgentConfig } from "@openclaw/shared";

export type StartupPhase = "lobby" | "intro" | "watching" | "finished";
export type TurnAnimPhase = "idle" | "market_event" | "agent_thinking" | "agent_result" | "turn_summary";

interface StartupSSEEvent {
  type: string;
  [key: string]: unknown;
}

const PAUSE_EVENTS = new Set([
  "startup_market_event",
  "startup_agent_action",
  "startup_turn_complete",
  "startup_game_over",
]);

interface StartupState {
  phase: StartupPhase;
  games: StartupGame[];
  activeGame: StartupGame | null;
  error: string | null;

  // Turn animation state
  currentTurnPhase: TurnAnimPhase;
  currentAgentIndex: number;
  latestMarketEvent: MarketEvent | null;
  latestAgentAction: StartupTurnAction | null;
  latestAgentId: string | null;

  // Event queue + click-gating
  pendingEvents: StartupSSEEvent[];
  waitingForClick: boolean;

  // Narrative
  narrative: string | null;

  // Agent configs for lobby
  agentConfigs: StartupAgentConfig[];

  setPhase: (phase: StartupPhase) => void;
  setGames: (games: StartupGame[]) => void;
  setActiveGame: (game: StartupGame | null) => void;
  setError: (error: string | null) => void;
  setTurnPhase: (phase: TurnAnimPhase) => void;
  setCurrentAgentIndex: (index: number) => void;
  setLatestMarketEvent: (event: MarketEvent | null) => void;
  setLatestAgentAction: (action: StartupTurnAction | null, agentId: string | null) => void;
  setNarrative: (narrative: string | null) => void;
  setAgentConfigs: (configs: StartupAgentConfig[]) => void;
  enqueueEvent: (event: StartupSSEEvent) => void;
  advanceClick: () => void;
  reset: () => void;
}

function processStartupEvent(event: StartupSSEEvent, set: (partial: Partial<StartupState>) => void) {
  switch (event.type) {
    case "startup_turn_start":
      set({
        currentTurnPhase: "idle",
        latestAgentAction: null,
        latestAgentId: null,
        latestMarketEvent: null,
      });
      break;
    case "startup_market_event":
      set({
        currentTurnPhase: "market_event",
        latestMarketEvent: event.marketEvent as MarketEvent,
      });
      break;
    case "startup_agent_action":
      set({
        currentTurnPhase: "agent_result",
        latestAgentAction: event.turnAction as StartupTurnAction,
        latestAgentId: event.agentId as string,
      });
      break;
    case "startup_turn_complete":
    case "startup_game_over":
      if (event.game) {
        set({ activeGame: event.game as StartupGame });
      }
      if (event.type === "startup_game_over") {
        set({ currentTurnPhase: "idle", phase: "finished" });
      } else {
        set({ currentTurnPhase: "turn_summary" });
      }
      break;
    case "startup_narrative":
      set({ narrative: event.narrative as string });
      break;
  }
}

function tryProcessNext(state: StartupState, set: (partial: Partial<StartupState>) => void) {
  if (state.waitingForClick || state.pendingEvents.length === 0) return;

  const [next, ...rest] = state.pendingEvents;
  set({ pendingEvents: rest });
  processStartupEvent(next, set);

  if (PAUSE_EVENTS.has(next.type)) {
    set({ waitingForClick: true });
  } else {
    const updated = useStartupStore.getState();
    if (!updated.waitingForClick && updated.pendingEvents.length > 0) {
      tryProcessNext(updated, set);
    }
  }
}

const initialState = {
  phase: "lobby" as StartupPhase,
  games: [] as StartupGame[],
  activeGame: null as StartupGame | null,
  error: null as string | null,
  currentTurnPhase: "idle" as TurnAnimPhase,
  currentAgentIndex: 0,
  latestMarketEvent: null as MarketEvent | null,
  latestAgentAction: null as StartupTurnAction | null,
  latestAgentId: null as string | null,
  pendingEvents: [] as StartupSSEEvent[],
  waitingForClick: false,
  narrative: null as string | null,
  agentConfigs: [] as StartupAgentConfig[],
};

export const useStartupStore = create<StartupState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setGames: (games) => set({ games }),
  setActiveGame: (game) => set({ activeGame: game }),
  setError: (error) => set({ error }),
  setTurnPhase: (phase) => set({ currentTurnPhase: phase }),
  setCurrentAgentIndex: (index) => set({ currentAgentIndex: index }),
  setLatestMarketEvent: (event) => set({ latestMarketEvent: event }),
  setLatestAgentAction: (action, agentId) => set({ latestAgentAction: action, latestAgentId: agentId }),
  setNarrative: (narrative) => set({ narrative }),
  setAgentConfigs: (configs) => set({ agentConfigs: configs }),

  enqueueEvent: (event) => {
    const state = useStartupStore.getState();
    set({ pendingEvents: [...state.pendingEvents, event] });

    if (!state.waitingForClick) {
      const next = useStartupStore.getState();
      tryProcessNext(next, set);
    }
  },

  advanceClick: () => {
    set({ waitingForClick: false });
    const next = useStartupStore.getState();
    tryProcessNext(next, set);
  },

  reset: () => set({ ...initialState }),
}));
