import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";

export function SituationCard() {
  const situation = useGameStore((s) => s.currentSituation);
  const label = useGameStore((s) => s.situationLabel);
  const [visible, setVisible] = useState(false);
  const lastShownRef = useRef(0);

  useEffect(() => {
    if (situation === 0 || situation === lastShownRef.current) return;
    lastShownRef.current = situation;
    setVisible(true);
    const timer = setTimeout(() => setVisible(false), 2500);
    return () => clearTimeout(timer);
  }, [situation]);

  if (!visible || !label) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        background: "rgba(0, 0, 0, 0.7)",
        zIndex: 30,
        pointerEvents: "none",
        animation: "fadeIn 0.5s ease-in",
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "7px",
          color: "#4A90D9",
          letterSpacing: "0.3em",
          marginBottom: "12px",
        }}
      >
        SITUATION {situation} OF 6
      </div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "16px",
          color: "#e0e0f0",
          letterSpacing: "0.15em",
          textShadow: "0 0 20px rgba(74, 144, 217, 0.3)",
          textTransform: "uppercase",
        }}
      >
        {label}
      </div>
      <div
        style={{
          width: "60px",
          height: "2px",
          background: "linear-gradient(90deg, transparent, #4A90D9, transparent)",
          marginTop: "16px",
        }}
      />
    </div>
  );
}
