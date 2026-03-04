import { useEffect } from "react";
import { useGameStore } from "../stores/gameStore";

export function useWebSocket(wsUrl: string | null): void {
  useEffect(() => {
    if (!wsUrl) return;

    const ws = new WebSocket(wsUrl);

    ws.onmessage = (msg) => {
      let event: any;
      try {
        event = JSON.parse(msg.data);
      } catch {
        return;
      }
      // Push every event into the queue — click-to-advance handles pacing
      useGameStore.getState().enqueueEvent(event);
    };

    ws.onerror = () => {
      useGameStore.getState().setError("Failed to connect to simulation server");
    };

    ws.onclose = (e) => {
      if (e.code >= 4000 || e.code === 1006) {
        useGameStore.getState().setError("Connection lost");
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);
}
