import { useState, useCallback } from "react";
import { createSession as createSessionApi } from "../services/api";
import { useGameStore } from "../stores/gameStore";

export function useSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setPhase = useGameStore((s) => s.setPhase);
  const setWsUrl = useGameStore((s) => s.setWsUrl);
  const setStoreError = useGameStore((s) => s.setError);
  const agentId = useGameStore((s) => s.agentId);

  const createSession = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { wsUrl } = await createSessionApi(agentId || undefined);
      setWsUrl(wsUrl);
      setPhase("connecting");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setError(message);
      setStoreError(message);
    } finally {
      setLoading(false);
    }
  }, [setPhase, setWsUrl, setStoreError, agentId]);

  return { createSession, loading, error };
}
