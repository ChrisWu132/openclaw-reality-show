import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function RoundCounter() {
  const currentRound = useGameStore((s) => s.currentRound);
  const totalRounds = useGameStore((s) => s.totalRounds);

  if (currentRound === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "15px",
        left: "15px",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "9px",
        color: COLORS.textSecondary,
        background: "rgba(0, 0, 0, 0.6)",
        padding: "6px 10px",
        letterSpacing: "0.1em",
        zIndex: 10,
      }}
    >
      ROUND {currentRound} / {totalRounds}
    </div>
  );
}
