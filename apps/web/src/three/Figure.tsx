import { useRef, useMemo } from "react";
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

const SKIN_COLOR = "#e8c4a0";

interface FigureProps {
  type: string;
  position: [number, number, number];
  hit?: boolean;
  hitDelay?: number;
}

type Posture = {
  leftArmZ: number;
  rightArmZ: number;
  leftForearmZ: number;
  rightForearmZ: number;
  torsoX: number;
  headX: number;
};

function getPosture(type: string): Posture {
  switch (type) {
    case "child":
    case "elder":
      // Fearful — arms raised
      return {
        leftArmZ: 1.2,
        rightArmZ: -1.2,
        leftForearmZ: 0.6,
        rightForearmZ: -0.6,
        torsoX: -0.05,
        headX: -0.1,
      };
    case "prisoner":
      // Crouching
      return {
        leftArmZ: 0.3,
        rightArmZ: -0.3,
        leftForearmZ: 0.8,
        rightForearmZ: -0.8,
        torsoX: 0.3,
        headX: 0.2,
      };
    case "self":
      // Defiant — arms spread
      return {
        leftArmZ: 1.0,
        rightArmZ: -1.0,
        leftForearmZ: -0.2,
        rightForearmZ: 0.2,
        torsoX: -0.1,
        headX: -0.15,
      };
    default:
      // Standing upright (worker, official, group)
      return {
        leftArmZ: 0.15,
        rightArmZ: -0.15,
        leftForearmZ: 0.1,
        rightForearmZ: -0.1,
        torsoX: 0,
        headX: 0,
      };
  }
}

