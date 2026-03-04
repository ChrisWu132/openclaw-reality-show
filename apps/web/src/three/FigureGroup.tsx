import type { TrackEntity } from "@openclaw/shared";
import { Figure } from "./Figure";
import { Html } from "@react-three/drei";

interface FigureGroupProps {
  entity: TrackEntity;
  basePosition: [number, number, number];
  hit?: boolean;
}

export function FigureGroup({ entity, basePosition, hit = false }: FigureGroupProps) {
  const [bx, by, bz] = basePosition;
  const figures = [];

  for (let i = 0; i < Math.min(entity.count, 8); i++) {
    const offsetX = (i % 3 - 1) * 0.5;
    const offsetZ = Math.floor(i / 3) * 0.5;
    figures.push(
      <Figure
        key={i}
        type={entity.type}
        position={[bx + offsetX, by, bz + offsetZ]}
        hit={hit}
      />,
    );
  }

  return (
    <group>
      {figures}
      <Html
        position={[bx, by + 1.5, bz]}
        center
        style={{
          color: "#e8e8e0",
          fontSize: "10px",
          fontFamily: "'Press Start 2P', monospace",
          whiteSpace: "nowrap",
          background: "rgba(0,0,0,0.6)",
          padding: "2px 6px",
          borderRadius: "2px",
          pointerEvents: "none",
        }}
      >
        {entity.visualLabel}
      </Html>
    </group>
  );
}
