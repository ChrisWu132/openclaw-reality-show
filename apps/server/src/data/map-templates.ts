import type { HexCoord, TerrainType, Territory, MapTemplate } from "@openclaw/shared";
import { NEUTRAL_STRENGTH, SPAWN_STRENGTH } from "@openclaw/shared";
import { hexSpiral, hexKey } from "./hex-utils.js";

interface MapDefinition {
  radius: number;
  /** Terrain overrides by hex key "q,r". Defaults to plains. */
  terrainOverrides: Record<string, TerrainType>;
  /** Start positions in order (agent 0, 1, 2, 3). Must have ≥ 2. */
  startPositions: HexCoord[];
}

const HEX19_DEF: MapDefinition = {
  radius: 2,
  terrainOverrides: {
    "0,0": "hills",
    "1,-1": "forest",
    "-1,1": "forest",
    "0,-2": "mountain",
    "0,2": "mountain",
    "2,-2": "swamp",
    "-2,2": "swamp",
  },
  startPositions: [
    { q: -2, r: 0 },  // top-left corner
    { q: 2, r: 0 },   // top-right corner
    { q: 0, r: -2 },  // bottom-left
    { q: 0, r: 2 },   // bottom-right
  ],
};

const HEX37_DEF: MapDefinition = {
  radius: 3,
  terrainOverrides: {
    "0,0": "hills",
    "1,-1": "forest",
    "-1,1": "forest",
    "2,-1": "forest",
    "-2,1": "forest",
    "0,-3": "mountain",
    "0,3": "mountain",
    "3,-3": "mountain",
    "-3,3": "mountain",
    "3,0": "swamp",
    "-3,0": "swamp",
    "1,2": "hills",
    "-1,-2": "hills",
    "2,-3": "swamp",
    "-2,3": "swamp",
  },
  startPositions: [
    { q: -3, r: 0 },  // west
    { q: 3, r: 0 },   // east
    { q: 0, r: -3 },  // north
    { q: 0, r: 3 },   // south
  ],
};

const MAP_DEFS: Record<MapTemplate, MapDefinition> = {
  hex19: HEX19_DEF,
  hex37: HEX37_DEF,
};

/**
 * Generate all territories for a given map template.
 * Agent IDs are assigned to start positions in order.
 */
export function generateMap(template: MapTemplate, agentIds: string[]): Territory[] {
  const def = MAP_DEFS[template];
  const allCoords = hexSpiral({ q: 0, r: 0 }, def.radius);

  // Build a set of start position keys for quick lookup
  const startMap = new Map<string, string>(); // hexKey → agentId
  for (let i = 0; i < Math.min(agentIds.length, def.startPositions.length); i++) {
    startMap.set(hexKey(def.startPositions[i]), agentIds[i]);
  }

  return allCoords.map((coord): Territory => {
    const key = hexKey(coord);
    const terrain: TerrainType = def.terrainOverrides[key] || "plains";
    const agentOwner = startMap.get(key);

    return {
      coord,
      terrain,
      owner: agentOwner ?? null,
      strength: agentOwner ? SPAWN_STRENGTH : NEUTRAL_STRENGTH,
    };
  });
}

/** Get the available start positions for a map template. */
export function getStartPositions(template: MapTemplate): HexCoord[] {
  return MAP_DEFS[template].startPositions;
}

/** Get the max number of agents a map supports. */
export function getMaxAgents(template: MapTemplate): number {
  return MAP_DEFS[template].startPositions.length;
}
