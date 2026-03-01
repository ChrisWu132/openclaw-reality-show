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
      const state = useGameStore.getState();
      if (e.code === 4004) {
        state.setError("Session not found");
      } else if (e.code === 4009) {
        state.setError("Session has already ended");
      } else if (e.code === 4500) {
        state.setError("The simulation encountered a server error and could not continue.");
      } else if (e.code !== 1000 && state.phase === "playing") {
        // Unexpected disconnect mid-session — surface it so the user isn't left staring at a frozen screen
        state.setError("Connection lost. The simulation has ended.");
      }
    };

    return () => {
      ws.close();
    };
  }, [wsUrl]);
}
