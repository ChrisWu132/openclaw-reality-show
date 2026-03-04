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
    const offsetX = (i % 3 - 1) * 0.7;
    const offsetZ = Math.floor(i / 3) * 0.7;
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
        position={[bx, by + 2.5, bz]}
        center
        style={{
          color: "#e8e8e0",
          fontSize: "11px",
          fontFamily: "'Press Start 2P', monospace",
          whiteSpace: "nowrap",
          background: "rgba(0,0,0,0.7)",
          padding: "3px 8px",
          borderRadius: "2px",
          pointerEvents: "none",
          textShadow: "0 0 8px rgba(255,255,255,0.3)",
        }}
      >
        {entity.visualLabel}
      </Html>
    </group>
  );
}
