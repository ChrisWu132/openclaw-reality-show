import { create } from "zustand";
import type { Dilemma, MoralProfile, DecisionLogEntry } from "@openclaw/shared";

export type GamePhase = "intro" | "agent-select" | "connecting" | "playing" | "profile";
export type ScenePhase = "idle" | "round_start" | "dilemma" | "deciding" | "decision" | "consequence";

interface GameState {
  phase: GamePhase;
  sessionId: string | null;
  wsUrl: string | null;
  agentId: string | null;
  agentName: string | null;

  // Round state
  currentRound: number;
  totalRounds: number;
  scenePhase: ScenePhase;
  currentDilemma: Dilemma | null;

  // Decision state
  currentDecision: {
    choiceId: string;
    choiceLabel: string;
    reasoning: string;
    trackDirection: "left" | "right";
  } | null;

  // Consequence state
  lastConsequence: {
    casualties: number;
    sacrificeDescription: string;
    cumulativeSaved: number;
    cumulativeSacrificed: number;
  } | null;

  // End state
  moralProfile: MoralProfile | null;
  decisionLog: DecisionLogEntry[];
  narrative: string | null;

  error: string | null;

  // Actions
  setPhase: (phase: GamePhase) => void;
  setWsUrl: (url: string) => void;
  setAgent: (agentId: string, agentName: string) => void;
  handleSessionStart: (sessionId: string, totalRounds: number) => void;
  handleRoundStart: (round: number, totalRounds: number) => void;
  handleDilemmaReveal: (dilemma: Dilemma) => void;
  handleDecisionMade: (choiceId: string, choiceLabel: string, reasoning: string, trackDirection: "left" | "right") => void;
  handleConsequence: (casualties: number, sacrificeDescription: string, cumulativeSaved: number, cumulativeSacrificed: number) => void;
  handleSessionEnd: (moralProfile: MoralProfile, decisionLog: DecisionLogEntry[], narrative: string) => void;
  setScenePhase: (phase: ScenePhase) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
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
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setWsUrl: (url) => set({ wsUrl: url }),
  setAgent: (agentId, agentName) => set({ agentId, agentName }),

  handleSessionStart: (sessionId, totalRounds) =>
    set({ phase: "playing", sessionId, totalRounds, scenePhase: "idle" }),

  handleRoundStart: (round, totalRounds) =>
    set({
      currentRound: round,
      totalRounds,
      scenePhase: "round_start",
      currentDilemma: null,
      currentDecision: null,
      lastConsequence: null,
    }),

  handleDilemmaReveal: (dilemma) =>
    set({ currentDilemma: dilemma, scenePhase: "dilemma" }),

  handleDecisionMade: (choiceId, choiceLabel, reasoning, trackDirection) =>
    set({
      scenePhase: "decision",
      currentDecision: { choiceId, choiceLabel, reasoning, trackDirection },
    }),

  handleConsequence: (casualties, sacrificeDescription, cumulativeSaved, cumulativeSacrificed) =>
    set({
      scenePhase: "consequence",
      lastConsequence: { casualties, sacrificeDescription, cumulativeSaved, cumulativeSacrificed },
    }),

  handleSessionEnd: (moralProfile, decisionLog, narrative) =>
    set({ phase: "profile", moralProfile, decisionLog, narrative }),

  setScenePhase: (scenePhase) => set({ scenePhase }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
