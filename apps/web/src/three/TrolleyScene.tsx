import { useRef, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import { Environment } from "./Environment";
import { Track } from "./Track";
import { Trolley, trolleyProgressRef } from "./Trolley";
import { FigureGroup } from "./FigureGroup";
import { Lever } from "./Lever";
import { useGameStore, type ScenePhase, type ConsequenceSubPhase } from "../stores/gameStore";
import * as THREE from "three";

// Reusable vectors to avoid per-frame allocations
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();

const IMPACT_PROGRESS = 0.82; // Trolley progress at which impact triggers
const AFTERMATH_DELAY = 1.5; // Seconds after impact before aftermath

function CameraController({ scenePhase }: { scenePhase: ScenePhase }) {
  const { camera } = useThree();
  const posRef = useRef(new THREE.Vector3(0, 10, 14));
  const lookRef = useRef(new THREE.Vector3(0, 0, -3));
  const shakeRef = useRef(0);
  const impactTimerRef = useRef(0);
  const prevSubPhaseRef = useRef<ConsequenceSubPhase>(null);

  useFrame((_, delta) => {
    const subPhase = useGameStore.getState().consequenceSubPhase;

    // Drive consequence sub-phase transitions based on trolley progress
    if (scenePhase === "consequence" && subPhase === "traveling") {
      if (trolleyProgressRef.current >= IMPACT_PROGRESS) {
        useGameStore.getState().setConsequenceSubPhase("impact");
      }
    }

    // Impact → aftermath timer
    if (subPhase === "impact") {
      if (prevSubPhaseRef.current !== "impact") {
        impactTimerRef.current = AFTERMATH_DELAY;
        shakeRef.current = 0.8;
      }
      impactTimerRef.current -= delta;
      if (impactTimerRef.current <= 0) {
        useGameStore.getState().setConsequenceSubPhase("aftermath");
      }
    }
    prevSubPhaseRef.current = subPhase;

    let px: number, py: number, pz: number;
    let lx = 0, ly = 0, lz = -3;

    switch (scenePhase) {
      case "idle":
      case "round_start":
        px = 0; py = 10; pz = 14;
        lz = -2;
        break;
      case "dilemma":
      case "deciding":
        px = 0; py = 9; pz = 13;
        break;
      case "decision":
        px = 2; py = 10; pz = 14;
        lz = -4;
        break;
      case "consequence":
        px = 0; py = 11; pz = 12;
        lz = -4;
        break;
      default:
        px = 0; py = 10; pz = 14;
    }

    _targetPos.set(px, py, pz);
    _targetLook.set(lx, ly, lz);

    // Frame-rate independent lerp
    const posT = 1 - Math.pow(0.05, delta);
    const lookT = 1 - Math.pow(0.05, delta);

    posRef.current.lerp(_targetPos, posT);
    lookRef.current.lerp(_targetLook, lookT);

    // Apply camera shake — only during impact sub-phase
    let shakeX = 0, shakeY = 0;
    if (shakeRef.current > 0) {
      shakeRef.current = Math.max(0, shakeRef.current - delta);
      const amplitude = 0.35 * (shakeRef.current / 0.8);
      shakeX = (Math.random() - 0.5) * 2 * amplitude;
      shakeY = (Math.random() - 0.5) * 2 * amplitude;
    }

    camera.position.set(
      posRef.current.x + shakeX,
      posRef.current.y + shakeY,
      posRef.current.z,
    );
    camera.lookAt(lookRef.current);
  });

  return null;
}

const chromaOffset = new THREE.Vector2(0.0008, 0.0008);

export function TrolleyScene() {
  const scenePhase = useGameStore((s) => s.scenePhase);
  const consequenceSubPhase = useGameStore((s) => s.consequenceSubPhase);
  const currentRound = useGameStore((s) => s.currentRound);
  const currentDilemma = useGameStore((s) => s.currentDilemma);
  const currentDecision = useGameStore((s) => s.currentDecision);

  const trolleyMoving = scenePhase === "consequence";
  const trolleyCreeping = scenePhase === "decision";
  const trolleyDirection = currentDecision?.trackDirection || null;
  const leverPulled = (scenePhase === "decision" || scenePhase === "consequence") ? (currentDecision?.trackDirection || null) : null;
  const hitTrack = currentDecision?.trackDirection || null;

  // Figures are hit only after impact (not during traveling)
  const isImpactOrAfter = consequenceSubPhase === "impact" || consequenceSubPhase === "aftermath";

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
        <Trolley direction={trolleyDirection} moving={trolleyMoving} creeping={trolleyCreeping} round={currentRound} />
      )}
      <Lever pulled={leverPulled} />

      {showFigures && currentDilemma?.sceneConfig.trackEntities.map((entity, i) => {
        const isLeft = entity.trackDirection === "left";
        const baseX = isLeft ? -5 : 5;
        const isHit = isImpactOrAfter && entity.trackDirection === hitTrack;
        return (
          <FigureGroup
            key={`${currentDilemma.id}-${i}`}
            entity={entity}
            basePosition={[baseX, 0, -7]}
            hit={isHit}
            hideLabel={isImpactOrAfter}
          />
        );
      })}

      <EffectComposer>
        <Bloom luminanceThreshold={0.7} intensity={0.6} mipmapBlur />
        <Vignette offset={0.3} darkness={0.65} />
        <ChromaticAberration offset={chromaOffset} radialModulation modulationOffset={0.3} />
        <Noise premultiply blendFunction={BlendFunction.SOFT_LIGHT} opacity={0.3} />
      </EffectComposer>
    </Canvas>
  );
}
