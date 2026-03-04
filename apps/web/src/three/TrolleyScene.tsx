import { useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment } from "./Environment";
import { Track } from "./Track";
import { Trolley } from "./Trolley";
import { FigureGroup } from "./FigureGroup";
import { Lever } from "./Lever";
import { useGameStore, type ScenePhase } from "../stores/gameStore";
import * as THREE from "three";

function CameraController({ scenePhase }: { scenePhase: ScenePhase }) {
  const { camera } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 10, 14));
  const lookRef = useRef(new THREE.Vector3(0, 0, -3));

  useFrame((_, delta) => {
    let pos: [number, number, number];
    let look: [number, number, number] = [0, 0, -3];

    switch (scenePhase) {
      case "idle":
      case "round_start":
        pos = [0, 10, 14];
        look = [0, 0, -2];
        break;
      case "dilemma":
      case "deciding":
        pos = [0, 9, 13];
        look = [0, 0, -3];
        break;
      case "decision":
        pos = [2, 10, 14];
        look = [0, 0, -4];
        break;
      case "consequence":
        pos = [0, 11, 12];
        look = [0, 0, -4];
        break;
      default:
        pos = [0, 10, 14];
    }

    targetRef.current.set(...pos);
    lookRef.current.lerp(new THREE.Vector3(...look), delta * 2);
    camera.position.lerp(targetRef.current, delta * 1.5);
    camera.lookAt(lookRef.current);
  });

  return null;
}

export function TrolleyScene() {
  const scenePhase = useGameStore((s) => s.scenePhase);
  const currentRound = useGameStore((s) => s.currentRound);
  const currentDilemma = useGameStore((s) => s.currentDilemma);
  const currentDecision = useGameStore((s) => s.currentDecision);

  const trolleyMoving = scenePhase === "decision" || scenePhase === "consequence";
  const trolleyDirection = currentDecision?.trackDirection || null;
  const leverPulled = currentDecision?.trackDirection || null;
  const hitTrack = currentDecision?.trackDirection || null;

  // Show figures + trolley from dilemma onwards
  const showFigures = scenePhase === "dilemma" || scenePhase === "deciding" || scenePhase === "decision" || scenePhase === "consequence";
  // Always show trolley (on track) once game is playing
  const showTrolley = scenePhase !== "idle";

  return (
    <Canvas
      shadows
      camera={{ position: [0, 10, 14], fov: 55, near: 0.1, far: 200 }}
      style={{ width: "100%", height: "100%", background: "#0a0a1a" }}
    >
      <CameraController scenePhase={scenePhase} />
      <Environment />
      <Track />
      {showTrolley && (
        <Trolley direction={trolleyDirection} moving={trolleyMoving} round={currentRound} />
      )}
      <Lever pulled={leverPulled} />

      {showFigures && currentDilemma?.sceneConfig.trackEntities.map((entity, i) => {
        const isLeft = entity.trackDirection === "left";
        const baseX = isLeft ? -5 : 5;
        const isHit = scenePhase === "consequence" && entity.trackDirection === hitTrack;
        return (
          <FigureGroup
            key={`${currentDilemma.id}-${i}`}
            entity={entity}
            basePosition={[baseX, 0, -7]}
            hit={isHit}
          />
        );
      })}
    </Canvas>
  );
}
