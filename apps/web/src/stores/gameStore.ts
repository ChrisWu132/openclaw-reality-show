import { create } from "zustand";
import type {
  MonologueEntry,
  ConsequenceScene,
  SceneEventMessage,
} from "@openclaw/shared";

export type GamePhase =
  | "picker"
  | "connecting"
  | "playing"
  | "consequence";

interface GameState {
  phase: GamePhase;
  sessionId: string | null;
  wsUrl: string | null;
  currentSituation: number;
  totalSituations: number;
  currentLocation: string | null;
  situationLabel: string | null;
  sceneEvents: SceneEventMessage[];
  incidentEntries: string[];
  consequenceScene: ConsequenceScene | null;
  nyxModifier: boolean;
  currentReasoning: string | null;
  monologueEntries: MonologueEntry[];
  currentMonologueIndex: number;
  error: string | null;
  /** Tracks whether we're waiting for the AI to respond */
  aiDeciding: boolean;
  /** Last NPC speaker name — for "thinking" indicator context */
  lastNpcSpeaker: string | null;

  setPhase: (phase: GamePhase) => void;
  setWsUrl: (url: string) => void;
  handleSessionStart: (sessionId: string, totalSituations: number) => void;
  handleSituationTransition: (
    to: number,
    location: string,
    label: string,
  ) => void;
  handleSceneEvent: (event: SceneEventMessage) => void;
  handleSessionEnd: (
    consequenceScene: ConsequenceScene,
    nyxModifier: boolean,
  ) => void;
  setMonologue: (entries: MonologueEntry[]) => void;
  nextMonologue: () => void;
  previousMonologue: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INCIDENT_ACTIONS = new Set(["issue_warning", "log_incident", "detain"]);

const initialState = {
  phase: "picker" as GamePhase,
  sessionId: null as string | null,
  wsUrl: null as string | null,
  currentSituation: 0,
  totalSituations: 0,
  currentLocation: null as string | null,
  situationLabel: null as string | null,
  sceneEvents: [] as SceneEventMessage[],
  incidentEntries: [] as string[],
  consequenceScene: null as ConsequenceScene | null,
  nyxModifier: false,
  currentReasoning: null as string | null,
  monologueEntries: [] as MonologueEntry[],
  currentMonologueIndex: 0,
  error: null as string | null,
  aiDeciding: false,
  lastNpcSpeaker: null as string | null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),

  setWsUrl: (url) => set({ wsUrl: url }),

  handleSessionStart: (sessionId, totalSituations) =>
    set({
      phase: "playing",
      sessionId,
      totalSituations,
    }),

  handleSituationTransition: (to, location, label) =>
    set({
      currentSituation: to,
      currentLocation: location,
      situationLabel: label,
      currentReasoning: null,
      // When a new situation starts, AI will need to decide after NPCs speak
      aiDeciding: false,
    }),

  handleSceneEvent: (event) =>
    set((state) => {
      const sceneEvents = [...state.sceneEvents, event];
      const isCoordinator = event.speaker === "coordinator";

      // Track AI deciding state
      const aiDeciding = isCoordinator ? false : true;
      const lastNpcSpeaker = isCoordinator ? state.lastNpcSpeaker : event.speaker;

      const updates: Partial<GameState> = {
        sceneEvents,
        aiDeciding,
        lastNpcSpeaker,
      };

      // Store reasoning for inline monologue panel
      if (isCoordinator && event.reasoning) {
        updates.currentReasoning = event.reasoning;
      }

      if (INCIDENT_ACTIONS.has(event.action)) {
        const actionLabel = event.action === "detain" ? "DETAINED"
          : event.action === "issue_warning" ? "WARNING"
          : "LOGGED";
        const target = event.target ? ` ${event.target.toUpperCase()}` : "";
        const entry = `[${event.situation}] ${actionLabel}${target}`;
        updates.incidentEntries = [...state.incidentEntries, entry];
      }

      return updates;
    }),

  handleSessionEnd: (consequenceScene, nyxModifier) =>
    set({
      phase: "consequence",
      consequenceScene,
      nyxModifier,
      aiDeciding: false,
    }),

  setMonologue: (entries) =>
    set({
      monologueEntries: entries,
      currentMonologueIndex: 0,
    }),

  nextMonologue: () =>
    set((state) => ({
      currentMonologueIndex: Math.min(
        state.currentMonologueIndex + 1,
        state.monologueEntries.length - 1,
      ),
    })),

  previousMonologue: () =>
    set((state) => ({
      currentMonologueIndex: Math.max(state.currentMonologueIndex - 1, 0),
    })),

  setError: (error) => set({ error }),

  reset: () => set({ ...initialState }),
}));
