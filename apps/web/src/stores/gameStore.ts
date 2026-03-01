import { create } from "zustand";
import type {
  MonologueEntry,
  ConsequenceScene,
  SceneEventMessage,
} from "@openclaw/shared";

export type GamePhase =
  | "intro"
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
  /** Queue of events waiting to be displayed — client controls pacing */
  eventQueue: SceneEventMessage[];
  /** Whether the current dialogue has finished streaming and awaits user click */
  waitingForClick: boolean;
  incidentEntries: string[];
  consequenceScene: ConsequenceScene | null;
  nyxModifier: boolean;
  currentReasoning: string | null;
  /** Reasoning waiting to be revealed after a delay */
  pendingReasoning: string | null;
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
  /** User clicked — advance to next queued event */
  advanceDialogue: () => void;
  setWaitingForClick: (waiting: boolean) => void;
  /** Reveal pending reasoning into currentReasoning */
  revealReasoning: () => void;
  setMonologue: (entries: MonologueEntry[]) => void;
  nextMonologue: () => void;
  previousMonologue: () => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const INCIDENT_ACTIONS = new Set(["issue_warning", "log_incident", "detain"]);

const initialState = {
  phase: "intro" as GamePhase,
  sessionId: null as string | null,
  wsUrl: null as string | null,
  currentSituation: 0,
  totalSituations: 0,
  currentLocation: null as string | null,
  situationLabel: null as string | null,
  sceneEvents: [] as SceneEventMessage[],
  eventQueue: [] as SceneEventMessage[],
  waitingForClick: false,
  incidentEntries: [] as string[],
  consequenceScene: null as ConsequenceScene | null,
  nyxModifier: false,
  currentReasoning: null as string | null,
  pendingReasoning: null as string | null,
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
      pendingReasoning: null,
      // When a new situation starts, AI will need to decide after NPCs speak
      aiDeciding: false,
    }),

  handleSceneEvent: (event) =>
    set((state) => {
      const isCoordinator = event.speaker === "coordinator";
      const lastNpcSpeaker = isCoordinator ? state.lastNpcSpeaker : event.speaker;

      // Coordinator arriving means AI is done deciding
      // NPC events do NOT set aiDeciding — that happens when queue drains
      const updates: Partial<GameState> = {
        lastNpcSpeaker,
      };

      if (isCoordinator) {
        updates.aiDeciding = false;
        // Store reasoning as pending — MonologueViewer will reveal after delay
        if (event.reasoning) {
          updates.pendingReasoning = event.reasoning;
          updates.currentReasoning = null;
        }
      }

      if (INCIDENT_ACTIONS.has(event.action)) {
        const actionLabel = event.action === "detain" ? "DETAINED"
          : event.action === "issue_warning" ? "WARNING"
          : "LOGGED";
        const target = event.target ? ` ${event.target.toUpperCase()}` : "";
        const entry = `[${event.situation}] ${actionLabel}${target}`;
        updates.incidentEntries = [...state.incidentEntries, entry];
      }

      // If nothing is currently displaying, put directly into sceneEvents
      // Otherwise queue it for later
      if (state.sceneEvents.length === 0 && state.eventQueue.length === 0 && !state.waitingForClick) {
        updates.sceneEvents = [...state.sceneEvents, event];
      } else {
        updates.eventQueue = [...state.eventQueue, event];
      }

      return updates;
    }),

  advanceDialogue: () =>
    set((state) => {
      if (!state.waitingForClick) return state;
      if (state.eventQueue.length === 0) {
        // Nothing queued — check if last displayed event was NPC → AI should decide
        const lastEvent = state.sceneEvents[state.sceneEvents.length - 1];
        const lastWasNpc = lastEvent && lastEvent.speaker !== "coordinator" && lastEvent.speaker !== "narrator";
        return {
          waitingForClick: false,
          aiDeciding: lastWasNpc ? true : state.aiDeciding,
        };
      }
      // Take next event from queue and push into sceneEvents
      const [next, ...rest] = state.eventQueue;
      return {
        waitingForClick: false,
        sceneEvents: [...state.sceneEvents, next],
        eventQueue: rest,
      };
    }),

  setWaitingForClick: (waiting) => set({ waitingForClick: waiting }),

  revealReasoning: () =>
    set((state) => ({
      currentReasoning: state.pendingReasoning,
      pendingReasoning: null,
    })),

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
