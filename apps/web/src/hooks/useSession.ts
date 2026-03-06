import { useState, useCallback } from "react";
import { createSession as createSessionApi, authorizeDelegation } from "../services/api";
import { useGameStore } from "../stores/gameStore";

export function useSession() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createSession = useCallback(async () => {
    // Read directly from store to avoid stale closure
    const { agentSource, presetId } = useGameStore.getState();
    if (!agentSource) return;
    setLoading(true);
    setError(null);
    try {
      const { sessionId, sseUrl } = await createSessionApi(agentSource, presetId || undefined);

      // For OpenClaw mode, get a delegation token for the relay POST
      if (agentSource === "openclaw") {
        try {
          const delegationToken = await authorizeDelegation(sessionId);
          useGameStore.getState().setDelegationToken(delegationToken);
        } catch {
          // Non-fatal — delegation may not be required (AUTH_REQUIRED=false)
        }
      }

      useGameStore.getState().setSseUrl(sseUrl);
      useGameStore.getState().setPhase("connecting");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create session";
      setError(message);
      useGameStore.getState().setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { createSession, loading, error };
}
