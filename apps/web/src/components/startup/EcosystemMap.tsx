import type { StartupAgent, ZoneId } from "@openclaw/shared";

interface ZoneConfig {
  id: ZoneId;
  label: string;
  x: number;
  y: number;
}

const ZONES: ZoneConfig[] = [
  { id: "gpu_farm", label: "GPU Farm", x: 100, y: 80 },
  { id: "research_lab", label: "Research Lab", x: 300, y: 80 },
  { id: "data_lake", label: "Data Lake", x: 500, y: 80 },
  { id: "vc_office", label: "VC Office", x: 100, y: 260 },
  { id: "center", label: "HQ", x: 300, y: 260 },
  { id: "open_source", label: "Open Source", x: 500, y: 260 },
  { id: "market", label: "Market", x: 100, y: 440 },
  { id: "launch_pad", label: "Launch Pad", x: 300, y: 440 },
  { id: "talent_pool", label: "Talent Pool", x: 500, y: 440 },
];

const EDGES: [ZoneId, ZoneId][] = [
  ["gpu_farm", "research_lab"],
  ["research_lab", "data_lake"],
  ["gpu_farm", "vc_office"],
  ["research_lab", "center"],
  ["data_lake", "open_source"],
  ["vc_office", "center"],
  ["center", "open_source"],
  ["vc_office", "market"],
  ["center", "launch_pad"],
  ["open_source", "talent_pool"],
  ["market", "launch_pad"],
  ["launch_pad", "talent_pool"],
];

function getZone(id: ZoneId): ZoneConfig {
  return ZONES.find((z) => z.id === id)!;
}

interface EcosystemMapProps {
  agents: StartupAgent[];
}

export function EcosystemMap({ agents }: EcosystemMapProps) {
  const activeAgents = agents.filter((a) => a.status === "active");

  // Group agents by zone for positioning
  const agentsByZone = new Map<ZoneId, StartupAgent[]>();
  for (const agent of activeAgents) {
    const list = agentsByZone.get(agent.zone) || [];
    list.push(agent);
    agentsByZone.set(agent.zone, list);
  }

  return (
    <svg viewBox="0 0 600 520" width="100%" height="100%" style={{ maxWidth: "600px" }}>
      {/* Edges */}
      {EDGES.map(([a, b]) => {
        const za = getZone(a);
        const zb = getZone(b);
        return (
          <line
            key={`${a}-${b}`}
            x1={za.x}
            y1={za.y}
            x2={zb.x}
            y2={zb.y}
            stroke="#333"
            strokeWidth="1.5"
            strokeDasharray="6 4"
          />
        );
      })}

      {/* Agent trails */}
      {activeAgents.map((agent) => {
        if (agent.zoneHistory.length < 1) return null;
        const history = [...agent.zoneHistory.slice(-3), agent.zone];
        const points = history.map((zId) => {
          const z = getZone(zId);
          return `${z.x},${z.y}`;
        });
        return (
          <polyline
            key={`trail-${agent.agentId}`}
            points={points.join(" ")}
            fill="none"
            stroke={agent.color}
            strokeWidth="3"
            strokeOpacity="0.4"
            strokeLinejoin="round"
          />
        );
      })}

      {/* Zone nodes */}
      {ZONES.map((zone) => {
        const occupants = agentsByZone.get(zone.id) || [];
        const isOccupied = occupants.length > 0;
        const words = zone.label.split(" ");
        const wordCount = words.length;
        return (
          <g key={zone.id}>
            {/* Glow */}
            {isOccupied && (
              <circle
                cx={zone.x}
                cy={zone.y}
                r="38"
                fill="none"
                stroke={occupants[0].color}
                strokeWidth="1"
                opacity="0.3"
              >
                <animate attributeName="r" values="36;42;36" dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}
            {/* Node circle */}
            <circle
              cx={zone.x}
              cy={zone.y}
              r="32"
              fill={isOccupied ? `${occupants[0].color}15` : "#111"}
              stroke={isOccupied ? occupants[0].color + "80" : "#444"}
              strokeWidth="1.5"
            />
            {/* Zone label */}
            <text
              x={zone.x}
              y={zone.y - (wordCount - 1) * 5.5}
              textAnchor="middle"
              fill={isOccupied ? "#fff" : "#888"}
              fontSize="8"
              fontFamily="'Press Start 2P', monospace"
            >
              {words.map((word, i) => (
                <tspan key={i} x={zone.x} dy={i === 0 ? 0 : 11}>
                  {word}
                </tspan>
              ))}
            </text>

            {/* Agent icons in this zone */}
            {occupants.map((agent, idx) => {
              const offsetX = (idx - (occupants.length - 1) / 2) * 24;
              return (
                <g key={agent.agentId}>
                  {/* Glow behind agent dot */}
                  <circle
                    cx={zone.x + offsetX}
                    cy={zone.y + 18}
                    r="13"
                    fill={agent.color}
                    opacity="0.15"
                  />
                  <circle
                    cx={zone.x + offsetX}
                    cy={zone.y + 18}
                    r="10"
                    fill={agent.color}
                    stroke="#000"
                    strokeWidth="1.5"
                  />
                  <text
                    x={zone.x + offsetX}
                    y={zone.y + 21}
                    textAnchor="middle"
                    fill="#000"
                    fontSize="9"
                    fontWeight="bold"
                    fontFamily="monospace"
                  >
                    {agent.agentName.charAt(0)}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
