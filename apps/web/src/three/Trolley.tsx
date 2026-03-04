import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrolleyProps {
  direction: "left" | "right" | null;
  moving: boolean;
  round: number;
}

const START_Z = 4;
const END_Z = -9;

export function Trolley({ direction, moving, round }: TrolleyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const progressRef = useRef(0);
  const wheelRefs = useRef<(THREE.Mesh | null)[]>([]);

  useEffect(() => {
    progressRef.current = 0;
    if (groupRef.current) {
      groupRef.current.position.set(0, 0, START_Z);
    }
  }, [round]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (moving && direction) {
      const speed = progressRef.current < 0.3 ? 0.15 + progressRef.current * 0.6 : 0.35;
      progressRef.current = Math.min(progressRef.current + delta * speed, 1);
      const t = progressRef.current;

      const xTarget = direction === "left" ? -5 : 5;
      const z = START_Z - t * (START_Z - END_Z);
      const forkT = Math.max(0, (t - 0.3) / 0.7);
      const x = xTarget * (forkT * forkT * (3 - 2 * forkT));

      groupRef.current.position.set(x, 0, z);

      wheelRefs.current.forEach((wheel) => {
        if (wheel) wheel.rotation.x += delta * 12;
      });

      if (lightRef.current) {
        lightRef.current.intensity = 1.5 + Math.sin(t * 20) * 0.4;
      }
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, START_Z]}>
      {/* Cart body — bright red */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <boxGeometry args={[1.2, 0.6, 1.8]} />
        <meshStandardMaterial color="#cc2222" metalness={0.3} roughness={0.5} emissive="#cc2222" emissiveIntensity={0.1} />
      </mesh>

      {/* Top edge rail */}
      <mesh position={[0, 0.85, 0]}>
        <boxGeometry args={[1.1, 0.06, 1.7]} />
        <meshStandardMaterial color="#881111" metalness={0.4} roughness={0.4} />
      </mesh>

      {/* Front bumper */}
      <mesh position={[0, 0.5, -0.95]}>
        <boxGeometry args={[1.0, 0.3, 0.08]} />
        <meshStandardMaterial color="#777" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Headlight */}
      <mesh position={[0, 0.6, -1.0]}>
        <sphereGeometry args={[0.1, 8, 8]} />
        <meshStandardMaterial color="#ffdd44" emissive="#ffdd44" emissiveIntensity={moving ? 4 : 1} />
      </mesh>
      <pointLight
        ref={lightRef}
        position={[0, 0.6, -2]}
        intensity={moving ? 1.5 : 0.5}
        color="#ffdd44"
        distance={15}
      />

      {/* Wheels */}
      {[[-0.5, -0.7], [0.5, -0.7], [-0.5, 0.7], [0.5, 0.7]].map(([x, z], i) => (
        <mesh
          key={i}
          ref={(el) => { wheelRefs.current[i] = el; }}
          position={[x, 0.12, z]}
          rotation={[0, 0, Math.PI / 2]}
        >
          <cylinderGeometry args={[0.15, 0.15, 0.12, 8]} />
          <meshStandardMaterial color="#444" metalness={0.6} />
        </mesh>
      ))}
    </group>
  );
}
