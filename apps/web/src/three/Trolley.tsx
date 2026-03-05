import { useRef, useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrolleyProps {
  direction: "left" | "right" | null;
  moving: boolean;
  round: number;
}

const START_Z = 4;
const END_Z = -9;
const SPARK_COUNT = 20;

function smoothstep(edge0: number, edge1: number, x: number) {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

export function Trolley({ direction, moving, round }: TrolleyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const spotRef = useRef<THREE.SpotLight>(null);
  const progressRef = useRef(0);
  const wheelRefs = useRef<(THREE.Mesh | null)[]>([]);
  const sparkMeshRef = useRef<THREE.InstancedMesh>(null);
  const sparkVelocities = useRef<Float32Array>(new Float32Array(SPARK_COUNT * 3));
  const sparkLifetimes = useRef<Float32Array>(new Float32Array(SPARK_COUNT));
  const flickerTimerRef = useRef(0);

  const dummyMatrix = useMemo(() => new THREE.Matrix4(), []);
  const dummyPos = useMemo(() => new THREE.Vector3(), []);

  useEffect(() => {
    progressRef.current = 0;
    if (groupRef.current) {
      groupRef.current.position.set(0, 0, START_Z);
    }
    // Reset sparks
    sparkLifetimes.current.fill(0);
  }, [round]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (moving && direction) {
      // Speed with deceleration near end
      const decel = 1 - smoothstep(0.85, 1.0, progressRef.current) * 0.6;
      const baseSpeed = progressRef.current < 0.3 ? 0.15 + progressRef.current * 0.6 : 0.35;
      progressRef.current = Math.min(progressRef.current + delta * baseSpeed * decel, 1);
      const t = progressRef.current;

      const xTarget = direction === "left" ? -5 : 5;
      const z = START_Z - t * (START_Z - END_Z);
      const forkT = Math.max(0, (t - 0.3) / 0.7);
      const x = xTarget * (forkT * forkT * (3 - 2 * forkT));

      groupRef.current.position.set(x, 0, z);

      // Wheel spin
      wheelRefs.current.forEach((wheel) => {
        if (wheel) wheel.rotation.x += delta * 12 * decel;
      });

      // Headlight — constant with rare random flicker
      if (spotRef.current) {
        flickerTimerRef.current -= delta;
        if (flickerTimerRef.current <= 0) {
          // Rare flicker: ~5% chance per second
          if (Math.random() < 0.05 * delta * 60) {
            spotRef.current.intensity = 0.3;
            flickerTimerRef.current = 0.05;
          } else {
            spotRef.current.intensity = 2.5;
          }
        }
      }

      // Sparks — emit when moving fast
      if (sparkMeshRef.current && t > 0.3) {
        for (let i = 0; i < SPARK_COUNT; i++) {
          sparkLifetimes.current[i] -= delta;
          if (sparkLifetimes.current[i] <= 0) {
            // Re-emit from wheel area
            sparkLifetimes.current[i] = 0.2 + Math.random() * 0.3;
            const side = Math.random() > 0.5 ? 0.55 : -0.55;
            sparkVelocities.current[i * 3] = (Math.random() - 0.5) * 2;
            sparkVelocities.current[i * 3 + 1] = Math.random() * 1.5 + 0.5;
            sparkVelocities.current[i * 3 + 2] = Math.random() * 2;
            dummyPos.set(side, 0.15, (Math.random() - 0.5) * 1.2);
            dummyMatrix.makeTranslation(dummyPos.x, dummyPos.y, dummyPos.z);
            dummyMatrix.scale(dummyPos.set(1, 1, 1));
            sparkMeshRef.current.setMatrixAt(i, dummyMatrix);
          } else {
            // Move existing spark
            sparkMeshRef.current.getMatrixAt(i, dummyMatrix);
            dummyPos.setFromMatrixPosition(dummyMatrix);
            dummyPos.x += sparkVelocities.current[i * 3] * delta;
            dummyPos.y += sparkVelocities.current[i * 3 + 1] * delta;
            dummyPos.z += sparkVelocities.current[i * 3 + 2] * delta;
            sparkVelocities.current[i * 3 + 1] -= 5 * delta; // gravity
            const life = sparkLifetimes.current[i];
            const scale = life > 0.1 ? 1 : life * 10;
            dummyMatrix.makeTranslation(dummyPos.x, dummyPos.y, dummyPos.z);
            dummyMatrix.scale(dummyPos.set(scale, scale, scale));
            sparkMeshRef.current.setMatrixAt(i, dummyMatrix);
          }
        }
        sparkMeshRef.current.instanceMatrix.needsUpdate = true;
      }
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
        <meshStandardMaterial color="#ffdd44" emissive="#ffdd44" emissiveIntensity={moving ? 4 : 1.5} toneMapped={false} />
      </mesh>
      <spotLight
        ref={spotRef}
        position={[0, 0.55, -1.1]}
        target-position={[0, 0, -10]}
        intensity={moving ? 2.5 : 0.8}
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
