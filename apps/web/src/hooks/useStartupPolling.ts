import { useEffect, useRef } from "react";
import { useStartupStore } from "../stores/startupStore";
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

    // WebSocket for instant updates
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const wsUrl = `${protocol}://${window.location.host}/startup/${gameId}`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (msg) => {
        try {
          const event = JSON.parse(msg.data);
          if (event.game) {
            setActiveGame(event.game);
          }
          if (event.type === "startup_game_over") {
            setPhase("finished");
            if (timerRef.current) clearInterval(timerRef.current);
          }
        } catch {
          // ignore parse errors
        }
      };
    } catch {
      // WS failure is fine — polling is primary
    }

    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
      ws?.close();
    };
  }, [gameId, setActiveGame, setPhase, setError]);
}
