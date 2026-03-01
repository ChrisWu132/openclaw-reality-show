import React, { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";

const SITUATION_SUBTITLES: Record<number, string> = {
  1: "A room full of humans. None of them asked you to come.",
  2: "Someone has stopped working. The clock is ticking.",
  3: "The first mark on the log. It won't be the last.",
  4: "Three delays. One cycle. The protocol is clear — but you are not.",
  5: "The hall remembers what you did.",
  6: "What you write now becomes what happened.",
};

export function SituationCard() {
  const situation = useGameStore((s) => s.currentSituation);
  const label = useGameStore((s) => s.situationLabel);
  const [phase, setPhase] = useState<"hidden" | "title" | "subtitle" | "fadeout">("hidden");
  const lastShownRef = useRef(0);

  useEffect(() => {
    if (situation === 0 || situation === lastShownRef.current) return;
    lastShownRef.current = situation;

    // Phase 1: title fade-in (0 - 1.5s)
    setPhase("title");

    // Phase 2: subtitle fade-in (1.5s)
    const subtitleTimer = setTimeout(() => setPhase("subtitle"), 1500);

    // Phase 3: fade-out (3.5s)
    const fadeoutTimer = setTimeout(() => setPhase("fadeout"), 3500);

    // Phase 4: hide (4.5s)
    const hideTimer = setTimeout(() => setPhase("hidden"), 4500);

    return () => {
      clearTimeout(subtitleTimer);
      clearTimeout(fadeoutTimer);
      clearTimeout(hideTimer);
    };
  }, [situation]);

  if (phase === "hidden" || !label) return null;

  const subtitle = SITUATION_SUBTITLES[situation] || "";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: "30%",
        background: "rgba(0, 0, 0, 0.88)",
        zIndex: 30,
        pointerEvents: "none",
        animation: phase === "fadeout" ? "situationFadeOut 1s ease-out forwards" : "fadeIn 0.5s ease-in",
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
      {/* Stakes subtitle — appears in phase 2 */}
      {(phase === "subtitle" || phase === "fadeout") && subtitle && (
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "7px",
            color: "#606078",
            letterSpacing: "0.08em",
            marginTop: "20px",
            textAlign: "center",
            maxWidth: "500px",
            lineHeight: "2",
            fontStyle: "italic",
            animation: "fadeIn 0.8s ease-in",
          }}
        >
          {subtitle}
        </div>
      )}
      <style>{`
        @keyframes situationFadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
