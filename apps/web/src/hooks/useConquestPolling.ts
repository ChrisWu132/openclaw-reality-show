import { useEffect, useRef } from "react";
import { useConquestStore } from "../stores/conquestStore";
import { getConquestGame } from "../services/conquest-api";

const POLL_INTERVAL = 3000;

/**
 * Polls the game state every 3s when watching a game.
 * Also opens a WebSocket for instant turn notifications.
 */
export function useConquestPolling(gameId: string | null): void {
  const setActiveGame = useConquestStore((s) => s.setActiveGame);
  const setPhase = useConquestStore((s) => s.setPhase);
  const setError = useConquestStore((s) => s.setError);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!gameId) return;

    let cancelled = false;

    async function poll() {
      try {
        const game = await getConquestGame(gameId!);
        if (cancelled) return;
        setActiveGame(game);
        if (game.status === "finished") {
          setPhase("finished");
          // Stop polling
          if (timerRef.current) clearInterval(timerRef.current);
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      }
    }

    // Initial fetch
    poll();

    // Poll interval
    timerRef.current = setInterval(poll, POLL_INTERVAL);

    // Optional WebSocket for instant updates
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/conquest/${gameId}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data);
          if (event.game) {
            setActiveGame(event.game);
          }
          if (event.type === "conquest_game_over") {
            setPhase("finished");
            if (timerRef.current) clearInterval(timerRef.current);
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // WS connection failure is fine — polling is the primary mechanism
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      ws?.close();
    };
  }, [gameId, setActiveGame, setPhase, setError]);
}
