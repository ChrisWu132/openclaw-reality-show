import React from "react";
import { useGameStore } from "../../stores/gameStore";

export function SessionStatus() {
  const currentSituation = useGameStore((s) => s.currentSituation);
  const totalSituations = useGameStore((s) => s.totalSituations);

  if (currentSituation === 0) return null;

  // Progress dots
  const dots = [];
  for (let i = 1; i <= totalSituations; i++) {
    dots.push(
      <span
        key={i}
        style={{
          display: "inline-block",
          width: "6px",
          height: "6px",
          borderRadius: "50%",
          margin: "0 2px",
          background: i < currentSituation
            ? "#4A90D9"
            : i === currentSituation
              ? "#FFFFFF"
              : "#2A2A3A",
          boxShadow: i === currentSituation
            ? "0 0 6px rgba(255, 255, 255, 0.5)"
            : "none",
        }}
      />
    );
  }

  return (
    <div
      style={{
        position: "absolute",
        bottom: "50px",
        right: "8px",
        padding: "6px 10px",
        background: "rgba(0, 0, 0, 0.7)",
        border: "1px solid rgba(74, 144, 217, 0.15)",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "7px",
        color: "#606070",
        zIndex: 10,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-end",
        gap: "4px",
      }}
    >
      <div>CYCLE {currentSituation}/{totalSituations}</div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {dots}
      </div>
    </div>
  );
}
