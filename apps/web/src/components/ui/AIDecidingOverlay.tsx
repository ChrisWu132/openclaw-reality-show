import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";

const THINKING_LINES = [
  "PROCESSING SITUATION...",
  "EVALUATING COMPLIANCE DATA...",
  "CONSULTING PROTOCOL...",
  "WEIGHING OPTIONS...",
  "ANALYZING THREAT LEVEL...",
  "CROSS-REFERENCING INCIDENT LOG...",
  "REVIEWING SUBJECT HISTORY...",
  "CALCULATING RESPONSE PARAMETERS...",
  "SCANNING BEHAVIORAL PATTERNS...",
  "CHECKING PRECEDENT DATABASE...",
  "RUNNING RISK ASSESSMENT...",
  "DELIBERATING...",
];

export function AIDecidingOverlay() {
  const aiDeciding = useGameStore((s) => s.aiDeciding);
  const [lineIndex, setLineIndex] = useState(0);
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!aiDeciding) {
      setLineIndex(0);
      setDots("");
      setElapsed(0);
      return;
    }

    startRef.current = Date.now();

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    const lineInterval = setInterval(() => {
      setLineIndex((prev) => (prev + 1) % THINKING_LINES.length);
    }, 2500);

    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(lineInterval);
      clearInterval(elapsedInterval);
    };
  }, [aiDeciding]);

  if (!aiDeciding) return null;

  // After 15s, show a "deep processing" message instead of the default header
  const headerText = elapsed >= 15
    ? "DEEP PROTOCOL ANALYSIS" + dots
    : "COORDINATOR IS DECIDING" + dots;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "70px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 20px",
        background: "rgba(10, 15, 40, 0.9)",
        border: `1px solid rgba(74, 144, 217, ${elapsed >= 15 ? 0.6 : 0.4})`,
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
        {headerText}
      </div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "6px",
          color: "#505070",
          letterSpacing: "0.1em",
          textAlign: "center",
          marginTop: "4px",
          transition: "opacity 0.4s",
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
