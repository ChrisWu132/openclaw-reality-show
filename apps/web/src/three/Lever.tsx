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
    <group position={[0, -0.3, 1]}>
      {/* Base */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.3, 0.3, 0.3]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Lever arm + handle (grouped so handle rotates with arm) */}
      <group ref={leverRef} position={[0, 0.4, 0]}>
        <mesh>
          <boxGeometry args={[0.08, 0.6, 0.08]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Handle — offset relative to arm center */}
        <mesh position={[0, 0.35, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#d94a4a" emissive="#d94a4a" emissiveIntensity={0.3} />
        </mesh>
      </group>
    </group>
  );
}
