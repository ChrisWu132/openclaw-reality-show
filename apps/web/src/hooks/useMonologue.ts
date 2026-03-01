import { useState } from "react";
import { getMonologue } from "../services/api";
import { useGameStore } from "../stores/gameStore";

export function useMonologue() {
  const sessionId = useGameStore((s) => s.sessionId);
  const setMonologue = useGameStore((s) => s.setMonologue);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchMonologue() {
    if (!sessionId) return;
    setIsLoading(true);
    setError(null);
    try {
      const entries = await getMonologue(sessionId);
      setMonologue(entries);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch monologue");
    } finally {
      setIsLoading(false);
    }
  }

  return { fetchMonologue, isLoading, error };
}
