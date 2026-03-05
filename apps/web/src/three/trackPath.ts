import * as THREE from "three";

// Track group is offset by y=-0.5 in Track.tsx
const TRACK_Y = -0.5;

const MAIN_POINTS = [
  new THREE.Vector3(0, TRACK_Y, 6),
  new THREE.Vector3(0, TRACK_Y, 3),
  new THREE.Vector3(0, TRACK_Y, 0),
];

const LEFT_FORK_POINTS = [
  new THREE.Vector3(0, TRACK_Y, 0),
  new THREE.Vector3(-1.5, TRACK_Y, -2),
  new THREE.Vector3(-3.5, TRACK_Y, -5),
  new THREE.Vector3(-5, TRACK_Y, -9),
];

const RIGHT_FORK_POINTS = [
  new THREE.Vector3(0, TRACK_Y, 0),
  new THREE.Vector3(1.5, TRACK_Y, -2),
  new THREE.Vector3(3.5, TRACK_Y, -5),
  new THREE.Vector3(5, TRACK_Y, -9),
];

/** Full path: main straight + chosen fork, as a single CatmullRomCurve3 */
export function buildFullPath(direction: "left" | "right"): THREE.CatmullRomCurve3 {
  const forkPoints = direction === "left" ? LEFT_FORK_POINTS : RIGHT_FORK_POINTS;
  // Skip last main point (overlaps with fork start)
  const points = [...MAIN_POINTS.slice(0, -1), ...forkPoints];
  return new THREE.CatmullRomCurve3(points);
}
