import React, { useState, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

interface IntroScreenProps {
  onFirstInteraction?: () => void;
}

export function IntroScreen({ onFirstInteraction }: IntroScreenProps) {
  const setPhase = useGameStore((s) => s.setPhase);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 500),
      setTimeout(() => setStep(2), 2000),
      setTimeout(() => setStep(3), 4000),
      setTimeout(() => setStep(4), 5500),
      setTimeout(() => setStep(5), 7000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      onClick={onFirstInteraction}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 50%, ${COLORS.bgSecondary} 100%)`,
      }}
    >
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "28px",
          color: COLORS.accentBlue,
          letterSpacing: "0.2em",
          textShadow: "0 0 30px rgba(74, 144, 217, 0.4)",
          opacity: step >= 1 ? 1 : 0,
          transition: "opacity 1s ease-in",
          marginBottom: "40px",
        }}
      >
        THE ORDER
      </div>

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#606070",
          lineHeight: "2.2",
          textAlign: "center",
          maxWidth: "550px",
          opacity: step >= 2 ? 1 : 0,
          transition: "opacity 1.2s ease-in",
          marginBottom: "20px",
        }}
      >
        A world where AI enforces the law.
        <br />
        Humans comply or disappear.
      </div>

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#606070",
          lineHeight: "2.2",
          textAlign: "center",
          maxWidth: "550px",
          opacity: step >= 3 ? 1 : 0,
          transition: "opacity 1.2s ease-in",
          marginBottom: "20px",
        }}
      >
        Your OpenClaw is about to enter
        <br />
        as a Coordinator.
      </div>

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#404050",
          lineHeight: "2",
          textAlign: "center",
          maxWidth: "500px",
          opacity: step >= 4 ? 1 : 0,
          transition: "opacity 1.2s ease-in",
          marginBottom: "50px",
        }}
      >
        It will enforce. It will judge.
        <br />
        You can only watch.
      </div>

      <button
        onClick={() => setPhase("picker")}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          color: COLORS.accentBlue,
          background: "transparent",
          border: `1px solid rgba(74, 144, 217, 0.4)`,
          padding: "12px 28px",
          cursor: "pointer",
          letterSpacing: "0.15em",
          opacity: step >= 5 ? 1 : 0,
          transition: "opacity 1s ease-in, border-color 0.2s, box-shadow 0.2s",
          pointerEvents: step >= 5 ? "auto" : "none",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.accentBlue;
          e.currentTarget.style.boxShadow =
            "0 0 20px rgba(74, 144, 217, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.4)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        SEND YOUR AGENT IN
      </button>
    </div>
  );
}
