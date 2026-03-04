import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface TrolleyProps {
  direction: "left" | "right" | null;
  moving: boolean;
}

export function Trolley({ direction, moving }: TrolleyProps) {
  const groupRef = useRef<THREE.Group>(null);
  const progressRef = useRef(0);

  useFrame((_, delta) => {
    if (!groupRef.current) return;

    if (moving && direction) {
      progressRef.current = Math.min(progressRef.current + delta * 0.3, 1);
      const t = progressRef.current;

      // Interpolate along track
      const xTarget = direction === "left" ? -5 : 5;
      const z = 15 - t * 27; // 15 to -12
      const x = t > 0.4 ? xTarget * ((t - 0.4) / 0.6) : 0;

      groupRef.current.position.set(x, 0, z);
    } else if (!moving) {
      // Idle: trolley at start
      progressRef.current = 0;
      groupRef.current.position.set(0, 0, 15);
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
