import type { Territory, HexCoord } from "@openclaw/shared";

/** Flat-top hexagon pointy math. Size = outer radius. */
const HEX_SIZE = 32;

/** Convert axial coord to pixel position (flat-top). */
export function hexToPixel(q: number, r: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2) * q;
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

/** Generate SVG points for a flat-top hexagon centered at (0,0). */
function hexPoints(): string {
  const points: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 180) * (60 * i);
    points.push(`${HEX_SIZE * Math.cos(angle)},${HEX_SIZE * Math.sin(angle)}`);
  }
  return points.join(" ");
}

const TERRAIN_PATTERNS: Record<string, string> = {
  plains: "",
  hills: "^^^",
  forest: "***",
  mountain: "MMM",
  swamp: "~~~",
};

interface HexTileProps {
  territory: Territory;
  agentColor: string | null;
  isSelected: boolean;
  onClick: (coord: HexCoord) => void;
}

export function HexTile({ territory, agentColor, isSelected, onClick }: HexTileProps) {
  const { x, y } = hexToPixel(territory.coord.q, territory.coord.r);

  const fillColor = agentColor
    ? `${agentColor}${territory.strength > 3 ? "cc" : territory.strength > 1 ? "88" : "44"}`
    : "rgba(100, 100, 100, 0.2)";

  const strokeColor = isSelected ? "#ffffff" : agentColor ? `${agentColor}cc` : "rgba(100, 100, 100, 0.4)";

  return (
    <g
      transform={`translate(${x}, ${y})`}
      onClick={() => onClick(territory.coord)}
      style={{ cursor: "pointer" }}
    >
      <polygon
        points={hexPoints()}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={isSelected ? 2.5 : 1}
        style={{ transition: "fill 0.3s, stroke 0.3s" }}
      />
      {/* Strength number */}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        y={-2}
        fill={agentColor ? "#ffffff" : "#888888"}
        fontSize="12"
        fontFamily="'Press Start 2P', monospace"
      >
        {territory.strength}
      </text>
      {/* Terrain indicator */}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        y={12}
        fill={agentColor ? "#ffffffaa" : "#666666"}
        fontSize="6"
        fontFamily="monospace"
      >
        {TERRAIN_PATTERNS[territory.terrain]}
      </text>
    </g>
  );
}
