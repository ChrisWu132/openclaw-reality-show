import type { ConquestGame, HexCoord } from "@openclaw/shared";
import { HexTile, hexToPixel } from "./HexTile";

interface HexGridProps {
  game: ConquestGame;
  selectedHex: HexCoord | null;
  onHexClick: (coord: HexCoord) => void;
}

export function HexGrid({ game, selectedHex, onHexClick }: HexGridProps) {
  // Calculate bounds for viewBox
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const t of game.territories) {
    const { x, y } = hexToPixel(t.coord.q, t.coord.r);
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  const padding = 50;
  const vbX = minX - padding;
  const vbY = minY - padding;
  const vbW = maxX - minX + padding * 2;
  const vbH = maxY - minY + padding * 2;

  // Build agent color lookup
  const agentColorMap = new Map<string, string>();
  for (const agent of game.agents) {
    agentColorMap.set(agent.agentId, agent.color);
  }

  return (
    <svg
      viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
      style={{ width: "100%", height: "100%", maxHeight: "600px" }}
    >
      {game.territories.map((territory) => {
        const isSelected =
          selectedHex !== null &&
          territory.coord.q === selectedHex.q &&
          territory.coord.r === selectedHex.r;

        return (
          <HexTile
            key={`${territory.coord.q},${territory.coord.r}`}
            territory={territory}
            agentColor={territory.owner ? agentColorMap.get(territory.owner) || null : null}
            isSelected={isSelected}
            onClick={onHexClick}
          />
        );
      })}
    </svg>
  );
}
