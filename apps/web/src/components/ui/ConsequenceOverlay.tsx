import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function ConsequenceOverlay() {
  const lastConsequence = useGameStore((s) => s.lastConsequence);
  const scenePhase = useGameStore((s) => s.scenePhase);

  if (scenePhase !== "consequence" || !lastConsequence) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        fontFamily: "'Press Start 2P', monospace",
        zIndex: 20,
        animation: "fadeIn 0.3s ease-in",
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          fontSize: "24px",
          color: lastConsequence.casualties > 0 ? COLORS.accentRed : "#4ade80",
          textShadow: `0 0 40px ${lastConsequence.casualties > 0 ? "rgba(217, 74, 74, 0.5)" : "rgba(74, 222, 128, 0.5)"}`,
          marginBottom: "12px",
        }}
      >
        {lastConsequence.casualties > 0 ? `${lastConsequence.casualties} DEAD` : "NONE LOST"}
      </div>
      <div style={{ fontSize: "7px", color: COLORS.textSecondary, lineHeight: "2", maxWidth: "400px" }}>
        {lastConsequence.sacrificeDescription}
      </div>
      <div style={{ fontSize: "7px", color: "#606070", marginTop: "12px" }}>
        Total saved: {lastConsequence.cumulativeSaved} | Total sacrificed: {lastConsequence.cumulativeSacrificed}
      </div>
    </div>
  );
}
