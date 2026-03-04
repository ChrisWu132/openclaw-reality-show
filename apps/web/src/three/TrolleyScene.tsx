import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { Environment } from "./Environment";
import { Track } from "./Track";
import { Trolley } from "./Trolley";
import { FigureGroup } from "./FigureGroup";
import { Lever } from "./Lever";
import { useGameStore } from "../stores/gameStore";

export function TrolleyScene() {
  const scenePhase = useGameStore((s) => s.scenePhase);
  const currentRound = useGameStore((s) => s.currentRound);
  const currentDilemma = useGameStore((s) => s.currentDilemma);
  const currentDecision = useGameStore((s) => s.currentDecision);

  const trolleyMoving = scenePhase === "decision" || scenePhase === "consequence";
  const trolleyDirection = currentDecision?.trackDirection || null;
  const leverPulled = currentDecision?.trackDirection || null;

  // Determine which entities are on the chosen track (hit)
  const hitTrack = currentDecision?.trackDirection || null;

  // Show figures during dilemma, deciding, decision, and consequence phases
  const showFigures = scenePhase === "dilemma" || scenePhase === "deciding" || scenePhase === "decision" || scenePhase === "consequence";

  return (
    <Canvas
      shadows
      camera={{ position: [0, 8, 18], fov: 45, near: 0.1, far: 100 }}
      style={{ width: "100%", height: "100%", background: "#0a0a1a" }}
    >
      <Environment />
      <Track />
      <Trolley direction={trolleyDirection} moving={trolleyMoving} round={currentRound} />
      <Lever pulled={leverPulled} />

      {/* Render figures based on dilemma scene config */}
      {showFigures && currentDilemma?.sceneConfig.trackEntities.map((entity, i) => {
        const isLeft = entity.trackDirection === "left";
        const baseX = isLeft ? -4.5 : 4.5;
        const isHit = scenePhase === "consequence" && entity.trackDirection === hitTrack;
        const isThreatened = (scenePhase === "dilemma" || scenePhase === "deciding") && entity.trackDirection === "left";
        return (
          <FigureGroup
            key={`${currentDilemma.id}-${i}`}
            entity={entity}
            basePosition={[baseX, -0.45, -9]}
            hit={isHit}
            threatened={isThreatened}
          />
        );
      })}

      <OrbitControls
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI / 6}
        maxPolarAngle={Math.PI / 2.5}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}
