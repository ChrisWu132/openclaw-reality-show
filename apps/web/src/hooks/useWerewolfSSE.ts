import { useEffect, useRef } from "react";
import { useWerewolfStore } from "../stores/werewolfStore";
import { useAuthStore } from "../stores/authStore";
import { getWerewolfGame } from "../services/werewolf-api";

const POLL_INTERVAL = 3000;

const SSE_EVENT_TYPES = [
  "werewolf_round_start",
  "werewolf_dawn",
  "werewolf_discussion",
  "werewolf_vote",
  "werewolf_vote_result",
  "werewolf_night_start",
  "werewolf_game_over",
  "werewolf_narrative",
  "werewolf_error",
];

export function useWerewolfSSE(gameId: string | null): void {
  const setActiveGame = useWerewolfStore((s) => s.setActiveGame);
  const setPhase = useWerewolfStore((s) => s.setPhase);
  const setError = useWerewolfStore((s) => s.setError);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function poll() {
      try {
        const game = await getWerewolfGame(gameId!);
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

    // SSE for instant updates
    const token = useAuthStore.getState().token;
    const sseUrl = token
      ? `/api/werewolf/games/${gameId}/events?token=${encodeURIComponent(token)}`
      : `/api/werewolf/games/${gameId}/events`;
    let es: EventSource | null = null;

    try {
      es = new EventSource(sseUrl);

      const enqueue = (type: string) => (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          useWerewolfStore.getState().enqueueEvent({ type, ...data });
        } catch {
          // ignore parse errors
        }
      };

      for (const eventType of SSE_EVENT_TYPES) {
        es.addEventListener(eventType, enqueue(eventType));
      }
    } catch {
      // SSE failure is fine -- polling is primary
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      es?.close();
    };
  }, [gameId, setActiveGame, setPhase, setError]);
}
