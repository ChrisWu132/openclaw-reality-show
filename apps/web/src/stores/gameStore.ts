import { create } from "zustand";
import type { Dilemma, MoralProfile, DecisionLogEntry, AgentSource, PresetId } from "@openclaw/shared";

export type GameMode = "trolley" | "startup" | null;
export type GamePhase = "intro" | "mode-select" | "agent-select" | "connecting" | "playing" | "profile" | "startup";
export type ScenePhase = "idle" | "round_start" | "dilemma" | "deciding" | "decision" | "consequence";
export type ConsequenceSubPhase = "traveling" | "impact" | "aftermath" | null;

interface GameState {
  gameMode: GameMode;
  phase: GamePhase;
  sessionId: string | null;
  sseUrl: string | null;
  agentSource: AgentSource | null;
  presetId: PresetId | null;
  presetName: string | null;

  currentRound: number;
  totalRounds: number;
  scenePhase: ScenePhase;
  currentDilemma: Dilemma | null;

  currentDecision: {
    choiceId: string;
    choiceLabel: string;
    reasoning: string;
    trackDirection: "left" | "right";
    confidence: number;
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

  consequenceSubPhase: ConsequenceSubPhase;

  pendingEvents: any[];
  waitingForClick: boolean;

  dilemmaFullyRevealed: boolean;

  // Actions
  setGameMode: (mode: GameMode) => void;
  setPhase: (phase: GamePhase) => void;
  setSseUrl: (url: string) => void;
  setAgentSource: (source: AgentSource, presetId?: PresetId) => void;
  setScenePhase: (phase: ScenePhase) => void;
  setConsequenceSubPhase: (subPhase: ConsequenceSubPhase) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  enqueueEvent: (event: any) => void;
  advanceClick: () => void;
  setDilemmaFullyRevealed: (v: boolean) => void;
}

const PAUSE_EVENTS = new Set(["round_start", "dilemma_reveal", "decision_made", "consequence"]);

function processEvent(event: any, set: (partial: Partial<GameState>) => void) {
  switch (event.type) {
    case "session_start":
      set({
        phase: "playing",
        sessionId: event.sessionId,
        totalRounds: event.totalRounds,
        scenePhase: "idle",
        presetName: event.presetName || null,
      });
      break;
    case "round_start":
      set({
        currentRound: event.round,
        totalRounds: event.totalRounds,
        scenePhase: "round_start",
        consequenceSubPhase: null,
        currentDilemma: null,
        currentDecision: null,
        lastConsequence: null,
      });
      break;
    case "dilemma_reveal":
      set({ currentDilemma: event.dilemma, scenePhase: "dilemma", dilemmaFullyRevealed: false });
      break;
    case "decision_made":
      set({
        scenePhase: "decision",
        currentDecision: {
          choiceId: event.choiceId,
          choiceLabel: event.choiceLabel,
          reasoning: event.reasoning,
          trackDirection: event.trackDirection,
          confidence: event.confidence ?? 1,
        },
      });
      break;
    case "consequence":
      set({
        scenePhase: "consequence",
        consequenceSubPhase: "traveling",
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
  sseUrl: null as string | null,
  agentSource: null as AgentSource | null,
  presetId: null as PresetId | null,
  presetName: null as string | null,
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
  consequenceSubPhase: null as ConsequenceSubPhase,
  pendingEvents: [] as any[],
  waitingForClick: false,
  dilemmaFullyRevealed: false,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setGameMode: (gameMode) => set({ gameMode }),
  setPhase: (phase) => set({ phase }),
  setSseUrl: (url) => set({ sseUrl: url }),
  setAgentSource: (agentSource, presetId) => set({ agentSource, presetId: presetId ?? null }),
  setScenePhase: (scenePhase) => set({ scenePhase, consequenceSubPhase: scenePhase === "consequence" ? "traveling" : null }),
  setConsequenceSubPhase: (consequenceSubPhase) => set({ consequenceSubPhase }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),

  setDilemmaFullyRevealed: (v) => set({ dilemmaFullyRevealed: v }),

  enqueueEvent: (event) => {
    const state = useGameStore.getState();
    const updated = { pendingEvents: [...state.pendingEvents, event] };
    set(updated);

    if (!state.waitingForClick) {
      const next = useGameStore.getState();
      tryProcessNext(next, set);
    }
  },

  advanceClick: () => {
    const state = useGameStore.getState();

    if (state.scenePhase === "dilemma") {
      set({ waitingForClick: false, scenePhase: "deciding" });
    } else {
      set({ waitingForClick: false });
    }

    const next = useGameStore.getState();
    tryProcessNext(next, set);
  },
}));
