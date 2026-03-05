import { create } from "zustand";
import type { StartupGame } from "@openclaw/shared";

export type StartupPhase = "lobby" | "watching" | "finished";

interface StartupState {
  phase: StartupPhase;
  games: StartupGame[];
  activeGame: StartupGame | null;
  error: string | null;

  setPhase: (phase: StartupPhase) => void;
  setGames: (games: StartupGame[]) => void;
  setActiveGame: (game: StartupGame | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  phase: "lobby" as StartupPhase,
  games: [] as StartupGame[],
  activeGame: null as StartupGame | null,
  error: null as string | null,
};

export const useStartupStore = create<StartupState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setGames: (games) => set({ games }),
  setActiveGame: (game) => set({ activeGame: game }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
