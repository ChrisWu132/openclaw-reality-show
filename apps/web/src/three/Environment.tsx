import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useGameStore, type ScenePhase } from "../stores/gameStore";

// Reusable objects to avoid per-frame allocations
const _scaleVec = new THREE.Vector3();
const _dirVec = new THREE.Vector3();
const _quat = new THREE.Quaternion();
const _downVec = new THREE.Vector3(0, -1, 0);

function Starfield() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 200;
  const dummy = useMemo(() => new THREE.Matrix4(), []);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 100;
      arr[i * 3 + 1] = Math.random() * 30 + 15;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 100;
    }
    return arr;
  }, []);

  // Set matrices once — static starfield, no per-frame updates
  useEffect(() => {
    if (!meshRef.current) return;
    for (let i = 0; i < count; i++) {
      dummy.makeTranslation(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      meshRef.current.setMatrixAt(i, dummy);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [positions, dummy]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.03, 4, 4]} />
      <meshBasicMaterial color="#aabbee" transparent opacity={0.6} />
    </instancedMesh>
  );
}

function FloatingEmbers() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 50;
  const dummy = useMemo(() => new THREE.Matrix4(), []);
  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 30;
      arr[i * 3 + 1] = Math.random() * 3 + 0.5;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 30 + 2;
    }
    return arr;
  }, []);
  const speeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.15 + Math.random() * 0.25;
    return arr;
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const colors = ["#ff8833", "#ffaa22", "#ff5522"];
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
      color.set(colors[i % colors.length]);
      meshRef.current.setColorAt(i, color);
    }
    meshRef.current.instanceColor!.needsUpdate = true;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3] + Math.sin(t * speeds[i] + i) * 1.5;
      const y = positions[i * 3 + 1] + Math.sin(t * speeds[i] * 0.7 + i * 2) * 0.8 + t * 0.1;
      const z = positions[i * 3 + 2] + Math.cos(t * speeds[i] * 0.5 + i * 3) * 1.0;
      const wrappedY = ((y - 0.5) % 5) + 0.5;
      dummy.makeTranslation(x, wrappedY, z);
      meshRef.current.setMatrixAt(i, dummy);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.04, 6, 6]} />
      <meshStandardMaterial color="#ff8833" transparent opacity={0.4} emissive="#ff6600" emissiveIntensity={2} toneMapped={false} vertexColors />
    </instancedMesh>
  );
}

function GroundFog() {
  const meshRef = useRef<THREE.Mesh>(null);
  const alphaMap = useMemo(() => {
    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.7, "rgba(255,255,255,0.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    return new THREE.CanvasTexture(canvas);
  }, []);

  useEffect(() => {
    return () => alphaMap.dispose();
  }, [alphaMap]);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.16 + Math.sin(clock.getElapsedTime() * 0.3) * 0.04;
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
      <planeGeometry args={[60, 60]} />
      <meshBasicMaterial color="#667799" transparent opacity={0.16} alphaMap={alphaMap} depthWrite={false} />
    </mesh>
  );
}

function HorizonGlow() {
  const meshRef = useRef<THREE.Mesh>(null);
  const warmRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.25 + Math.sin(t * 0.2) * 0.06;
    }
    if (warmRef.current) {
      const mat = warmRef.current.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.12 + Math.sin(t * 0.15 + 1) * 0.04;
    }
  });

  return (
    <>
      <mesh ref={meshRef} position={[0, 2, -45]} rotation={[0, 0, 0]}>
        <planeGeometry args={[80, 8]} />
        <meshBasicMaterial color="#553322" transparent opacity={0.25} depthWrite={false} />
      </mesh>
      <mesh ref={warmRef} position={[0, 4, -44]} rotation={[0, 0, 0]}>
        <planeGeometry args={[80, 6]} />
        <meshBasicMaterial color="#442211" transparent opacity={0.12} depthWrite={false} />
      </mesh>
    </>
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
    ctx.strokeStyle = "rgba(0, 0, 0, 0.25)";
    ctx.lineWidth = 1;
    const gridStep = size / 16;
    for (let x = 0; x <= size; x += gridStep) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
    }
    for (let y = 0; y <= size; y += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    }
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
      <meshStandardMaterial color="#252538" roughness={0.85} metalness={0.1} roughnessMap={roughnessMap} />
    </mesh>
  );
}

