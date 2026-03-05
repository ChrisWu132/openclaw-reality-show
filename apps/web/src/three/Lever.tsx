import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

interface LeverProps {
  pulled: "left" | "right" | null;
}

export function Lever({ pulled }: LeverProps) {
  const leverRef = useRef<THREE.Group>(null);
  const targetAngle = pulled === "left" ? -0.5 : pulled === "right" ? 0.5 : 0;

  useFrame((_, delta) => {
    if (!leverRef.current) return;
    const current = leverRef.current.rotation.z;
    // Frame-rate independent lerp
    const t = 1 - Math.pow(0.001, delta);
    leverRef.current.rotation.z = current + (targetAngle - current) * t;
  });

  return (
    <group position={[1.5, -0.3, 0.5]}>
      {/* Pedestal base */}
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.28, 0.32, 0.1, 12]} />
        <meshStandardMaterial color="#3a3a3a" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* Center column */}
      <mesh position={[0, 0.25, 0]}>
        <cylinderGeometry args={[0.1, 0.12, 0.3, 8]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* Lever arm + handle */}
      <group ref={leverRef} position={[0, 0.5, 0]}>
        {/* Cylinder rod */}
        <mesh>
          <cylinderGeometry args={[0.04, 0.04, 0.8, 8]} />
          <meshStandardMaterial color="#888" metalness={0.6} roughness={0.3} />
        </mesh>
        {/* Smooth handle */}
        <mesh position={[0, 0.45, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#d94a4a" emissive="#d94a4a" emissiveIntensity={0.4} />
        </mesh>
      </group>
    </group>
  );
}
