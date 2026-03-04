import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

export function Environment() {
  const fogRef = useRef<THREE.Fog>(null);

  useFrame(({ clock }) => {
    if (fogRef.current) {
      fogRef.current.near = 25 + Math.sin(clock.getElapsedTime() * 0.1) * 3;
    }
  });

  return (
    <>
      <fog ref={fogRef} attach="fog" args={["#151525", 25, 80]} />

      {/* Strong ambient */}
      <ambientLight intensity={0.8} color="#99aabb" />

      {/* Main directional */}
      <directionalLight
        position={[5, 20, 10]}
        intensity={1.2}
        color="#ccddee"
        castShadow
      />

      {/* Fill from left */}
      <directionalLight position={[-8, 10, 5]} intensity={0.5} color="#8899bb" />

      {/* Red accent at fork */}
      <pointLight position={[0, 2, 0]} intensity={0.8} color="#dd5555" distance={12} />

      {/* Bright lights on both fork ends */}
      <pointLight position={[-5, 4, -7]} intensity={1.0} color="#99bbdd" distance={15} />
      <pointLight position={[5, 4, -7]} intensity={1.0} color="#99bbdd" distance={15} />

      {/* Light behind trolley */}
      <pointLight position={[0, 3, 6]} intensity={0.6} color="#bbaa88" distance={12} />

      {/* Ground — lighter color */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#2a2a40" roughness={0.85} />
      </mesh>

      {/* Distant structures */}
      {[
        { x: -18, h: 10, z: -25 },
        { x: -10, h: 7, z: -22 },
        { x: 10, h: 8, z: -24 },
        { x: 18, h: 12, z: -25 },
      ].map((b, i) => (
        <mesh key={i} position={[b.x, b.h / 2 - 0.5, b.z]}>
          <boxGeometry args={[3, b.h, 3]} />
          <meshStandardMaterial color="#1a1a35" roughness={0.9} />
        </mesh>
      ))}
    </>
  );
}
