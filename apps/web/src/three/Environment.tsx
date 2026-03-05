import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function DustMotes() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 60;
  const dummy = useMemo(() => new THREE.Matrix4(), []);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 8 + 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    return arr;
  }, []);
  const speeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.1 + Math.random() * 0.3;
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3] + Math.sin(t * speeds[i] + i) * 0.5;
      const y = positions[i * 3 + 1] + Math.sin(t * speeds[i] * 0.7 + i * 2) * 0.3;
      const z = positions[i * 3 + 2] + Math.cos(t * speeds[i] * 0.5 + i * 3) * 0.5;
      dummy.makeTranslation(x, y, z);
      meshRef.current.setMatrixAt(i, dummy);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.02, 4, 4]} />
      <meshStandardMaterial color="#aaaaaa" transparent opacity={0.25} emissive="#aaaaaa" emissiveIntensity={0.3} />
    </instancedMesh>
  );
}

function GroundPlane() {
  const meshRef = useRef<THREE.Mesh>(null);
  const roughnessMap = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(size, size);
    for (let i = 0; i < imageData.data.length; i += 4) {
      const noise = Math.random() * 60 + 180;
      imageData.data[i] = noise;
      imageData.data[i + 1] = noise;
      imageData.data[i + 2] = noise;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(8, 8);
    return tex;
  }, []);

  useEffect(() => {
    return () => roughnessMap.dispose();
  }, [roughnessMap]);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <meshStandardMaterial color="#2a2a40" roughness={0.85} roughnessMap={roughnessMap} />
    </mesh>
  );
}

const BUILDINGS = [
  { x: -18, h: 10, z: -25 },
  { x: -10, h: 7, z: -22 },
  { x: 10, h: 8, z: -24 },
  { x: 18, h: 12, z: -25 },
];

function Buildings() {
  return (
    <>
      {BUILDINGS.map((b, i) => {
        // Generate window strips on front face
        const windowRows = Math.floor(b.h / 2);
        const windows = [];
        for (let row = 0; row < windowRows; row++) {
          for (let col = -1; col <= 1; col++) {
            windows.push(
              <mesh
                key={`w-${row}-${col}`}
                position={[col * 0.6, -b.h / 2 + 1 + row * 2, 1.52]}
              >
                <boxGeometry args={[0.35, 0.5, 0.05]} />
                <meshStandardMaterial
                  color="#334466"
                  emissive="#445588"
                  emissiveIntensity={0.6}
                  toneMapped={false}
                />
              </mesh>,
            );
          }
        }
        return (
          <group key={i} position={[b.x, b.h / 2 - 0.5, b.z]}>
            <mesh>
              <boxGeometry args={[3, b.h, 3]} />
              <meshStandardMaterial color="#1a1a35" roughness={0.9} />
            </mesh>
            {windows}
          </group>
        );
      })}
    </>
  );
}

export function Environment() {
  const fogRef = useRef<THREE.Fog>(null);

  useFrame(({ clock }) => {
    if (fogRef.current) {
      fogRef.current.near = 25 + Math.sin(clock.getElapsedTime() * 0.1) * 1.5;
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

      <GroundPlane />
      <Buildings />
      <DustMotes />
    </>
  );
}
