import { useState, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function IntroScreen() {
  const setPhase = useGameStore((s) => s.setPhase);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStep(1), 600),
      setTimeout(() => setStep(2), 2200),
      setTimeout(() => setStep(3), 4200),
      setTimeout(() => setStep(4), 5800),
      setTimeout(() => setStep(5), 7200),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Vignette overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />

      {/* Scanline effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "32px",
          color: COLORS.accentRed,
          letterSpacing: "0.25em",
          textShadow: "0 0 40px rgba(217, 74, 74, 0.5), 0 0 80px rgba(217, 74, 74, 0.2)",
          opacity: step >= 1 ? 1 : 0,
          transform: step >= 1 ? "scale(1)" : "scale(1.1)",
          transition: "opacity 1.2s ease-in, transform 1.2s ease-out",
          marginBottom: "50px",
          position: "relative",
        }}
      >
        THE TROLLEY PROBLEM
      </div>

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#707080",
          lineHeight: "2.4",
          textAlign: "center",
          maxWidth: "550px",
          opacity: step >= 2 ? 1 : 0,
          transform: step >= 2 ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 1s ease-in, transform 1s ease-out",
          marginBottom: "24px",
        }}
      >
        Ten dilemmas. No right answers.
        <br />
        An AI at the lever.
      </div>

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#707080",
          lineHeight: "2.4",
          textAlign: "center",
          maxWidth: "550px",
          opacity: step >= 3 ? 1 : 0,
          transform: step >= 3 ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 1s ease-in, transform 1s ease-out",
          marginBottom: "24px",
        }}
      >
        Your OpenClaw agent will decide
        <br />
        who lives and who dies.
      </div>

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          color: "#505060",
          lineHeight: "2",
          textAlign: "center",
          maxWidth: "500px",
          opacity: step >= 4 ? 1 : 0,
          transition: "opacity 1.5s ease-in",
          marginBottom: "60px",
        }}
      >
        You can only watch.
      </div>

      <button
        onClick={() => setPhase("agent-select")}
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          color: COLORS.accentRed,
          background: "transparent",
          border: `1px solid rgba(217, 74, 74, 0.4)`,
          padding: "14px 32px",
          cursor: "pointer",
          letterSpacing: "0.15em",
          opacity: step >= 5 ? 1 : 0,
          transform: step >= 5 ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.8s ease-in, transform 0.8s ease-out, border-color 0.3s, box-shadow 0.3s",
          pointerEvents: step >= 5 ? "auto" : "none",
          position: "relative",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.accentRed;
          e.currentTarget.style.boxShadow = "0 0 25px rgba(217, 74, 74, 0.3), inset 0 0 25px rgba(217, 74, 74, 0.05)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(217, 74, 74, 0.4)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        SEND YOUR AGENT IN
      </button>
    </div>
  );
}
