import React from "react";
import { useGameStore } from "../../stores/gameStore";

/**
 * MonologuePanel — comic-style thought bubble inside the scene.
 * Appears near the Coordinator when reasoning is available.
 * Positioned in the top-right of the scene to avoid overlapping dialogue and sprites.
 */
export function MonologuePanel() {
  const reasoning = useGameStore((s) => s.currentReasoning);

  if (!reasoning) return null;

  // Truncate long reasoning to fit the bubble
  const maxLen = 220;
  const text = reasoning.length > maxLen
    ? reasoning.slice(0, maxLen) + "..."
    : reasoning;

  return (
    <div
      style={{
        position: "absolute",
        right: "16px",
        bottom: "80px",
        maxWidth: "300px",
        zIndex: 18,
        animation: "fadeIn 0.5s ease-in",
        pointerEvents: "none",
      }}
    >
      {/* Thought bubble */}
      <div
        style={{
          background: "rgba(8, 8, 20, 0.92)",
          border: "1px solid rgba(74, 144, 217, 0.3)",
          borderRadius: "12px",
          padding: "10px 14px",
          position: "relative",
          boxShadow: "0 0 20px rgba(74, 144, 217, 0.08), inset 0 0 15px rgba(74, 144, 217, 0.03)",
        }}
      >
        {/* Header */}
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "6px",
            color: "#d94a4a",
            letterSpacing: "0.15em",
            marginBottom: "6px",
            opacity: 0.8,
          }}
        >
          INNER MONOLOGUE
        </div>

        {/* Reasoning text */}
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "11px",
            color: "#b0b0cc",
            lineHeight: "1.6",
            fontStyle: "italic",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {text}
        </div>
      </div>

      {/* Thought bubble tail — small circles trailing down-left toward Coordinator */}
      <div
        style={{
          position: "relative",
          marginLeft: "30px",
        }}
      >
        <div
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "rgba(8, 8, 20, 0.85)",
            border: "1px solid rgba(74, 144, 217, 0.25)",
            marginTop: "4px",
            marginLeft: "0px",
          }}
        />
        <div
          style={{
            width: "5px",
            height: "5px",
            borderRadius: "50%",
            background: "rgba(8, 8, 20, 0.75)",
            border: "1px solid rgba(74, 144, 217, 0.2)",
            marginTop: "3px",
            marginLeft: "-6px",
          }}
        />
      </div>
    </div>
  );
}
