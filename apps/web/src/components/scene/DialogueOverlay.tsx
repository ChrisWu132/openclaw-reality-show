import React, { useEffect, useRef } from "react";
import { useDialogueStream } from "../../hooks/useDialogueStream";
import { useGameStore } from "../../stores/gameStore";

const SPEAKER_COLORS: Record<string, string> = {
  coordinator: "#4A90D9",
  nyx: "#7A8B7A",
  sable: "#D4A574",
  calla: "#B8B8B8",
  eli: "#8CB4D4",
  monitor: "#2C6B6B",
  narrator: "#606080",
};

const SPEAKER_LABELS: Record<string, string> = {
  coordinator: "COORDINATOR",
  nyx: "NYX [23-P]",
  sable: "SABLE [31-R]",
  calla: "CALLA [08-B]",
  eli: "ELI [17-C]",
  monitor: "MONITOR UNIT",
  narrator: "",
};

// Actions that should NOT be shown as dialogue to the spectator
const HIDDEN_ACTIONS = new Set([
  "patrol_move",
  "access_terminal",
]);

// Actions whose dialogue represents system/meta info that should be shown differently
const SYSTEM_ACTIONS = new Set([
  "observe",
  "silence",
]);

export function DialogueOverlay() {
  const { displayText, isStreaming, doneStreaming, speaker, action, streamDialogue } =
    useDialogueStream();
  const sceneEvents = useGameStore((s) => s.sceneEvents);
  const queueLength = useGameStore((s) => s.eventQueue.length);
  const lastProcessedRef = useRef(0);

  useEffect(() => {
    if (sceneEvents.length > lastProcessedRef.current) {
      const latest = sceneEvents[sceneEvents.length - 1];
      lastProcessedRef.current = sceneEvents.length;

      // Skip events with no dialogue or hidden action types
      if (!latest.dialogue || HIDDEN_ACTIONS.has(latest.action)) {
        // Non-displayable event popped from queue — if more events are waiting,
        // auto-advance so the queue doesn't deadlock (waitingForClick stays false
        // and the click overlay is invisible, so the user cannot manually advance).
        setTimeout(() => {
          const { eventQueue, forceDequeueNext } = useGameStore.getState();
          if (eventQueue.length > 0) {
            forceDequeueNext();
          }
        }, 300);
        return;
      }

      streamDialogue(latest.speaker, latest.dialogue, latest.action, latest.audioUrl);
    }
  }, [sceneEvents, streamDialogue]);

  if (!displayText || !speaker) return null;

  const isNarrator = speaker === "narrator";
  const isCoordinator = speaker === "coordinator";
  const isMonitor = speaker === "monitor";
  const isSystemAction = action && SYSTEM_ACTIONS.has(action);
  const color = SPEAKER_COLORS[speaker] || "#e8e8e0";
  const label = SPEAKER_LABELS[speaker] ?? speaker.toUpperCase();

  // Narrator gets a cinematic bar at the bottom
  if (isNarrator) {
    return (
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "12px 24px 16px",
          background: "linear-gradient(transparent 0%, rgba(0, 0, 0, 0.85) 40%)",
          zIndex: 20,
          pointerEvents: "none",
          animation: "fadeIn 0.3s ease-in",
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "9px",
            color: "#808090",
            lineHeight: "2",
            textAlign: "center",
            fontStyle: "italic",
            maxWidth: "700px",
            margin: "0 auto",
            maxHeight: "54px",
            overflow: "hidden",
          }}
        >
          {displayText}
          {isStreaming && <BlinkingCursor color="#808090" />}
          {doneStreaming && <AdvanceIndicator color="#808090" remaining={queueLength} />}
        </div>
      </div>
    );
  }

  // Coordinator gets a cold, authoritative box
  if (isCoordinator) {
    return (
      <div
        style={{
          position: "absolute",
          top: "60px",
          left: "50%",
          transform: "translateX(-50%)",
          maxWidth: "75%",
          padding: "10px 18px",
          background: "rgba(10, 15, 40, 0.95)",
          border: `1px solid ${color}`,
          borderLeft: `3px solid ${color}`,
          boxShadow: `0 0 15px rgba(74, 144, 217, 0.15), inset 0 0 30px rgba(74, 144, 217, 0.03)`,
          zIndex: 20,
          pointerEvents: "none",
          animation: "fadeIn 0.3s ease-in",
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "7px",
            color,
            marginBottom: "8px",
            letterSpacing: "0.15em",
          }}
        >
          {label}
          {action && !isSystemAction && (
            <span style={{ color: "#505070", marginLeft: "12px", fontSize: "6px" }}>
              [{action.replace(/_/g, " ").toUpperCase()}]
            </span>
          )}
        </div>
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "9px",
            color: "#d0d0e0",
            lineHeight: "1.8",
            whiteSpace: "pre-wrap",
          }}
        >
          {isSystemAction ? (
            <span style={{ fontStyle: "italic", color: "#707090" }}>{displayText}</span>
          ) : (
            displayText
          )}
          {isStreaming && <BlinkingCursor color="#d0d0e0" />}
          {doneStreaming && <AdvanceIndicator color={color} remaining={queueLength} />}
        </div>
      </div>
    );
  }

  // Monitor — data terminal projection, right-upper corner
  if (isMonitor) {
    return (
      <div
        style={{
          position: "absolute",
          top: "40px",
          right: "12px",
          maxWidth: "260px",
          padding: "8px 14px 10px",
          background: "rgba(8, 20, 20, 0.94)",
          borderTop: "2px solid #2C6B6B",
          border: "1px solid rgba(44, 107, 107, 0.3)",
          zIndex: 20,
          pointerEvents: "none",
          animation: "fadeIn 0.3s ease-in",
        }}
      >
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "6px",
            color: "#2C6B6B",
            marginBottom: "6px",
            letterSpacing: "0.15em",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{label}</span>
          <span style={{ fontSize: "5px", color: "#3a8a8a", letterSpacing: "0.05em" }}>
            ▪ LIVE
          </span>
        </div>
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "9px",
            color: "#5a9a9a",
            lineHeight: "1.8",
            whiteSpace: "pre-wrap",
          }}
        >
          {displayText}
          {isStreaming && <BlinkingCursor color="#5a9a9a" />}
          {doneStreaming && <AdvanceIndicator color="#2C6B6B" remaining={queueLength} />}
        </div>
      </div>
    );
  }

  // Human characters — speech bubbles near top
  return (
    <div
      style={{
        position: "absolute",
        top: "40px",
        left: "50%",
        transform: "translateX(-50%)",
        maxWidth: "70%",
        padding: "10px 16px",
        background: "rgba(0, 0, 0, 0.9)",
        border: "1px solid rgba(255, 255, 255, 0.08)",
        borderLeft: `3px solid ${color}`,
        zIndex: 20,
        pointerEvents: "none",
        animation: "fadeIn 0.3s ease-in",
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "7px",
          color,
          marginBottom: "6px",
          letterSpacing: "0.1em",
        }}
      >
        {label}
        {action && (
          <span style={{ color: "#404050", marginLeft: "10px", fontSize: "6px" }}>
            [{action.replace(/_/g, " ").toUpperCase()}]
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#c0c0c0",
          lineHeight: "1.8",
          whiteSpace: "pre-wrap",
        }}
      >
        {displayText}
        {isStreaming && <BlinkingCursor color="#c0c0c0" />}
        {doneStreaming && <AdvanceIndicator color={color} remaining={queueLength} />}
      </div>
    </div>
  );
}

function BlinkingCursor({ color }: { color: string }) {
  return (
    <>
      <span
        style={{
          display: "inline-block",
          width: "6px",
          height: "9px",
          background: color,
          marginLeft: "2px",
          animation: "blink 0.6s step-end infinite",
          verticalAlign: "middle",
        }}
      />
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
}

/** Blinking ▸ triangle shown after typewriter completes — signals "click to continue" */
function AdvanceIndicator({ color, remaining }: { color: string; remaining: number }) {
  // Show dots for remaining queued events (max 3 dots)
  const dotCount = Math.min(remaining, 3);
  const dots = dotCount > 0 ? " " + "·".repeat(dotCount) : "";

  return (
    <>
      <span
        style={{
          display: "inline-block",
          marginLeft: "6px",
          fontSize: "10px",
          color,
          animation: "blink 0.8s step-end infinite",
          verticalAlign: "middle",
          userSelect: "none",
        }}
      >
        ▸
      </span>
      {dots && (
        <span
          style={{
            fontSize: "10px",
            color,
            opacity: 0.35,
            verticalAlign: "middle",
            userSelect: "none",
            letterSpacing: "2px",
          }}
        >
          {dots}
        </span>
      )}
      <style>{`
        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>
    </>
  );
}
