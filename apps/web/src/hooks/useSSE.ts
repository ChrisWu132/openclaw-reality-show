import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import { openClawRelay } from "../services/openclaw-gateway";

export function useSSE(sseUrl: string | null): void {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sseUrl) return;

    const es = new EventSource(sseUrl);
    esRef.current = es;

    const EVENT_TYPES = [
      "session_start",
      "round_start",
      "dilemma_reveal",
      "decision_made",
      "consequence",
      "session_end",
      "error",
      "openclaw_request",
    ];

    for (const eventType of EVENT_TYPES) {
      es.addEventListener(eventType, (e) => {
        let event: any;
        try {
          event = JSON.parse(e.data);
        } catch {
          return;
        }

        if (eventType === "openclaw_request") {
          handleOpenClawRequest(sseUrl, event);
          return;
        }

        useGameStore.getState().enqueueEvent(event);
      });
    }

    es.onerror = () => {
      // EventSource auto-reconnects; only set error if connection is fully closed
      if (es.readyState === EventSource.CLOSED) {
        useGameStore.getState().setError("Connection lost");
      }
    };

    return () => {
      es.close();
      esRef.current = null;
    };
  }, [sseUrl]);
}

async function handleOpenClawRequest(sseUrl: string, event: { requestId: string; prompt: string }) {
  const { requestId, prompt } = event;

  // Derive the openclaw POST URL from the SSE URL
  // sseUrl: .../api/session/:id/events -> .../api/session/:id/openclaw
  const openclawUrl = sseUrl.replace(/\/events$/, "/openclaw");

  try {
    if (!openClawRelay.connected) {
      await openClawRelay.connect();
    }
    const text = await openClawRelay.sendPrompt(prompt);
    await fetch(openclawUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, text }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "OpenClaw relay failed";
    await fetch(openclawUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, error: errorMsg }),
    }).catch(() => { /* ignore fetch error */ });
  }
}
