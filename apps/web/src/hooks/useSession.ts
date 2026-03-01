import { useState, useCallback } from "react";
import { createSession as createSessionApi, createAgentFromMemory } from "../services/api";
import { useGameStore } from "../stores/gameStore";

export type SessionLoadingStage = "synthesizing" | "connecting" | null;

export function useSession() {
  const [loadingStage, setLoadingStage] = useState<SessionLoadingStage>(null);
  const [error, setError] = useState<string | null>(null);

  const setPhase = useGameStore((s) => s.setPhase);
  const setWsUrl = useGameStore((s) => s.setWsUrl);
  const setStoreError = useGameStore((s) => s.setError);

  const createSession = useCallback(
    async (scenarioId: string) => {
      setLoadingStage("synthesizing");
      setError(null);

      try {
        // Step 1: synthesize agent from Claude memory (~15-30s)
        const { agentId } = await createAgentFromMemory();

        // Step 2: create the session with the memory-derived agentId
        setLoadingStage("connecting");
        const { wsUrl } = await createSessionApi(scenarioId, agentId);
        setWsUrl(wsUrl);
        setPhase("connecting");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create session";
        setError(message);
        setStoreError(message);
      } finally {
        setLoadingStage(null);
      }
    },
    [setPhase, setWsUrl, setStoreError],
  );

  const loading = loadingStage !== null;

  return { createSession, loading, loadingStage, error };
}
