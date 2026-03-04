import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Environment() {
  const fogRef = useRef<THREE.Fog>(null);

  useFrame(({ clock }) => {
    if (fogRef.current) {
      const t = clock.getElapsedTime();
      fogRef.current.near = 8 + Math.sin(t * 0.1) * 2;
    }
  });

  return (
    <>
      <fog ref={fogRef} attach="fog" args={["#0a0a1a", 10, 50]} />
      <ambientLight intensity={0.15} color="#4a6080" />
      <directionalLight position={[10, 15, 5]} intensity={0.4} color="#8090a0" />
      <pointLight position={[0, 3, 0]} intensity={0.3} color="#d94a4a" distance={15} />

      {/* Ground plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#1a1a2e" roughness={0.9} />
      </mesh>

      {/* Distant structures */}
      {[-20, -12, 12, 20].map((x, i) => (
        <mesh key={i} position={[x, 3, -25]} castShadow>
          <boxGeometry args={[3, 8 + i * 2, 3]} />
          <meshStandardMaterial color="#0d0d20" roughness={0.8} />
        </mesh>
      ))}
    </>
  );
}
