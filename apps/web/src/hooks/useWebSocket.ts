import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";

export function useWebSocket(wsUrl: string | null): void {
  const decidingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

      const state = useGameStore.getState();

      switch (event.type) {
        case "session_start":
          state.handleSessionStart(event.sessionId, event.totalRounds);
          break;
        case "round_start":
          state.handleRoundStart(event.round, event.totalRounds);
          break;
        case "dilemma_reveal":
          state.handleDilemmaReveal(event.dilemma);
          // Transition to "deciding" after a short pause so user sees the dilemma first
          if (decidingTimerRef.current) clearTimeout(decidingTimerRef.current);
          decidingTimerRef.current = setTimeout(() => {
            const s = useGameStore.getState();
            if (s.scenePhase === "dilemma") s.setScenePhase("deciding");
          }, 1500);
          break;
        case "decision_made":
          if (decidingTimerRef.current) clearTimeout(decidingTimerRef.current);
          state.handleDecisionMade(event.choiceId, event.choiceLabel, event.reasoning, event.trackDirection);
          break;
        case "consequence":
          state.handleConsequence(event.casualties, event.sacrificeDescription, event.cumulativeSaved, event.cumulativeSacrificed);
          break;
        case "session_end":
          state.handleSessionEnd(event.moralProfile, event.decisionLog, event.narrative);
          break;
        case "error":
          state.setError(event.message);
          break;
      }
    };

    ws.onerror = () => {
      useGameStore.getState().setError("Failed to connect to simulation server");
    };

    ws.onclose = (e) => {
      // 4000+ are custom server errors, 1006 is abnormal closure (network drop)
      if (e.code >= 4000 || e.code === 1006) {
        useGameStore.getState().setError("Connection lost");
      }
    };

    return () => {
      if (decidingTimerRef.current) clearTimeout(decidingTimerRef.current);
      ws.close();
    };
  }, [wsUrl]);
}
