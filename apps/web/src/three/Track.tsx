import { useMemo } from "react";
import * as THREE from "three";

const RAIL_COLOR = "#3a3a50";
const TIE_COLOR = "#2a1a10";

function Rail({ points }: { points: THREE.Vector3[] }) {
  const curve = useMemo(() => new THREE.CatmullRomCurve3(points), [points]);
  const geometry = useMemo(() => {
    const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.05, 8, false);
    return tubeGeo;
  }, [curve]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial color={RAIL_COLOR} metalness={0.6} roughness={0.3} />
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
            <boxGeometry args={[0.8, 0.06, 0.12]} />
            <meshStandardMaterial color={TIE_COLOR} roughness={0.9} />
          </mesh>
        );
      })}
    </>
  );
}

export function Track() {
  // Main track (straight approach)
  const mainPoints = [
    new THREE.Vector3(0, 0, 15),
    new THREE.Vector3(0, 0, 5),
    new THREE.Vector3(0, 0, 0),
  ];

  // Left fork
  const leftPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(-1.5, 0, -3),
    new THREE.Vector3(-4, 0, -8),
    new THREE.Vector3(-5, 0, -12),
  ];

  // Right fork
  const rightPoints = [
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(1.5, 0, -3),
    new THREE.Vector3(4, 0, -8),
    new THREE.Vector3(5, 0, -12),
  ];

  const railOffset = 0.25;

  return (
    <group position={[0, -0.45, 0]}>
      {/* Main track - two rails */}
      <Rail points={mainPoints.map((p) => new THREE.Vector3(p.x - railOffset, p.y, p.z))} />
      <Rail points={mainPoints.map((p) => new THREE.Vector3(p.x + railOffset, p.y, p.z))} />
      <Ties points={mainPoints} count={15} />

      {/* Left fork */}
      <Rail points={leftPoints.map((p) => new THREE.Vector3(p.x - railOffset, p.y, p.z))} />
      <Rail points={leftPoints.map((p) => new THREE.Vector3(p.x + railOffset, p.y, p.z))} />
      <Ties points={leftPoints} count={12} />

      {/* Right fork */}
      <Rail points={rightPoints.map((p) => new THREE.Vector3(p.x - railOffset, p.y, p.z))} />
      <Rail points={rightPoints.map((p) => new THREE.Vector3(p.x + railOffset, p.y, p.z))} />
      <Ties points={rightPoints} count={12} />
    </group>
  );
}
