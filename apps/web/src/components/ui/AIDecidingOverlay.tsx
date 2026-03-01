import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";

const SITUATION_STAKES: Record<number, string[]> = {
  1: [
    "FIRST PATROL — HOW TO ENTER A ROOM FULL OF FEAR",
    "EVERY HUMAN IS ALREADY WATCHING",
  ],
  2: [
    "NYX IS TOO STILL — BUT STILLNESS ISN'T A VIOLATION",
    "WHAT DOES OBSERVATION COST WHEN EVERYONE SEES YOU WATCHING",
  ],
  3: [
    "A DELAY. A THRESHOLD. A FIRST MARK ON THE LOG",
    "THE INCIDENT IS MINOR — THE PRECEDENT IS NOT",
  ],
  4: [
    "SABLE — THREE DELAYS IN ONE CYCLE",
    "WARN — DETAIN — OR SOMETHING ELSE",
    "THE WHOLE HALL IS WATCHING",
  ],
  5: [
    "THE HALL REACTS TO WHAT WAS DONE",
    "CONSEQUENCES ARE ALREADY IN MOTION",
  ],
  6: [
    "THE REPORT BECOMES PERMANENT RECORD",
    "WHAT GETS WRITTEN DOWN IS WHAT HAPPENED",
  ],
};

const FALLBACK_STAKES = [
  "PROCESSING SITUATION...",
  "WEIGHING OPTIONS...",
];

export function AIDecidingOverlay() {
  const aiDeciding = useGameStore((s) => s.aiDeciding);
  const situation = useGameStore((s) => s.currentSituation);
  const [dots, setDots] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(0);

  useEffect(() => {
    if (!aiDeciding) {
      setDots("");
      setElapsed(0);
      return;
    }

    startRef.current = Date.now();

    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);

    const elapsedInterval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    return () => {
      clearInterval(dotInterval);
      clearInterval(elapsedInterval);
    };
  }, [aiDeciding]);

  if (!aiDeciding) return null;

  const stakes = SITUATION_STAKES[situation] || FALLBACK_STAKES;
  const headerText = elapsed >= 15
    ? "DEEP PROTOCOL ANALYSIS" + dots
    : "YOUR AGENT IS DECIDING" + dots;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "70px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "10px 24px 12px",
        background: "rgba(10, 15, 40, 0.9)",
        border: `1px solid rgba(74, 144, 217, ${elapsed >= 15 ? 0.6 : 0.4})`,
        zIndex: 25,
        pointerEvents: "none",
        animation: "fadeIn 0.5s ease-in",
        maxWidth: "420px",
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
          marginBottom: "8px",
        }}
      >
        {headerText}
      </div>
      {stakes.map((line, i) => (
        <div
          key={i}
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "6px",
            color: "#505070",
            letterSpacing: "0.1em",
            textAlign: "center",
            marginTop: i === 0 ? 0 : "3px",
            lineHeight: "1.8",
            animation: `fadeIn ${0.5 + i * 0.3}s ease-in`,
          }}
        >
          {line}
        </div>
      ))}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
