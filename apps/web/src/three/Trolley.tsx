import { useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrolleyProps {
  direction: "left" | "right" | null;
  moving: boolean;
  round: number;
}

export function Trolley({ direction, moving, round }: TrolleyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  // Reset trolley position when round changes
  useEffect(() => {
    progressRef.current = 0;
    if (groupRef.current) {
      groupRef.current.position.set(0, 0, 15);
    }
  }, [round]);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (moving && direction) {
      progressRef.current = Math.min(progressRef.current + delta * 0.3, 1);
      const t = progressRef.current;

      // Follow track curve: straight approach, then fork
      const xTarget = direction === "left" ? -5 : 5;
      const z = 15 - t * 27; // 15 to -12
      // Smooth ease into the fork using cubic interpolation
      const forkT = Math.max(0, (t - 0.35) / 0.65);
      const x = xTarget * (forkT * forkT * (3 - 2 * forkT)); // smoothstep

      groupRef.current.position.set(x, 0, z);
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 15]}>
      {/* Cart body */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <boxGeometry args={[0.8, 0.4, 1.2]} />
        <meshStandardMaterial color="#8b0000" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* Wheels */}
      {[[-0.35, -0.4], [0.35, -0.4], [-0.35, 0.4], [0.35, 0.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.08, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.1, 0.1, 0.1, 8]} />
          <meshStandardMaterial color="#333" metalness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
