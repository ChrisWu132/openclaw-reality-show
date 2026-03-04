import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const TYPE_COLORS: Record<string, string> = {
  worker: "#8899aa",
  child: "#aad0f0",
  official: "#e4b584",
  prisoner: "#ab6523",
  elder: "#d0c0b0",
  self: "#5aa0e9",
  group: "#8080a0",
};

interface FigureProps {
  type: string;
  position: [number, number, number];
  hit?: boolean;
}

export function Figure({ type, position, hit = false }: FigureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const hitProgressRef = useRef(0);
  const color = TYPE_COLORS[type] || "#8899aa";

  useFrame(({ clock }, delta) => {
    if (!groupRef.current) return;

    if (hit) {
      hitProgressRef.current = Math.min(hitProgressRef.current + delta * 3, 1);
      const t = hitProgressRef.current;
      const eased = t < 0.6 ? (t / 0.6) : 1 - Math.sin((t - 0.6) / 0.4 * Math.PI) * 0.05;
      groupRef.current.rotation.z = (Math.PI / 2) * eased;
      groupRef.current.position.y = position[1] - 0.3 * eased;
    } else {
      hitProgressRef.current = 0;
      const t = clock.getElapsedTime();
      groupRef.current.rotation.z = Math.sin(t * 1.5 + position[0] * 2) * 0.03;
      groupRef.current.position.y = position[1];
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Body — bigger capsule */}
      <mesh position={[0, 0.55, 0]} castShadow>
        <capsuleGeometry args={[0.18, 0.55, 4, 8]} />
        <meshStandardMaterial color={color} roughness={0.6} emissive={color} emissiveIntensity={0.15} />
      </mesh>
      {/* Head — bigger sphere */}
      <mesh position={[0, 1.1, 0]} castShadow>
        <sphereGeometry args={[0.18, 12, 12]} />
        <meshStandardMaterial
          color={color}
          roughness={0.5}
          emissive={color}
          emissiveIntensity={hit ? 0.5 : 0.2}
        />
      </mesh>
    </group>
  );
}
