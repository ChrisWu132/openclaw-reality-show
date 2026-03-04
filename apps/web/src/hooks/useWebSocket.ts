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
          break;
        case "decision_made":
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

    ws.onclose = (e) => {
      if (e.code >= 4000) {
        useGameStore.getState().setError("Connection lost");
      }
    };

    return () => ws.close();
  }, [wsUrl]);
}
