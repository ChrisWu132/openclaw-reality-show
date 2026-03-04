import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TYPE_COLORS: Record<string, string> = {
  worker: "#6a7a8a",
  child: "#a0c0e0",
  official: "#d4a574",
  prisoner: "#8b4513",
  elder: "#c0b0a0",
  self: "#4a90d9",
  group: "#606060",
};

interface FigureProps {
  type: string;
  position: [number, number, number];
  hit?: boolean;
}

export function Figure({ type, position, hit = false }: FigureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const color = TYPE_COLORS[type] || "#6a7a8a";

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    if (hit) {
      groupRef.current.rotation.z = Math.PI / 2;
      groupRef.current.position.y = position[1] - 0.2;
    } else {
      // Subtle idle sway
      groupRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 1.5 + position[0]) * 0.03;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body (capsule) */}
      <mesh position={[0, 0.4, 0]} castShadow>
        <capsuleGeometry args={[0.12, 0.4, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.7} />
      </mesh>
      {/* Head */}
      <mesh position={[0, 0.85, 0]} castShadow>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={0.1} />
      </mesh>
    </group>
  );
}
