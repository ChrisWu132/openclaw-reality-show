import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function ReasoningPanel() {
  const currentDecision = useGameStore((s) => s.currentDecision);
  const scenePhase = useGameStore((s) => s.scenePhase);

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
        background: "rgba(0, 0, 0, 0.85)",
        border: `1px solid rgba(74, 144, 217, ${isConsequence ? "0.15" : "0.3"})`,
        padding: isConsequence ? "12px" : "16px",
        fontFamily: "'Press Start 2P', monospace",
        zIndex: 15,
        animation: "fadeIn 0.5s ease-in",
        opacity: isConsequence ? 0.7 : 1,
        transition: "all 0.5s ease",
      }}
    >
      <div style={{ fontSize: "7px", color: COLORS.accentBlue, marginBottom: "6px", letterSpacing: "0.1em" }}>
        INNER MONOLOGUE
      </div>
      <div style={{ fontSize: "8px", color: COLORS.accentOrange, marginBottom: "10px" }}>
        Chose: {currentDecision.choiceLabel}
      </div>
      <div
        style={{
          fontSize: "7px",
          color: COLORS.textSecondary,
          lineHeight: "2",
          fontStyle: "italic",
          maxHeight: isConsequence ? "100px" : "200px",
          overflow: "auto",
          transition: "max-height 0.5s ease",
        }}
      >
        "{currentDecision.reasoning}"
      </div>
    </div>
  );
}