function seededRandom(seed: number) {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
}

const BUILDINGS = [
  { x: -22, h: 8, w: 3, z: -28, ry: 0.1 },
  { x: -18, h: 10, w: 3, z: -25, ry: 0 },
  { x: -13, h: 6, w: 2, z: -26, ry: -0.05 },
  { x: -10, h: 7, w: 2.5, z: -22, ry: 0 },
  { x: -5, h: 5, w: 2, z: -30, ry: 0.15 },
  { x: 5, h: 9, w: 2.5, z: -27, ry: -0.1 },
  { x: 10, h: 8, w: 3, z: -24, ry: 0 },
  { x: 14, h: 14, w: 4, z: -30, ry: 0.05, warm: true },
  { x: 18, h: 12, w: 3, z: -25, ry: 0 },
  { x: 23, h: 7, w: 2.5, z: -28, ry: -0.08, warm: true },
];

function Buildings() {
  return (
    <>
      {BUILDINGS.map((b, i) => {
        const windowRows = Math.floor(b.h / 2);
        const windows = [];
        const windowColor = b.warm ? "#aa8866" : "#556688";
        const windowEmissive = b.warm ? "#aa8866" : "#667799";
        for (let row = 0; row < windowRows; row++) {
          for (let col = -1; col <= 1; col++) {
            if (seededRandom(i * 100 + row * 10 + col + 7) < 0.3) continue;
            windows.push(
              <mesh
                key={`w-${row}-${col}`}
                position={[col * 0.6, -b.h / 2 + 1 + row * 2, b.w / 2 + 0.02]}
              >
                <boxGeometry args={[0.35, 0.5, 0.05]} />
                <meshStandardMaterial
                  color={windowColor}
                  emissive={windowEmissive}
                  emissiveIntensity={1.8}
                  toneMapped={false}
                />
              </mesh>,
            );
          }
        }
        return (
          <group key={i} position={[b.x, b.h / 2 - 0.5, b.z]} rotation={[0, b.ry, 0]}>
            <mesh>
              <boxGeometry args={[b.w, b.h, b.w]} />
              <meshStandardMaterial color="#2a2a48" roughness={0.9} />
            </mesh>
            {i % 3 === 0 && (
              <mesh position={[0, b.h / 2 + 0.02, 0]}>
                <boxGeometry args={[b.w + 0.1, 0.06, b.w + 0.1]} />
                <meshStandardMaterial
                  color="#445566"
                  emissive="#334466"
                  emissiveIntensity={0.8}
                  toneMapped={false}
                />
              </mesh>
            )}
            {windows}
          </group>
        );
      })}
    </>
  );
}

