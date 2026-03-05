import type { HexCoord } from "@openclaw/shared";

/** Check equality of two hex coordinates. */
export function hexEqual(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

/** Manhattan distance in cube coordinates (axial → cube: s = -q - r). */
export function hexDistance(a: HexCoord, b: HexCoord): number {
  const dq = Math.abs(a.q - b.q);
  const dr = Math.abs(a.r - b.r);
  const ds = Math.abs((-a.q - a.r) - (-b.q - b.r));
  return Math.max(dq, dr, ds);
}

/** The 6 axial direction vectors. */
const DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

/** Return the 6 neighbors of a hex. */
export function hexNeighbors(coord: HexCoord): HexCoord[] {
  return DIRECTIONS.map((d) => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

/** Check if two hexes are adjacent (distance = 1). */
export function hexAdjacent(a: HexCoord, b: HexCoord): boolean {
  return hexDistance(a, b) === 1;
}

/** Get all hexes at exactly `radius` distance from center. */
export function hexRing(center: HexCoord, radius: number): HexCoord[] {
  if (radius === 0) return [center];

  const results: HexCoord[] = [];
  // Start at the hex `radius` steps in direction 4 (q-1, r+1)
  let current: HexCoord = {
    q: center.q + DIRECTIONS[4].q * radius,
    r: center.r + DIRECTIONS[4].r * radius,
  };

  for (let side = 0; side < 6; side++) {
    for (let step = 0; step < radius; step++) {
      results.push(current);
      current = { q: current.q + DIRECTIONS[side].q, r: current.r + DIRECTIONS[side].r };
    }
  }

  return results;
}

/** Get all hexes within `radius` of center (spiral). */
export function hexSpiral(center: HexCoord, radius: number): HexCoord[] {
  const results: HexCoord[] = [center];
  for (let r = 1; r <= radius; r++) {
    results.push(...hexRing(center, r));
  }
  return results;
}

/** Convert axial hex coord to a string key for Maps/Sets. */
export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}
