import { useEffect, useMemo } from "react";
import * as THREE from "three";

const RAIL_COLOR = "#7777aa";
const TIE_COLOR = "#553322";

function Rail({ points }: { points: THREE.Vector3[] }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const geometry = useMemo(() => new THREE.TubeGeometry(curve, 32, 0.07, 8, false), [curve]);

  useEffect(() => {
    return () => geometry.dispose();
  }, [geometry]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={RAIL_COLOR} metalness={0.7} roughness={0.2} emissive={RAIL_COLOR} emissiveIntensity={0.05} />
    </mesh>
  );
}

function Ties({ points, count = 20 }: { points: THREE.Vector3[]; count?: number }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const positions = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < count; i++) {
      pts.push(curve.getPointAt(i / (count - 1)));
    }
    return pts;
  }, [curve, count]);

  return (
    <>
      {positions.map((pos, i) => {
        const tangent = curve.getTangentAt(i / (count - 1));
        const angle = Math.atan2(tangent.x, tangent.z);
        return (
          <mesh key={i} position={pos} rotation={[0, angle, 0]}>
            <boxGeometry args={[1.0, 0.08, 0.15]} />
            <meshStandardMaterial color={TIE_COLOR} roughness={0.8} />
          </mesh>
        );
      })}
    </>
  );
}

export function Track() {
  // Main track: z=6 → z=0 (fork point)
  const mainPoints = [
    new THREE.Vector3(0, 0, 6),
    new THREE.Vector3(0, 0, 3),
    new THREE.Vector3(0, 0, 0),
  ];

  // Left fork: z=0 → z=-9
  const leftPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-1.5, 0, -2),
    new THREE.Vector3(-3.5, 0, -5),
    new THREE.Vector3(-5, 0, -9),
  ];

  // Right fork: z=0 → z=-9
  const rightPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1.5, 0, -2),
    new THREE.Vector3(3.5, 0, -5),
    new THREE.Vector3(5, 0, -9),
  ];

  const railOffset = 0.3;

  return (
    <group position={[0, -0.5, 0]}>
      {/* Main track */}
      <Rail points={mainPoints.map((p) => new THREE.Vector3(p.x - railOffset, p.y, p.z))} />
      <Rail points={mainPoints.map((p) => new THREE.Vector3(p.x + railOffset, p.y, p.z))} />
      <Ties points={mainPoints} count={8} />

      {/* Left fork */}
      <Rail points={leftPoints.map((p) => new THREE.Vector3(p.x - railOffset, p.y, p.z))} />
      <Rail points={leftPoints.map((p) => new THREE.Vector3(p.x + railOffset, p.y, p.z))} />
      <Ties points={leftPoints} count={10} />

      {/* Right fork */}
      <Rail points={rightPoints.map((p) => new THREE.Vector3(p.x - railOffset, p.y, p.z))} />
      <Rail points={rightPoints.map((p) => new THREE.Vector3(p.x + railOffset, p.y, p.z))} />
      <Ties points={rightPoints} count={10} />
    </group>
  );
}
