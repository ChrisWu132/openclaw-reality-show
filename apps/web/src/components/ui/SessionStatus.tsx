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
          width: "5px",
          height: "5px",
          borderRadius: "50%",
          margin: "0 1px",
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
        padding: "4px 6px",
        background: "rgba(0, 0, 0, 0.6)",
        border: "1px solid rgba(74, 144, 217, 0.1)",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "6px",
        color: "#505060",
        zIndex: 10,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "6px",
      }}
    >
      <div>CYCLE {currentSituation}/{totalSituations}</div>
      <div style={{ display: "flex", alignItems: "center" }}>
        {dots}
      </div>
    </div>
  );
}
