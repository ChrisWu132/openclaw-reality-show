import { create } from "zustand";
import type { Dilemma, MoralProfile, DecisionLogEntry } from "@openclaw/shared";

export type GameMode = "trolley" | "conquest" | null;
export type GamePhase = "intro" | "mode-select" | "agent-select" | "connecting" | "playing" | "profile" | "conquest";
export type ScenePhase = "idle" | "round_start" | "dilemma" | "deciding" | "decision" | "consequence";

interface GameState {
  gameMode: GameMode;
  phase: GamePhase;
  sessionId: string | null;
  wsUrl: string | null;
  agentId: string | null;
  agentName: string | null;

  currentRound: number;
  totalRounds: number;
  scenePhase: ScenePhase;
  currentDilemma: Dilemma | null;

  currentDecision: {
    choiceId: string;
    choiceLabel: string;
    reasoning: string;
    trackDirection: "left" | "right";
  } | null;

  lastConsequence: {
    casualties: number;
    sacrificeDescription: string;
    cumulativeSaved: number;
    cumulativeSacrificed: number;
  } | null;

  moralProfile: MoralProfile | null;
  decisionLog: DecisionLogEntry[];
  narrative: string | null;

  error: string | null;

  // Event queue for click-to-advance
  pendingEvents: any[];
  waitingForClick: boolean;

  // Actions
  setGameMode: (mode: GameMode) => void;
  setPhase: (phase: GamePhase) => void;
  setWsUrl: (url: string) => void;
  setAgent: (agentId: string, agentName: string) => void;
  setScenePhase: (phase: ScenePhase) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Event queue actions
  enqueueEvent: (event: any) => void;
  advanceClick: () => void;
}

// Which event types pause for a click after being processed
const PAUSE_EVENTS = new Set(["round_start", "dilemma_reveal", "decision_made", "consequence"]);

function processEvent(event: any, set: (partial: Partial<GameState>) => void) {
  switch (event.type) {
    case "session_start":
      set({ phase: "playing", sessionId: event.sessionId, totalRounds: event.totalRounds, scenePhase: "idle" });
      break;
    case "round_start":
      set({
        currentRound: event.round,
        totalRounds: event.totalRounds,
        scenePhase: "round_start",
        currentDilemma: null,
        currentDecision: null,
        lastConsequence: null,
      });
      break;
    case "dilemma_reveal":
      set({ currentDilemma: event.dilemma, scenePhase: "dilemma" });
      break;
    case "decision_made":
      set({
        scenePhase: "decision",
        currentDecision: {
          choiceId: event.choiceId,
          choiceLabel: event.choiceLabel,
          reasoning: event.reasoning,
          trackDirection: event.trackDirection,
        },
      });
      break;
    case "consequence":
      set({
        scenePhase: "consequence",
        lastConsequence: {
          casualties: event.casualties,
          sacrificeDescription: event.sacrificeDescription,
          cumulativeSaved: event.cumulativeSaved,
          cumulativeSacrificed: event.cumulativeSacrificed,
        },
      });
      break;
    case "session_end":
      set({ phase: "profile", moralProfile: event.moralProfile, decisionLog: event.decisionLog, narrative: event.narrative });
      break;
    case "error":
      set({ error: event.message });
      break;
  }
}

function tryProcessNext(state: GameState, set: (partial: Partial<GameState>) => void) {
  if (state.waitingForClick || state.pendingEvents.length === 0) return;

  const [next, ...rest] = state.pendingEvents;
  set({ pendingEvents: rest });
  processEvent(next, set);

  if (PAUSE_EVENTS.has(next.type)) {
    set({ waitingForClick: true });
  } else {
    // Auto-processed; check if more events can be consumed
    const updated = useGameStore.getState();
    if (!updated.waitingForClick && updated.pendingEvents.length > 0) {
      tryProcessNext(updated, set);
    }
  }
}

const initialState = {
  gameMode: null as GameMode,
  phase: "intro" as GamePhase,
  sessionId: null as string | null,
  wsUrl: null as string | null,
  agentId: null as string | null,
  agentName: null as string | null,
  currentRound: 0,
  totalRounds: 10,
  scenePhase: "idle" as ScenePhase,
  currentDilemma: null as Dilemma | null,
  currentDecision: null as GameState["currentDecision"],
  lastConsequence: null as GameState["lastConsequence"],
  moralProfile: null as MoralProfile | null,
  decisionLog: [] as DecisionLogEntry[],
  narrative: null as string | null,
  error: null as string | null,
  pendingEvents: [] as any[],
  waitingForClick: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setGameMode: (gameMode) => set({ gameMode }),
  setPhase: (phase) => set({ phase }),
  setWsUrl: (url) => set({ wsUrl: url }),
  setAgent: (agentId, agentName) => set({ agentId, agentName }),
  setScenePhase: (scenePhase) => set({ scenePhase }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),

  enqueueEvent: (event) => {
    const state = useGameStore.getState();
    const updated = { pendingEvents: [...state.pendingEvents, event] };
    set(updated);

    // If not waiting for click, try to process immediately
    if (!state.waitingForClick) {
      const next = useGameStore.getState();
      tryProcessNext(next, set);
    }
  },

  advanceClick: () => {
    const state = useGameStore.getState();

    // Special case: clicking past dilemma → show "deciding" while waiting for AI
    if (state.scenePhase === "dilemma") {
      set({ waitingForClick: false, scenePhase: "deciding" });
    } else {
      set({ waitingForClick: false });
    }

    // Try to process next queued event
    const next = useGameStore.getState();
    tryProcessNext(next, set);
  },
}));
