import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LeverProps {
  pulled: "left" | "right" | null;
}

export function Lever({ pulled }: LeverProps) {
  const leverRef = useRef<THREE.Group>(null);
  const targetAngle = pulled === "left" ? -0.5 : pulled === "right" ? 0.5 : 0;

  useFrame(() => {
    if (!leverRef.current) return;
    const current = leverRef.current.rotation.z;
    leverRef.current.rotation.z += (targetAngle - current) * 0.08;
  });

  return (
    <group position={[1.5, -0.3, 0.5]}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.4, 0.4, 0.4]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Lever arm + handle */}
      <group ref={leverRef} position={[0, 0.5, 0]}>
        <mesh>
          <boxGeometry args={[0.1, 0.8, 0.1]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color="#d94a4a" emissive="#d94a4a" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}
