import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function ConsequenceOverlay() {
  const lastConsequence = useGameStore((s) => s.lastConsequence);
  const scenePhase = useGameStore((s) => s.scenePhase);

  if (scenePhase !== "consequence" || !lastConsequence) return null;

  const isDeath = lastConsequence.casualties > 0;

  return (
    <div
      style={{
        position: "absolute",
        top: "30%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        textAlign: "center",
        fontFamily: "'Press Start 2P', monospace",
        zIndex: 20,
        pointerEvents: "none",
      }}
    >
      {/* Full-screen tint flash */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: isDeath
            ? "radial-gradient(ellipse at center, rgba(217, 74, 74, 0.15) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(74, 222, 128, 0.1) 0%, transparent 70%)",
          animation: "fadeIn 0.3s ease-in",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontSize: "28px",
          color: isDeath ? COLORS.accentRed : "#4ade80",
          textShadow: `0 0 60px ${isDeath ? "rgba(217, 74, 74, 0.6)" : "rgba(74, 222, 128, 0.6)"}`,
          marginBottom: "16px",
          animation: "fadeIn 0.3s ease-in",
          letterSpacing: "0.1em",
        }}
      >
        {isDeath ? `${lastConsequence.casualties} DEAD` : "NONE LOST"}
      </div>
      <div style={{
        fontSize: "7px",
        color: COLORS.textSecondary,
        lineHeight: "2",
        maxWidth: "400px",
        animation: "fadeIn 0.5s ease-in",
      }}>
        {lastConsequence.sacrificeDescription}
      </div>
      <div style={{
        fontSize: "7px",
        color: "#606070",
        marginTop: "16px",
        letterSpacing: "0.05em",
      }}>
        SAVED {lastConsequence.cumulativeSaved} | SACRIFICED {lastConsequence.cumulativeSacrificed}
      </div>
    </div>
  );
}
