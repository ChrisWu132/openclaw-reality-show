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

      {scenePhase === "deciding" && (
        <div
          style={{
            position: "absolute",
            top: "15px",
            right: "15px",
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
            color: COLORS.accentOrange,
            animation: "pulse 1.5s infinite",
            zIndex: 10,
          }}
        >
          AI DECIDING...
        </div>
      )}
    </div>
  );
}
