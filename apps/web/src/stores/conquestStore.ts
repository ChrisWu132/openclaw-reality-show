import { create } from "zustand";
import type { ConquestGame, HexCoord } from "@openclaw/shared";

export type ConquestPhase = "lobby" | "watching" | "finished";

interface ConquestState {
  phase: ConquestPhase;
  games: ConquestGame[];
  activeGame: ConquestGame | null;
  selectedHex: HexCoord | null;
  error: string | null;

  // Actions
  setPhase: (phase: ConquestPhase) => void;
  setGames: (games: ConquestGame[]) => void;
  setActiveGame: (game: ConquestGame | null) => void;
  setSelectedHex: (hex: HexCoord | null) => void;
  setError: (error: string | null) => void;
  reset: () => void;
}

const initialState = {
  phase: "lobby" as ConquestPhase,
  games: [] as ConquestGame[],
  activeGame: null as ConquestGame | null,
  selectedHex: null as HexCoord | null,
  error: null as string | null,
};

export const useConquestStore = create<ConquestState>((set) => ({
  ...initialState,

  setPhase: (phase) => set({ phase }),
  setGames: (games) => set({ games }),
  setActiveGame: (game) => set({ activeGame: game }),
  setSelectedHex: (hex) => set({ selectedHex: hex }),
  setError: (error) => set({ error }),
  reset: () => set({ ...initialState }),
}));
