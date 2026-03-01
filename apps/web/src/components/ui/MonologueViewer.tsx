import React from "react";
import { useGameStore } from "../../stores/gameStore";

/**
 * MonologuePanel — inline split-screen panel shown below the scene during play.
 * Displays the Coordinator's inner monologue (reasoning) for the current situation.
 * Replaces the old full-screen post-game step-through viewer.
 */
export function MonologuePanel() {
  const reasoning = useGameStore((s) => s.currentReasoning);

  if (!reasoning) return null;

  return (
    <div
      style={{
        background: "rgba(3, 3, 8, 0.95)",
        borderTop: "1px solid rgba(74, 144, 217, 0.15)",
        padding: "16px 24px",
        animation: "fadeIn 0.6s ease-in",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "14px" }}>&#128173;</span>
        <span
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "7px",
            color: "#d94a4a",
            letterSpacing: "0.2em",
          }}
        >
          INNER MONOLOGUE
        </span>
      </div>

      {/* Reasoning text */}
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "13px",
          color: "#c0c0d0",
          lineHeight: "1.8",
          padding: "12px 16px",
          background: "rgba(74, 144, 217, 0.03)",
          borderLeft: "3px solid rgba(74, 144, 217, 0.3)",
          whiteSpace: "pre-wrap",
          maxHeight: "120px",
          overflowY: "auto",
        }}
      >
        {reasoning}
      </div>
    </div>
  );
}
