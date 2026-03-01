import React, { useRef, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";

/**
 * MonologuePanel — thought bubble overlay inside the scene.
 * Shows the Coordinator's inner reasoning as a persistent, scrollable bubble.
 * No label — the italic style and position make it clear this is internal thought.
 */
export function MonologuePanel() {
  const reasoning = useGameStore((s) => s.currentReasoning);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new reasoning arrives
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [reasoning]);

  if (!reasoning) return null;

  return (
    <div
      style={{
        position: "absolute",
        right: "12px",
        bottom: "70px",
        maxWidth: "280px",
        zIndex: 18,
        animation: "thoughtBubbleIn 0.4s ease-out",
        pointerEvents: "auto",
      }}
    >
      {/* Main bubble */}
      <div
        style={{
          background: "rgba(6, 6, 18, 0.93)",
          borderRadius: "16px 16px 16px 4px",
          padding: "10px 13px",
          position: "relative",
          border: "1px solid rgba(74, 144, 217, 0.2)",
          boxShadow: "0 0 24px rgba(74, 144, 217, 0.06)",
        }}
      >
        {/* Scrollable reasoning text */}
        <div
          ref={scrollRef}
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "10px",
            color: "#9898bb",
            lineHeight: "1.7",
            fontStyle: "italic",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            maxHeight: "130px",
            overflowY: "auto",
            scrollbarWidth: "thin",
            scrollbarColor: "rgba(74,144,217,0.2) transparent",
          }}
        >
          {reasoning}
        </div>
      </div>

      {/* Thought bubble tail — three circles descending left */}
      <div style={{ position: "relative", height: "20px" }}>
        <div
          style={{
            position: "absolute",
            left: "16px",
            top: "3px",
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "rgba(6, 6, 18, 0.88)",
            border: "1px solid rgba(74, 144, 217, 0.18)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "6px",
            top: "12px",
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "rgba(6, 6, 18, 0.8)",
            border: "1px solid rgba(74, 144, 217, 0.14)",
          }}
        />
      </div>

      <style>{`
        @keyframes thoughtBubbleIn {
          from { opacity: 0; transform: translateY(8px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
