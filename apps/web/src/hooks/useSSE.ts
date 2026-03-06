import { useEffect, useRef } from "react";
import { useGameStore } from "../stores/gameStore";
import { useAuthStore } from "../stores/authStore";
import { openClawRelay } from "../services/openclaw-gateway";

export function useSSE(sseUrl: string | null): void {
  const esRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!sseUrl) return;

    // Append user JWT as query param for SSE auth
    const token = useAuthStore.getState().token;
    const url = token ? `${sseUrl}?token=${encodeURIComponent(token)}` : sseUrl;

    const es = new EventSource(url);
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

  // Build headers — include delegation token if available
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const delegationToken = useGameStore.getState().delegationToken;
  if (delegationToken) {
    headers["Authorization"] = `Bearer ${delegationToken}`;
  }

  try {
    if (!openClawRelay.connected) {
      await openClawRelay.connect();
    }
    const text = await openClawRelay.sendPrompt(prompt);
    await fetch(openclawUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ requestId, text }),
    });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : "OpenClaw relay failed";
    await fetch(openclawUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ requestId, error: errorMsg }),
    }).catch(() => { /* ignore fetch error */ });
  }
}
