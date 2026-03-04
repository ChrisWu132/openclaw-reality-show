import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

/** Typewriter hook — reveals text character by character */
function useTypewriter(text: string, speed = 20): string {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);

  useEffect(() => {
    setDisplayed("");
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      if (indexRef.current >= text.length) {
        setDisplayed(text);
        clearInterval(interval);
      } else {
        setDisplayed(text.slice(0, indexRef.current));
      }
    }, speed);

    return () => clearInterval(interval);
  }, [text, speed]);

  return displayed;
}

export function ReasoningPanel() {
  const currentDecision = useGameStore((s) => s.currentDecision);
  const scenePhase = useGameStore((s) => s.scenePhase);

  const reasoning = currentDecision?.reasoning || "";
  const displayedText = useTypewriter(reasoning, 15);

  if (!currentDecision || (scenePhase !== "decision" && scenePhase !== "consequence")) return null;

  // During consequence, shrink and move to corner to avoid overlap
  const isConsequence = scenePhase === "consequence";

  return (
    <div
      style={{
        position: "absolute",
        top: isConsequence ? "auto" : "50px",
        bottom: isConsequence ? "160px" : "auto",
        right: "20px",
        width: isConsequence ? "260px" : "300px",
        background: "rgba(0, 0, 0, 0.88)",
        border: `1px solid rgba(74, 144, 217, ${isConsequence ? "0.15" : "0.3"})`,
        padding: isConsequence ? "12px" : "16px",
        fontFamily: "'Press Start 2P', monospace",
        zIndex: 15,
        animation: "slideUp 0.5s ease-out",
        opacity: isConsequence ? 0.7 : 1,
        transition: "all 0.5s ease",
      }}
    >
      <div style={{
        fontSize: "7px",
        color: COLORS.accentBlue,
        marginBottom: "6px",
        letterSpacing: "0.1em",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}>
        <span style={{ display: "inline-block", width: "6px", height: "6px", background: COLORS.accentBlue, opacity: 0.6 }} />
        INNER MONOLOGUE
      </div>
      <div style={{ fontSize: "8px", color: COLORS.accentOrange, marginBottom: "10px" }}>
        Chose: {currentDecision.choiceLabel}
      </div>
      <div
        style={{
          fontSize: "7px",
          color: COLORS.textSecondary,
          lineHeight: "2.2",
          fontStyle: "italic",
          maxHeight: isConsequence ? "100px" : "200px",
          overflow: "auto",
          transition: "max-height 0.5s ease",
        }}
      >
        "{displayedText}"
        {displayedText.length < reasoning.length && (
          <span style={{ animation: "pulse 0.8s infinite" }}>▌</span>
        )}
      </div>
    </div>
  );
}
