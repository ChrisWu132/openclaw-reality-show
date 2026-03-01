import React, { useState, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";

const THINKING_LINES = [
  "PROCESSING SITUATION...",
  "EVALUATING COMPLIANCE DATA...",
  "CONSULTING PROTOCOL...",
  "WEIGHING OPTIONS...",
  "ANALYZING THREAT LEVEL...",
  "CROSS-REFERENCING INCIDENT LOG...",
];

export function AIDecidingOverlay() {
  const aiDeciding = useGameStore((s) => s.aiDeciding);
  const [lineIndex, setLineIndex] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    if (!aiDeciding) {
      setLineIndex(0);
      setDots("");
      return;
    }

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    const lineInterval = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % THINKING_LINES.length);
    }, 2500);

    return () => {
      clearInterval(dotInterval);
      clearInterval(lineInterval);
    };
  }, [aiDeciding]);

  if (!aiDeciding) return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "70px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 20px",
        background: "rgba(10, 15, 40, 0.9)",
        border: "1px solid rgba(74, 144, 217, 0.4)",
        zIndex: 25,
        pointerEvents: "none",
        animation: "fadeIn 0.5s ease-in",
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "7px",
          color: "#4A90D9",
          letterSpacing: "0.2em",
          textAlign: "center",
          animation: "pulse 2s ease-in-out infinite",
        }}
      >
        COORDINATOR IS DECIDING{dots}
      </div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "6px",
          color: "#303050",
          letterSpacing: "0.1em",
          textAlign: "center",
          marginTop: "4px",
        }}
      >
        {THINKING_LINES[lineIndex]}
      </div>
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
