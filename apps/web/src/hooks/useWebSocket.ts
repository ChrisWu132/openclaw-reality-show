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
          state.handleSessionStart(event.sessionId, event.totalSituations);
          break;
        case "situation_transition":
          state.handleSituationTransition(event.to, event.location, event.label);
          break;
        case "scene_event":
          state.handleSceneEvent(event);
          break;
        case "session_end":
          state.handleSessionEnd(event.consequenceScene, event.nyxModifier);
          break;
        case "assessment_complete":
          state.handleAssessmentComplete(event.assessment);
          break;
        case "error":
          state.setError(event.message);
          break;
      }
    };

    ws.onclose = (e) => {
      if (e.code === 4004 || e.code === 4009) {
        const state = useGameStore.getState();
        state.setError(
          e.code === 4004
            ? "Session not found"
            : "Session has already ended",
        );
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);
}
