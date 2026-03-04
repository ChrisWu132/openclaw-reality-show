import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function RoundCounter() {
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);
  const scenePhase = useGameStore((s) => s.scenePhase);

  if (currentRound === 0) return null;

  // Determine tier color based on round
  const tierColor: string =
    currentRound >= 8 ? COLORS.accentRed :
    currentRound >= 4 ? COLORS.accentOrange :
    COLORS.accentBlue;

  return (
    <div
      style={{
        position: "absolute",
        top: "15px",
        left: "15px",
        fontFamily: "'Press Start 2P', monospace",
        background: "rgba(0, 0, 0, 0.7)",
        padding: "8px 14px",
        letterSpacing: "0.1em",
        zIndex: 10,
        borderLeft: `2px solid ${tierColor}`,
        animation: scenePhase === "round_start" ? "scaleIn 0.4s ease-out" : undefined,
      }}
    >
      <div style={{ fontSize: "9px", color: COLORS.textSecondary }}>
        ROUND <span style={{ color: tierColor }}>{currentRound}</span> / {totalRounds}
      </div>
      {/* Progress bar */}
      <div style={{
        width: "100%",
        height: "2px",
        background: "rgba(255,255,255,0.05)",
        marginTop: "6px",
      }}>
        <div style={{
          width: `${(currentRound / totalRounds) * 100}%`,
          height: "100%",
          background: tierColor,
          transition: "width 0.5s ease-out",
          boxShadow: `0 0 6px ${tierColor}44`,
        }} />
      </div>
    </div>
  );
}