function SkyDome() {
  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        colorTop: { value: new THREE.Color("#050510") },
        colorBottom: { value: new THREE.Color("#1a1a30") },
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPos = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPos.xyz;
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform vec3 colorTop;
        uniform vec3 colorBottom;
        varying vec3 vWorldPosition;
        void main() {
          float h = normalize(vWorldPosition).y;
          float t = clamp(h * 0.5 + 0.5, 0.0, 1.0);
          gl_FragColor = vec4(mix(colorBottom, colorTop, t), 1.0);
        }
      `,
    });
  }, []);

  useEffect(() => {
    return () => material.dispose();
  }, [material]);

  return (
    <mesh material={material}>
      <sphereGeometry args={[50, 32, 16]} />
    </mesh>
  );
}

function ForkLight() {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current) return;
    const t = clock.getElapsedTime();
    lightRef.current.intensity = 1.4 + Math.sin(t * 1.5) * 0.6;
  });

  return (
    <pointLight ref={lightRef} position={[0, 2, 0]} intensity={1.5} color="#dd5555" distance={12} />
  );
}

function BarrierPosts() {
  const posts = [
    { x: -1.5, z: -3 },
    { x: -2.5, z: -5 },
    { x: -3.5, z: -7 },
    { x: -4.5, z: -9 },
    { x: 1.5, z: -3 },
    { x: 2.5, z: -5 },
    { x: 3.5, z: -7 },
    { x: 4.5, z: -9 },
  ];

  return (
    <>
      {posts.map((p, i) => (
        <group key={i} position={[p.x, -0.1, p.z]}>
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
            <meshStandardMaterial color="#cccccc" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.6, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.4, 6]} />
            <meshStandardMaterial color="#cc3333" roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.82, 0]}>
            <coneGeometry args={[0.08, 0.12, 6]} />
            <meshStandardMaterial color="#cc3333" roughness={0.6} />
          </mesh>
        </group>
      ))}
    </>
  );
}

// ===== NEW ENVIRONMENT COMPONENTS =====

/** Sweeping searchlight from the tallest building */
function Searchlight() {
  const spotRef = useRef<THREE.SpotLight>(null);
  const targetRef = useRef<THREE.Object3D>(null);
  const coneRef = useRef<THREE.Mesh>(null);

  // The tallest building: x=14, z=-30, h=14
  const origin = useMemo(() => new THREE.Vector3(14, 13, -30), []);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const angle = t * 0.52; // ~12s period
    const radius = 20;
    const tx = origin.x + Math.sin(angle) * radius;
    const tz = origin.z + Math.cos(angle) * 10;

    if (targetRef.current) {
      targetRef.current.position.set(tx, -0.5, tz);
    }
    if (spotRef.current && targetRef.current) {
      spotRef.current.target = targetRef.current;
    }

    // Rotate cone to follow the beam direction
    if (coneRef.current) {
      _dirVec.set(tx - origin.x, -13.5, tz - origin.z).normalize();
      _quat.setFromUnitVectors(_downVec, _dirVec);
      coneRef.current.quaternion.copy(_quat);
    }
  });

  return (
    <group>
      <spotLight
        ref={spotRef}
        position={[origin.x, origin.y, origin.z]}
        intensity={3}
        color="#aabbcc"
        angle={0.15}
        penumbra={0.5}
        distance={50}
        castShadow={false}
      />
      <object3D ref={targetRef} position={[14, -0.5, -20]} />
      {/* Volumetric beam cone */}
      <mesh ref={coneRef} position={[origin.x, origin.y, origin.z]}>
        <coneGeometry args={[4, 25, 16, 1, true]} />
        <meshBasicMaterial color="#8899aa" transparent opacity={0.03} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** Industrial smokestacks with rising smoke particles */
function Smokestacks() {
  const STACKS = [
    { x: -16, z: -27, h: 7 },
    { x: 8, z: -29, h: 8 },
    { x: 20, z: -27, h: 6 },
  ];

  return (
    <>
      {STACKS.map((s, i) => (
        <group key={i}>
          {/* Stack cylinder */}
          <mesh position={[s.x, s.h / 2 - 0.5, s.z]}>
            <cylinderGeometry args={[0.3, 0.4, s.h, 8]} />
            <meshStandardMaterial color="#333340" roughness={0.9} />
          </mesh>
          {/* Cap ring */}
          <mesh position={[s.x, s.h - 0.5, s.z]}>
            <cylinderGeometry args={[0.45, 0.45, 0.15, 8]} />
            <meshStandardMaterial color="#444450" roughness={0.8} />
          </mesh>
          <SmokeColumn x={s.x} y={s.h - 0.3} z={s.z} />
        </group>
      ))}
    </>
  );
}

function SmokeColumn({ x, y, z }: { x: number; y: number; z: number }) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 15;
  const dummy = useMemo(() => new THREE.Matrix4(), []);
  const offsets = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 0.3;
      arr[i * 3 + 1] = Math.random() * 8;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 0.3;
    }
    return arr;
  }, []);
  const speeds = useMemo(() => {
    const arr = new Float32Array(count);
    for (let i = 0; i < count; i++) arr[i] = 0.3 + Math.random() * 0.4;
    return arr;
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const rawY = (offsets[i * 3 + 1] + t * speeds[i]) % 8;
      const progress = rawY / 8; // 0..1
      const scale = 0.15 + progress * 0.6;
      const px = x + offsets[i * 3] + Math.sin(t * 0.5 + i) * progress * 0.8;
      const py = y + rawY;
      const pz = z + offsets[i * 3 + 2] + Math.cos(t * 0.3 + i * 2) * progress * 0.5;
      dummy.makeTranslation(px, py, pz);
      dummy.scale(_scaleVec.set(scale, scale * 0.7, scale));
      meshRef.current.setMatrixAt(i, dummy);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <sphereGeometry args={[0.5, 6, 6]} />
      <meshBasicMaterial color="#555566" transparent opacity={0.08} depthWrite={false} />
    </instancedMesh>
  );
}

/** Flickering street lamps in the mid-ground */
function StreetLamps() {
  const LAMPS = [
    { x: -7, z: -13 },
    { x: -3, z: -16 },
    { x: 2, z: -14 },
    { x: 6, z: -17 },
    { x: -5, z: -18 },
    { x: 8, z: -13 },
  ];

  return (
    <>
      {LAMPS.map((l, i) => (
        <StreetLamp key={i} x={l.x} z={l.z} seed={i} />
      ))}
    </>
  );
}

function StreetLamp({ x, z, seed }: { x: number; z: number; seed: number }) {
  const lightRef = useRef<THREE.PointLight>(null);
  const bulbRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (!lightRef.current || !bulbRef.current) return;
    const t = clock.getElapsedTime();
    // Mostly stable, occasional brief dim
    const flicker = Math.sin(t * 30 + seed * 100) > 0.92 ? 0.3 : 1.0;
    const baseIntensity = 0.8 + Math.sin(t * 2 + seed * 7) * 0.1;
    lightRef.current.intensity = baseIntensity * flicker;
    const mat = bulbRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 2 * flicker;
  });

  return (
    <group position={[x, -0.5, z]}>
      {/* Pole */}
      <mesh position={[0, 1.5, 0]}>
        <cylinderGeometry args={[0.04, 0.06, 3, 6]} />
        <meshStandardMaterial color="#444455" roughness={0.8} />
      </mesh>
      {/* Bulb */}
      <mesh ref={bulbRef} position={[0, 3.1, 0]}>
        <sphereGeometry args={[0.12, 8, 8]} />
        <meshStandardMaterial color="#ffcc88" emissive="#ffaa44" emissiveIntensity={2} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} position={[0, 3, 0]} intensity={0.8} color="#ffcc88" distance={6} />
    </group>
  );
}

/** Power lines connecting buildings via catenary curves */
function PowerLines() {
  const WIRES = [
    { from: [-22, 7.5, -28], to: [-18, 9.5, -25] },
    { from: [-18, 9.5, -25], to: [-13, 5.5, -26] },
    { from: [5, 8.5, -27], to: [10, 7.5, -24] },
    { from: [14, 13.5, -30], to: [18, 11.5, -25] },
  ];

  const geometries = useMemo(() => {
    return WIRES.map(({ from, to }) => {
      const start = new THREE.Vector3(...(from as [number, number, number]));
      const end = new THREE.Vector3(...(to as [number, number, number]));
      const mid = start.clone().lerp(end, 0.5);
      mid.y -= 1.5; // sag
      const curve = new THREE.CatmullRomCurve3([start, mid, end]);
      return new THREE.TubeGeometry(curve, 20, 0.02, 4, false);
    });
  }, []);

  useEffect(() => {
    return () => geometries.forEach((g) => g.dispose());
  }, [geometries]);

  return (
    <>
      {geometries.map((geo, i) => (
        <mesh key={i} geometry={geo}>
          <meshStandardMaterial color="#555566" roughness={0.5} metalness={0.6} />
        </mesh>
      ))}
    </>
  );
}

/** Light rain / industrial mist particles */
function RainMist() {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const count = 80;
  const dummy = useMemo(() => new THREE.Matrix4(), []);
  const data = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = Math.random() * 16;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 40;
      speeds[i] = 3 + Math.random() * 4;
    }
    return { positions, speeds };
  }, []);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    for (let i = 0; i < count; i++) {
      const x = data.positions[i * 3] + Math.sin(t * 0.3 + i) * 0.5;
      let y = data.positions[i * 3 + 1] - (t * data.speeds[i]) % 16;
      if (y < -0.5) y += 16;
      const z = data.positions[i * 3 + 2];
      dummy.makeTranslation(x, y, z);
      dummy.scale(_scaleVec.set(0.015, 0.15, 0.015));
      meshRef.current.setMatrixAt(i, dummy);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
      <capsuleGeometry args={[0.5, 1, 2, 4]} />
      <meshBasicMaterial color="#8899aa" transparent opacity={0.12} depthWrite={false} />
    </instancedMesh>
  );
}

/** Neon accent lights on select buildings */
function NeonAccents() {
  const ACCENTS = [
    { x: -18, y: 6, z: -25 + 1.52, color: "#ff2266", flicker: true },
    { x: 5, y: 5, z: -27 + 1.27, color: "#22ffcc", flicker: false },
    { x: 14, y: 10, z: -30 + 2.02, color: "#ffaa00", flicker: true },
  ];

  return (
    <>
      {ACCENTS.map((a, i) => (
        <NeonStrip key={i} position={[a.x, a.y, a.z]} color={a.color} flicker={a.flicker} seed={i} />
      ))}
    </>
  );
}

function NeonStrip({ position, color, flicker, seed }: { position: [number, number, number]; color: string; flicker: boolean; seed: number }) {
  const meshRef = useRef<THREE.Mesh>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame(({ clock }) => {
    if (!meshRef.current || !lightRef.current) return;
    const t = clock.getElapsedTime();
    let intensity = 1.0;
    if (flicker) {
      intensity = Math.sin(t * 20 + seed * 50) > 0.88 ? 0.2 : 1.0;
    }
    const mat = meshRef.current.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 3 * intensity;
    lightRef.current.intensity = 1.5 * intensity;
  });

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <boxGeometry args={[1.2, 0.12, 0.05]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <pointLight ref={lightRef} intensity={1.5} color={color} distance={5} />
    </group>
  );
}

// ===== MAIN ENVIRONMENT =====

export function Environment() {
  const fogRef = useRef<THREE.Fog>(null);
  const ambientRef = useRef<THREE.AmbientLight>(null);
  const fogBaseRef = useRef(25);
  const scenePhase = useGameStore((s) => s.scenePhase);

  useFrame(({ clock }, delta) => {
    const isRoundStart = scenePhase === "round_start";
    const targetFogNear = isRoundStart ? 35 : 25;
    const targetAmbient = isRoundStart ? 1.5 : 0.8;
    const lerpT = 1 - Math.pow(0.05, delta);

    fogBaseRef.current += (targetFogNear - fogBaseRef.current) * lerpT;
    if (fogRef.current) {
      fogRef.current.near = fogBaseRef.current + Math.sin(clock.getElapsedTime() * 0.1) * 1.5;
    }
    if (ambientRef.current) {
      ambientRef.current.intensity += (targetAmbient - ambientRef.current.intensity) * lerpT;
    }
  });

  return (
    <>
      <fog ref={fogRef} attach="fog" args={["#151525", 25, 80]} />

      <SkyDome />

      <ambientLight ref={ambientRef} intensity={0.8} color="#99aabb" />

      <directionalLight
        position={[5, 20, 10]}
        intensity={1.2}
        color="#ccddee"
        castShadow
      />

      <directionalLight position={[-8, 10, 5]} intensity={0.5} color="#8899bb" />

      <ForkLight />

      <pointLight position={[-5, 4, -7]} intensity={1.0} color="#99bbdd" distance={15} />
      <pointLight position={[5, 4, -7]} intensity={1.0} color="#99bbdd" distance={15} />

      <pointLight position={[0, 3, 6]} intensity={0.6} color="#bbaa88" distance={12} />

      <GroundPlane />
      <Buildings />
      <BarrierPosts />
      <FloatingEmbers />
      <Starfield />
      <GroundFog />
      <HorizonGlow />

      {/* New atmospheric elements */}
      <Searchlight />
      <Smokestacks />
      <StreetLamps />
      <PowerLines />
      <RainMist />
      <NeonAccents />
    </>
  );
}
