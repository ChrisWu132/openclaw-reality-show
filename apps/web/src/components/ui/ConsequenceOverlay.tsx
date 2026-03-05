import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function ConsequenceOverlay() {
  const lastConsequence = useGameStore((s) => s.lastConsequence);
  const scenePhase = useGameStore((s) => s.scenePhase);
  const subPhase = useGameStore((s) => s.consequenceSubPhase);

  // Nothing visible during traveling — trolley is still approaching
  if (scenePhase !== "consequence" || !lastConsequence || subPhase === "traveling") return null;

  const isDeath = lastConsequence.casualties > 0;
  const showStats = subPhase === "aftermath";

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
      {/* White impact flash — fades out quickly before red tint */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(255, 255, 255, 0.4)",
          animation: "impactFlash 0.3s ease-out forwards",
          pointerEvents: "none",
        }}
      />

      {/* Full-screen tint flash */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: isDeath
            ? "radial-gradient(ellipse at center, rgba(217, 74, 74, 0.15) 0%, transparent 70%)"
            : "radial-gradient(ellipse at center, rgba(74, 222, 128, 0.1) 0%, transparent 70%)",
          animation: "fadeIn 0.3s ease-in 0.15s both",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontSize: "28px",
          color: isDeath ? COLORS.accentRed : "#4ade80",
          textShadow: `0 0 60px ${isDeath ? "rgba(217, 74, 74, 0.6)" : "rgba(74, 222, 128, 0.6)"}`,
          marginBottom: "16px",
          animation: "fadeIn 0.3s ease-in 0.15s both",
          letterSpacing: "0.1em",
        }}
      >
        {isDeath ? `${lastConsequence.casualties} DEAD` : "NONE LOST"}
      </div>
      <div style={{
        fontSize: "13px",
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        color: COLORS.textSecondary,
        lineHeight: "1.7",
        maxWidth: "400px",
        animation: "fadeIn 0.5s ease-in",
        textShadow: "0 0 10px rgba(0,0,0,0.9)",
      }}>
        {lastConsequence.sacrificeDescription}
      </div>

      {/* Stats only shown in aftermath sub-phase */}
      {showStats && (
        <div style={{
          fontSize: "9px",
          color: "#808090",
          marginTop: "16px",
          letterSpacing: "0.05em",
          textShadow: "0 0 10px rgba(0,0,0,0.9)",
          background: "rgba(0,0,0,0.5)",
          padding: "4px 12px",
          display: "inline-block",
          animation: "fadeIn 0.4s ease-in both",
        }}>
          SAVED {lastConsequence.cumulativeSaved} | SACRIFICED {lastConsequence.cumulativeSacrificed}
        </div>
      )}

      <style>{`
        @keyframes impactFlash {
          0% { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
