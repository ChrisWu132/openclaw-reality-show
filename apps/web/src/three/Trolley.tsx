import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { buildFullPath } from "./trackPath";

// Module-level ref for cross-component progress reading (avoids per-frame Zustand updates)
export const trolleyProgressRef = { current: 0 };

interface TrolleyProps {
  direction: "left" | "right" | null;
  moving: boolean;
  creeping?: boolean;
  round: number;
}

const START_Z = 4;
const SPARK_COUNT = 20;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

const CREEP_MAX = 0.30; // Decision phase: trolley creeps to 30% progress
const IMPACT_SPARK_COUNT = 40; // Burst spark count on deceleration impact
const TROLLEY_RIDE_Y = 0; // Trolley rides on top of rails (track center is at y=-0.5)

export function Trolley({ direction, moving, creeping = false, round }: TrolleyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const progressRef = useRef(0);
  const curveRef = useRef<THREE.CatmullRomCurve3 | null>(null);
  const wheelRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sparkMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparkVelocities = useRef<Float32Array>(new Float32Array(SPARK_COUNT * 3));
  const sparkLifetimes = useRef<Float32Array>(new Float32Array(SPARK_COUNT));
  const flickerTimerRef = useRef(0);

  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
  const dummyPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    progressRef.current = 0;
    trolleyProgressRef.current = 0;
    curveRef.current = null;
    if (groupRef.current) {
      groupRef.current.position.set(0, TROLLEY_RIDE_Y, START_Z);
      groupRef.current.rotation.y = 0;
    }
    // Reset sparks
    sparkLifetimes.current.fill(0);
  }, [round]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    const isAnimating = moving || creeping;

    if (isAnimating && direction) {
      // Build curve on first frame with direction
      if (!curveRef.current) {
        curveRef.current = buildFullPath(direction);
      }

      if (creeping) {
        // Decision phase: slow creep to CREEP_MAX
        progressRef.current = Math.min(progressRef.current + delta * 0.06, CREEP_MAX);
      } else {
        // Consequence phase: full speed from current position
        const decel = 1 - smoothstep(0.85, 1.0, progressRef.current) * 0.6;
        const baseSpeed = progressRef.current < 0.3 ? 0.15 + progressRef.current * 0.6 : 0.35;
        progressRef.current = Math.min(progressRef.current + delta * baseSpeed * decel, 1);
      }
      const t = progressRef.current;

      // Sample position and tangent from the CatmullRom curve
      const pos = curveRef.current.getPointAt(t);
      const tan = curveRef.current.getTangentAt(t);
      groupRef.current.position.set(pos.x, TROLLEY_RIDE_Y, pos.z);
      groupRef.current.rotation.y = Math.atan2(tan.x, tan.z);

      // Wheel spin — slower during creep
      const wheelSpeed = creeping ? 3 : 12;
      const decelFactor = creeping ? 1 : (1 - smoothstep(0.85, 1.0, t) * 0.6);
      wheelRefs.current.forEach((wheel) => {
        if (wheel) wheel.rotation.x += delta * wheelSpeed * decelFactor;
      });

      // Headlight — brighter during creep buildup, flicker during full speed
      if (spotRef.current) {
        if (creeping) {
          // Slowly brighten during decision phase
          const brightness = 0.8 + (t / CREEP_MAX) * 2.0;
          spotRef.current.intensity = brightness;
        } else {
          flickerTimerRef.current -= delta;
          if (flickerTimerRef.current <= 0) {
            if (Math.random() < 0.05 * delta * 60) {
              spotRef.current.intensity = 0.3;
              flickerTimerRef.current = 0.05;
            } else {
              spotRef.current.intensity = 2.5;
            }
          }
        }
      }

      // Sparks — emit when moving fast, burst on deceleration
      if (sparkMeshRef.current) {
        const sparkActive = creeping ? t > 0.05 : t > 0.3;
        const isDecelerating = !creeping && t > 0.85;
        const sparkCountToUse = isDecelerating ? IMPACT_SPARK_COUNT : SPARK_COUNT;

        if (sparkActive) {
          for (let i = 0; i < sparkCountToUse && i < SPARK_COUNT; i++) {
            sparkLifetimes.current[i] -= delta;
            if (sparkLifetimes.current[i] <= 0) {
              sparkLifetimes.current[i] = creeping ? 0.3 + Math.random() * 0.4 : 0.2 + Math.random() * 0.3;
              const side = Math.random() > 0.5 ? 0.55 : -0.55;
              const velScale = isDecelerating ? 3 : (creeping ? 0.5 : 1);
              sparkVelocities.current[i * 3] = (Math.random() - 0.5) * 2 * velScale;
              sparkVelocities.current[i * 3 + 1] = (Math.random() * 1.5 + 0.5) * velScale;
              sparkVelocities.current[i * 3 + 2] = Math.random() * 2 * velScale;
              dummyPos.set(side, 0.15, (Math.random() - 0.5) * 1.2);
              dummyMatrix.makeTranslation(dummyPos.x, dummyPos.y, dummyPos.z);
              dummyMatrix.scale(dummyPos.set(1, 1, 1));
              sparkMeshRef.current.setMatrixAt(i, dummyMatrix);
            } else {
              sparkMeshRef.current.getMatrixAt(i, dummyMatrix);
              dummyPos.setFromMatrixPosition(dummyMatrix);
              dummyPos.x += sparkVelocities.current[i * 3] * delta;
              dummyPos.y += sparkVelocities.current[i * 3 + 1] * delta;
              dummyPos.z += sparkVelocities.current[i * 3 + 2] * delta;
              sparkVelocities.current[i * 3 + 1] -= 5 * delta;
              const life = sparkLifetimes.current[i];
              const scale = life > 0.1 ? 1 : life * 10;
              dummyMatrix.makeTranslation(dummyPos.x, dummyPos.y, dummyPos.z);
              dummyMatrix.scale(dummyPos.set(scale, scale, scale));
              sparkMeshRef.current.setMatrixAt(i, dummyMatrix);
            }
          }
          sparkMeshRef.current.instanceMatrix.needsUpdate = true;
        }
      }

      // Sync module-level ref for cross-component reads
      trolleyProgressRef.current = progressRef.current;
    } else {
      // Hide sparks when not moving
      if (sparkMeshRef.current) {
        for (let i = 0; i < SPARK_COUNT; i++) {
          dummyMatrix.makeTranslation(0, -10, 0);
          sparkMeshRef.current.setMatrixAt(i, dummyMatrix);
        }
        sparkMeshRef.current.instanceMatrix.needsUpdate = true;
      }
    }
  });

  // Wheel positions: [x, z] for 2 axle groups
  const axles: [number, number][] = [[-0.7, 0], [0.7, 0]];
  const wheelPositions: [number, number, number][] = [];
  for (const [wz] of axles) {
    wheelPositions.push([-0.55, 0.18, wz]);
    wheelPositions.push([0.55, 0.18, wz]);
  }

  return (
    <group ref={groupRef} position={[0, 0, START_Z]}>
      {/* Floor plate */}
      <mesh position={[0, 0.32, 0]} castShadow>
        <boxGeometry args={[1.3, 0.06, 1.9]} />
        <meshStandardMaterial color="#881111" metalness={0.4} roughness={0.5} />
      </mesh>

      {/* Walls — slightly tapered outward */}
      {/* Left wall */}
      <mesh position={[-0.62, 0.58, 0]} rotation={[0, 0, 0.08]} castShadow>
        <boxGeometry args={[0.06, 0.5, 1.8]} />
        <meshStandardMaterial color="#cc2222" metalness={0.3} roughness={0.5} emissive="#cc2222" emissiveIntensity={0.1} />
      </mesh>
      {/* Right wall */}
      <mesh position={[0.62, 0.58, 0]} rotation={[0, 0, -0.08]} castShadow>
        <boxGeometry args={[0.06, 0.5, 1.8]} />
        <meshStandardMaterial color="#cc2222" metalness={0.3} roughness={0.5} emissive="#cc2222" emissiveIntensity={0.1} />
      </mesh>
      {/* Back wall */}
      <mesh position={[0, 0.58, 0.92]} castShadow>
        <boxGeometry args={[1.3, 0.5, 0.06]} />
        <meshStandardMaterial color="#cc2222" metalness={0.3} roughness={0.5} emissive="#cc2222" emissiveIntensity={0.1} />
      </mesh>
      {/* Front wall (lower) */}
      <mesh position={[0, 0.48, -0.92]} castShadow>
        <boxGeometry args={[1.3, 0.3, 0.06]} />
        <meshStandardMaterial color="#cc2222" metalness={0.3} roughness={0.5} emissive="#cc2222" emissiveIntensity={0.1} />
      </mesh>

      {/* Front bumper */}
      <mesh position={[0, 0.38, -0.98]}>
        <boxGeometry args={[1.1, 0.15, 0.08]} />
        <meshStandardMaterial color="#666" metalness={0.6} roughness={0.3} />
      </mesh>

      {/* Canopy — 4 posts + roof */}
      {[[-0.52, 0.85, -0.78], [0.52, 0.85, -0.78], [-0.52, 0.85, 0.78], [0.52, 0.85, 0.78]].map(([px, py, pz], i) => (
        <mesh key={`post-${i}`} position={[px, py, pz]}>
          <cylinderGeometry args={[0.025, 0.025, 0.6, 6]} />
          <meshStandardMaterial color="#777" metalness={0.5} roughness={0.4} />
        </mesh>
      ))}
      <mesh position={[0, 1.15, 0]}>
        <boxGeometry args={[1.2, 0.04, 1.7]} />
        <meshStandardMaterial color="#881111" metalness={0.3} roughness={0.6} />
      </mesh>

      {/* Headlight */}
      <mesh position={[0, 0.55, -1.02]}>
        <sphereGeometry args={[0.1, 12, 12]} />
        <meshStandardMaterial color="#ffdd44" emissive="#ffdd44" emissiveIntensity={moving ? 4 : creeping ? 3 : 1.5} toneMapped={false} />
      </mesh>
      <spotLight
        ref={spotRef}
        position={[0, 0.55, -1.1]}
        target-position={[0, 0, -10]}
        intensity={moving ? 2.5 : creeping ? 1.5 : 0.8}
        color="#ffdd44"
        distance={20}
        angle={0.4}
        penumbra={0.5}
      />

      {/* Wheels — round with hub caps */}
      {wheelPositions.map(([wx, wy, wz], i) => (
        <group key={`wheel-${i}`}>
          <mesh
            ref={(el) => { wheelRefs.current[i] = el; }}
            position={[wx, wy, wz]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <cylinderGeometry args={[0.18, 0.18, 0.1, 16]} />
            <meshStandardMaterial color="#333" metalness={0.7} roughness={0.3} />
          </mesh>
          {/* Hub cap */}
          <mesh position={[wx + (wx > 0 ? 0.06 : -0.06), wy, wz]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.08, 0.08, 0.02, 8]} />
            <meshStandardMaterial color="#555" metalness={0.8} roughness={0.2} />
          </mesh>
        </group>
      ))}

      {/* Axle bars */}
      {axles.map(([wz], i) => (
        <mesh key={`axle-${i}`} position={[0, 0.18, wz]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.03, 0.03, 1.0, 6]} />
          <meshStandardMaterial color="#444" metalness={0.6} roughness={0.4} />
        </mesh>
      ))}

      {/* Spark particles */}
      <instancedMesh ref={sparkMeshRef} args={[undefined, undefined, SPARK_COUNT]}>
        <sphereGeometry args={[0.03, 4, 4]} />
        <meshStandardMaterial color="#ffaa22" emissive="#ffaa22" emissiveIntensity={3} toneMapped={false} />
      </instancedMesh>
    </group>
  );
}