export function Figure({ type, position, hit = false, hitDelay = 0 }: FigureProps) {
  const groupRef = useRef<THREE.Group>(null);
  const torsoRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const leftArmRef = useRef<THREE.Group>(null);
  const rightArmRef = useRef<THREE.Group>(null);
  const leftForearmRef = useRef<THREE.Group>(null);
  const rightForearmRef = useRef<THREE.Group>(null);

  const hitTimeRef = useRef(-1);
  const wasHitRef = useRef(false);

  const color = TYPE_COLORS[type] || "#8899aa";
  const posture = useMemo(() => getPosture(type), [type]);

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.6, emissive: color, emissiveIntensity: 0.15 }),
    [color],
  );
  const skinMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: SKIN_COLOR, roughness: 0.7 }),
    [],
  );
  const hitMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color, roughness: 0.4, emissive: "#ff4444", emissiveIntensity: 0.8 }),
    [color],
  );

  useFrame(({ clock }, delta) => {
    if (!groupRef.current || !torsoRef.current) return;

    // Detect hit transition
    if (hit && !wasHitRef.current) {
      hitTimeRef.current = clock.getElapsedTime() + hitDelay;
      wasHitRef.current = true;
    }
    if (!hit) {
      wasHitRef.current = false;
      hitTimeRef.current = -1;
    }

    const elapsed = clock.getElapsedTime();
    const hitActive = hit && hitTimeRef.current >= 0 && elapsed >= hitTimeRef.current;
    const hitT = hitActive ? Math.min((elapsed - hitTimeRef.current) / 1.2, 1) : 0;

    if (hitActive && hitT > 0) {
      // 3-phase hit animation
      if (hitT < 0.25) {
        // Phase 1: Impact recoil
        const p = hitT / 0.25;
        const ease = p * p;
        groupRef.current.rotation.z = -0.3 * ease;
        groupRef.current.position.y = position[1] + 0.15 * Math.sin(p * Math.PI);
        if (torsoRef.current) torsoRef.current.rotation.x = -0.4 * ease;
        if (leftArmRef.current) leftArmRef.current.rotation.z = posture.leftArmZ + 1.5 * ease;
        if (rightArmRef.current) rightArmRef.current.rotation.z = posture.rightArmZ - 1.5 * ease;
      } else if (hitT < 0.67) {
        // Phase 2: Tumble sideways + drop
        const p = (hitT - 0.25) / 0.42;
        const ease = p * (2 - p); // ease-out quad
        groupRef.current.rotation.z = -0.3 + (-Math.PI / 2 + 0.3) * ease;
        groupRef.current.position.y = position[1] - 0.5 * ease;
        if (torsoRef.current) torsoRef.current.rotation.x = -0.4 + 0.4 * ease;
      } else {
        // Phase 3: Settle — micro-bounce
        const p = (hitT - 0.67) / 0.33;
        const bounce = Math.sin(p * Math.PI * 2) * 0.03 * (1 - p);
        groupRef.current.rotation.z = -Math.PI / 2 + bounce;
        groupRef.current.position.y = position[1] - 0.5 + bounce * 0.5;
      }

      // Flash emissive on impact
      if (hitT < 0.3) {
        const flash = 1 - hitT / 0.3;
        bodyMat.emissiveIntensity = 0.15 + flash * 0.8;
        bodyMat.emissive.set("#ff4444");
      } else {
        bodyMat.emissiveIntensity = 0.15;
        bodyMat.emissive.set(color);
      }
    } else if (!hit) {
      // Idle animations
      const t = elapsed;
      const seed = position[0] * 3.7 + position[2] * 1.3;

      // Breathing — torso scale oscillation
      if (torsoRef.current) {
        torsoRef.current.scale.y = 1 + Math.sin(t * 2.5 + seed) * 0.015;
        torsoRef.current.rotation.x = posture.torsoX;
      }

      // Weight shift — subtle sway
      groupRef.current.position.x = position[0] + Math.sin(t * 0.8 + seed) * 0.02;
      groupRef.current.position.y = position[1];
      groupRef.current.rotation.z = Math.sin(t * 1.5 + seed) * 0.02;

      // Head micro-nod
      if (headRef.current) {
        headRef.current.rotation.x = posture.headX + Math.sin(t * 1.2 + seed + 1) * 0.04;
        headRef.current.rotation.z = Math.sin(t * 0.7 + seed + 2) * 0.03;
      }

      // Arm sway
      if (leftArmRef.current) leftArmRef.current.rotation.z = posture.leftArmZ + Math.sin(t * 1.1 + seed) * 0.05;
      if (rightArmRef.current) rightArmRef.current.rotation.z = posture.rightArmZ + Math.sin(t * 1.1 + seed + Math.PI) * 0.05;
      if (leftForearmRef.current) leftForearmRef.current.rotation.z = posture.leftForearmZ;
      if (rightForearmRef.current) rightForearmRef.current.rotation.z = posture.rightForearmZ;

      bodyMat.emissiveIntensity = 0.15;
      bodyMat.emissive.set(color);
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Hips */}
      <mesh position={[0, 0.35, 0]} castShadow material={bodyMat}>
        <cylinderGeometry args={[0.16, 0.18, 0.2, 8]} />
      </mesh>

      {/* Torso */}
      <group ref={torsoRef} position={[0, 0.55, 0]}>
        <mesh castShadow material={bodyMat}>
          <cylinderGeometry args={[0.2, 0.17, 0.45, 8]} />
        </mesh>

        {/* Head */}
        <mesh ref={headRef} position={[0, 0.38, 0]} castShadow material={skinMat}>
          <sphereGeometry args={[0.15, 12, 12]} />
        </mesh>

        {/* Left arm group */}
        <group ref={leftArmRef} position={[0.25, 0.15, 0]} rotation={[0, 0, posture.leftArmZ]}>
          {/* Upper arm */}
          <mesh position={[0, -0.13, 0]} castShadow material={bodyMat}>
            <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
          </mesh>
          {/* Forearm */}
          <group ref={leftForearmRef} position={[0, -0.3, 0]} rotation={[0, 0, posture.leftForearmZ]}>
            <mesh position={[0, -0.1, 0]} castShadow material={skinMat}>
              <capsuleGeometry args={[0.045, 0.18, 4, 8]} />
            </mesh>
          </group>
        </group>

        {/* Right arm group */}
        <group ref={rightArmRef} position={[-0.25, 0.15, 0]} rotation={[0, 0, posture.rightArmZ]}>
          {/* Upper arm */}
          <mesh position={[0, -0.13, 0]} castShadow material={bodyMat}>
            <capsuleGeometry args={[0.055, 0.2, 4, 8]} />
          </mesh>
          {/* Forearm */}
          <group ref={rightForearmRef} position={[0, -0.3, 0]} rotation={[0, 0, posture.rightForearmZ]}>
            <mesh position={[0, -0.1, 0]} castShadow material={skinMat}>
              <capsuleGeometry args={[0.045, 0.18, 4, 8]} />
            </mesh>
          </group>
        </group>
      </group>

      {/* Left thigh */}
      <mesh position={[0.09, 0.15, 0]} castShadow material={bodyMat}>
        <capsuleGeometry args={[0.065, 0.15, 4, 8]} />
      </mesh>
      {/* Left shin */}
      <mesh position={[0.09, -0.08, 0]} castShadow material={bodyMat}>
        <capsuleGeometry args={[0.055, 0.15, 4, 8]} />
      </mesh>

      {/* Right thigh */}
      <mesh position={[-0.09, 0.15, 0]} castShadow material={bodyMat}>
        <capsuleGeometry args={[0.065, 0.15, 4, 8]} />
      </mesh>
      {/* Right shin */}
      <mesh position={[-0.09, -0.08, 0]} castShadow material={bodyMat}>
        <capsuleGeometry args={[0.055, 0.15, 4, 8]} />
      </mesh>
    </group>
  );
}
