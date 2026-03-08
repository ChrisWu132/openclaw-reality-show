import { useEffect, useRef } from "react";
import { useStartupStore } from "../stores/startupStore";
import { useAuthStore } from "../stores/authStore";
import { getStartupGame } from "../services/startup-api";

const POLL_INTERVAL = 3000;

export function useStartupPolling(gameId: string | null): void {
  const setActiveGame = useStartupStore((s) => s.setActiveGame);
  const setPhase = useStartupStore((s) => s.setPhase);
  const setError = useStartupStore((s) => s.setError);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function poll() {
      try {
        const game = await getStartupGame(gameId!);
        if (cancelled) return;
        setActiveGame(game);
        if (game.status === "finished") {
          setPhase("finished");
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    // SSE for instant updates — append auth token as query param
    const token = useAuthStore.getState().token;
    const sseUrl = token
      ? `/api/startup/games/${gameId}/events?token=${encodeURIComponent(token)}`
      : `/api/startup/games/${gameId}/events`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(sseUrl);

      const enqueue = (type: string) => (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          useStartupStore.getState().enqueueEvent({ type, ...data });
        } catch {
          // ignore parse errors
        }
      };

      es.addEventListener("startup_turn_start", enqueue("startup_turn_start"));
      es.addEventListener("startup_turn_complete", enqueue("startup_turn_complete"));
      es.addEventListener("startup_game_over", enqueue("startup_game_over"));
      es.addEventListener("startup_market_event", enqueue("startup_market_event"));
      es.addEventListener("startup_agent_action", enqueue("startup_agent_action"));
      es.addEventListener("startup_narrative", enqueue("startup_narrative"));
      es.addEventListener("startup_dialogue_start", enqueue("startup_dialogue_start"));
      es.addEventListener("startup_dialogue", enqueue("startup_dialogue"));
      es.addEventListener("startup_dialogue_end", enqueue("startup_dialogue_end"));
    } catch {
      // SSE failure is fine — polling is primary
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      es?.close();
    };
  }, [gameId, setActiveGame, setPhase, setError]);
}
