import { create } from "zustand";
import type {
  WerewolfGame,
  WerewolfAgentConfig,
  DiscussionStatement,
  VoteAction,
  WerewolfRole,
} from "@openclaw/shared";

export type WerewolfViewPhase = "lobby" | "watching" | "finished";

interface WerewolfSSEEvent {
  type: string;
  [key: string]: unknown;
}

const PAUSE_EVENTS = new Set([
  "werewolf_dawn",
  "werewolf_discussion",
  "werewolf_vote",
  "werewolf_vote_result",
  "werewolf_game_over",
]);

interface WerewolfState {
  phase: WerewolfViewPhase;
  games: WerewolfGame[];
  activeGame: WerewolfGame | null;
  error: string | null;

  // Current round state
  currentRound: number;
  currentPhaseLabel: string;
  latestStatement: DiscussionStatement | null;
  latestVote: VoteAction | null;
  latestVoteResult: {
    eliminated: string | null;
    eliminatedRole?: WerewolfRole;
    tally: Record<string, number>;
  } | null;
  latestDawn: {
    killed: string | null;
    saved: boolean;
    killedName?: string;
    killedRole?: WerewolfRole;
  } | null;
  isNight: boolean;

  // Discussion history for current round
  roundDiscussion: DiscussionStatement[];
  roundVotes: VoteAction[];

  // Event queue + click-gating
  pendingEvents: WerewolfSSEEvent[];
  waitingForClick: boolean;

  // Narrative
  narrative: string | null;

  // Agent configs for lobby
  agentConfigs: WerewolfAgentConfig[];

  setPhase: (phase: WerewolfViewPhase) => void;
  setGames: (games: WerewolfGame[]) => void;
  setActiveGame: (game: WerewolfGame | null) => void;
  setError: (error: string | null) => void;
  setNarrative: (narrative: string | null) => void;
  setAgentConfigs: (configs: WerewolfAgentConfig[]) => void;
  enqueueEvent: (event: WerewolfSSEEvent) => void;
  advanceClick: () => void;
  reset: () => void;
}

function processWerewolfEvent(event: WerewolfSSEEvent, set: (partial: Partial<WerewolfState>) => void) {
  switch (event.type) {
    case "werewolf_round_start":
      set({
        currentRound: event.round as number,
        currentPhaseLabel: "DAWN",
        latestStatement: null,
        latestVote: null,
        latestVoteResult: null,
        latestDawn: null,
        isNight: false,
        roundDiscussion: [],
        roundVotes: [],
      });
      break;
    case "werewolf_dawn":
      set({
        currentPhaseLabel: "DAWN",
        latestDawn: {
          killed: event.killed as string | null,
          saved: event.saved as boolean,
          killedName: event.killedName as string | undefined,
          killedRole: event.killedRole as WerewolfRole | undefined,
        },
        isNight: false,
      });
      break;
    case "werewolf_discussion": {
      const stmt = event.statement as DiscussionStatement;
      const prevDiscussion = useWerewolfStore.getState().roundDiscussion;
      set({
        currentPhaseLabel: `DISCUSSION (Round ${event.speakingRound}/2)`,
        latestStatement: stmt,
        roundDiscussion: [...prevDiscussion, stmt],
      });
      break;
    }
    case "werewolf_vote": {
      const vote = event.vote as VoteAction;
      const prevVotes = useWerewolfStore.getState().roundVotes;
      set({
        currentPhaseLabel: "VOTING",
        latestVote: vote,
        roundVotes: [...prevVotes, vote],
      });
      break;
    }
    case "werewolf_vote_result":
      set({
        currentPhaseLabel: event.eliminated ? "EXECUTION" : "NO ELIMINATION",
        latestVoteResult: {
          eliminated: event.eliminated as string | null,
          eliminatedRole: event.eliminatedRole as WerewolfRole | undefined,
          tally: event.tally as Record<string, number>,
        },
      });
      break;
    case "werewolf_night_start":
      set({
        currentPhaseLabel: "NIGHT",
        isNight: true,
      });
      break;
    case "werewolf_game_over":
      if (event.game) {
        set({ activeGame: event.game as WerewolfGame });
      }
      set({ phase: "finished", currentPhaseLabel: "GAME OVER" });
      break;
    case "werewolf_narrative":
      set({ narrative: event.narrative as string });
      break;
    case "werewolf_error":
      set({ error: event.message as string });
      break;
  }
}

function tryProcessNext(state: WerewolfState, set: (partial: Partial<WerewolfState>) => void) {
  if (state.waitingForClick || state.pendingEvents.length === 0) return;

  const [next, ...rest] = state.pendingEvents;
  set({ pendingEvents: rest });
  processWerewolfEvent(next, set);

  if (PAUSE_EVENTS.has(next.type)) {
    set({ waitingForClick: true });
  } else {
    const updated = useWerewolfStore.getState();
    if (!updated.waitingForClick && updated.pendingEvents.length > 0) {
      tryProcessNext(updated, set);
    }
  }
}

const initialState = {
  phase: "lobby" as WerewolfViewPhase,
  games: [] as WerewolfGame[],
  activeGame: null as WerewolfGame | null,
  error: null as string | null,
  currentRound: 0,
  currentPhaseLabel: "",
  latestStatement: null as DiscussionStatement | null,
  latestVote: null as VoteAction | null,
  latestVoteResult: null as WerewolfState["latestVoteResult"],
  latestDawn: null as WerewolfState["latestDawn"],
  isNight: false,
  roundDiscussion: [] as DiscussionStatement[],
  roundVotes: [] as VoteAction[],
  pendingEvents: [] as WerewolfSSEEvent[],
  waitingForClick: false,
  narrative: null as string | null,
  agentConfigs: [] as WerewolfAgentConfig[],
};

export const useWerewolfStore = create<WerewolfState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setGames: (games) => set({ games }),
  setActiveGame: (game) => set({ activeGame: game }),
  setError: (error) => set({ error }),
  setNarrative: (narrative) => set({ narrative }),
  setAgentConfigs: (configs) => set({ agentConfigs: configs }),

  enqueueEvent: (event) => {
    const state = useWerewolfStore.getState();
    set({ pendingEvents: [...state.pendingEvents, event] });

    if (!state.waitingForClick) {
      const next = useWerewolfStore.getState();
      tryProcessNext(next, set);
    }
  },

  advanceClick: () => {
    set({ waitingForClick: false });
    const next = useWerewolfStore.getState();
    tryProcessNext(next, set);
  },

  reset: () => set({ ...initialState }),
}));
