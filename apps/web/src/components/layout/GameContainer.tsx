import { TrolleyScene } from "../../three/TrolleyScene";
import { DilemmaCard } from "../ui/DilemmaCard";
import { ReasoningPanel } from "../ui/ReasoningPanel";
import { RoundCounter } from "../ui/RoundCounter";
import { ConsequenceOverlay } from "../ui/ConsequenceOverlay";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function GameContainer() {
  const scenePhase = useGameStore((s) => s.scenePhase);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: COLORS.bgPrimary,
        overflow: "hidden",
      }}
    >
      <TrolleyScene />
      <RoundCounter />
      <DilemmaCard />
      <ReasoningPanel />
      <ConsequenceOverlay />

      {/* Round start transition */}
      {scenePhase === "round_start" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Press Start 2P', monospace",
            zIndex: 25,
            animation: "fadeIn 0.3s ease-in",
          }}
        >
          <div
            style={{
              fontSize: "14px",
              color: COLORS.textSecondary,
              letterSpacing: "0.2em",
              textShadow: "0 0 30px rgba(74, 144, 217, 0.3)",
            }}
          >
            ROUND {useGameStore.getState().currentRound}
          </div>
        </div>
      )}

      {/* AI deciding indicator */}
      {scenePhase === "deciding" && (
        <div
          style={{
            position: "absolute",
            top: "50px",
            right: "20px",
            fontFamily: "'Press Start 2P', monospace",
            background: "rgba(0, 0, 0, 0.7)",
            border: "1px solid rgba(217, 122, 44, 0.3)",
            padding: "10px 16px",
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: "8px",
              color: COLORS.accentOrange,
              animation: "pulse 1.5s infinite",
              letterSpacing: "0.1em",
            }}
          >
            AI DECIDING...
          </div>
          <div style={{ fontSize: "6px", color: "#606070", marginTop: "6px" }}>
            Processing moral calculus
          </div>
        </div>
      )}
    </div>
  );
}
