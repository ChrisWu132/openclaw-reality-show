import { useMemo } from "react";
import type { StartupAgent, StartupTurnLogEntry, Alliance } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface EcosystemMapProps {
  agents: StartupAgent[];
  turnLog?: StartupTurnLogEntry[];
  alliances?: Alliance[];
}

function calcValuation(agent: StartupAgent): number {
  const { users, model, compute, data } = agent.resources;
  return users * (model / 10) * (1 + (compute + data) / 200);
}

function formatCash(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Math.floor(n)}`;
}

const GOAL_VALUATION = 100_000_000;

// Quadrant positions for 2-4 agents
const POSITIONS: Record<number, { x: number; y: number }[]> = {
  2: [{ x: 150, y: 130 }, { x: 400, y: 130 }],
  3: [{ x: 140, y: 80 }, { x: 410, y: 80 }, { x: 275, y: 200 }],
  4: [{ x: 150, y: 80 }, { x: 400, y: 80 }, { x: 150, y: 200 }, { x: 400, y: 200 }],
};

export function EcosystemMap({ agents, turnLog, alliances }: EcosystemMapProps) {
  const W = 550;
  const H = 280;

  // Find max valuation for scaling, with fallback metric for early game
  const valuations = agents.map((a) => calcValuation(a));
  const fallbackMetrics = agents.map((a) => {
    const r = a.resources;
    return r.cash / 10_000 + r.compute + r.data + r.model;
  });
  const effectiveValues = valuations.map((v, i) => v || fallbackMetrics[i]);
  const maxVal = Math.max(...effectiveValues, 1);

  // Compute recent poach interactions for edges
  const recentPoaches = useMemo(() => {
    if (!turnLog || turnLog.length === 0) return [];
    const recent = turnLog.slice(-3);
    const poaches: { from: string; to: string; turn: number }[] = [];
    for (const entry of recent) {
      for (const action of entry.actions) {
        if (action.action.type === "POACH" && action.success && action.action.targetAgentId) {
          poaches.push({ from: action.agentId, to: action.action.targetAgentId, turn: entry.turn });
        }
      }
    }
    return poaches;
  }, [turnLog]);

  const positions = POSITIONS[agents.length] || POSITIONS[4];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="100%" style={{ maxWidth: `${W}px` }}>
      {/* $100M goal circle for reference */}
      <circle
        cx={W / 2}
        cy={H / 2}
        r={120}
        fill="none"
        stroke="#ffffff10"
        strokeWidth="1"
        strokeDasharray="4 4"
      />
      <text
        x={W / 2}
        y={H / 2 - 125}
        textAnchor="middle"
        fill="#ffffff20"
        fontSize={STARTUP_SIZES.bodySm}
        fontFamily={FONTS.pixel}
      >
        $100M
      </text>

      {/* Poach edges */}
      {recentPoaches.map((poach, idx) => {
        const fromIdx = agents.findIndex((a) => a.agentId === poach.from);
        const toIdx = agents.findIndex((a) => a.agentId === poach.to);
        if (fromIdx < 0 || toIdx < 0) return null;
        const from = positions[fromIdx];
        const to = positions[toIdx];
        const currentTurn = turnLog?.[turnLog.length - 1]?.turn ?? 0;
        const age = currentTurn - poach.turn;
        const opacity = Math.max(0.1, 0.6 - age * 0.15);
        return (
          <line
            key={`poach-${idx}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke="#d94a4a"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity={opacity}
          />
        );
      })}

      {/* Alliance lines */}
      {alliances?.map((alliance, idx) => {
        const fromIdx = agents.findIndex((a) => a.agentId === alliance.agents[0]);
        const toIdx = agents.findIndex((a) => a.agentId === alliance.agents[1]);
        if (fromIdx < 0 || toIdx < 0) return null;
        const from = positions[fromIdx];
        const to = positions[toIdx];
        const isBetrayed = alliance.status === "betrayed";
        return (
          <line
            key={`alliance-${idx}`}
            x1={from.x}
            y1={from.y}
            x2={to.x}
            y2={to.y}
            stroke={isBetrayed ? "#d94a4a" : "#4ad97a"}
            strokeWidth={isBetrayed ? 3 : 2}
            strokeDasharray={isBetrayed ? "2 3" : "8 4"}
            opacity={isBetrayed ? 0.8 : 0.6}
          >
            {isBetrayed && (
              <animate attributeName="opacity" values="0.8;0.2;0.8" dur="0.5s" repeatCount="3" />
            )}
          </line>
        );
      })}

      {/* Agent bubbles */}
      {agents.map((agent, i) => {
        const pos = positions[i];
        const val = effectiveValues[i];
        const isActive = agent.status === "active";

        // Scale radius: min 25, max 100, based on sqrt of effective value ratio
        const ratio = maxVal > 0 ? val / maxVal : 0;
        const radius = isActive ? 25 + Math.sqrt(ratio) * 75 : 10;

        // Threat: if valuation is 5x anyone
        const isThreating = isActive && agents.some(
          (other) => other.agentId !== agent.agentId && other.status === "active" && val > 0 && val >= 5 * calcValuation(other)
        );

        if (!isActive) {
          // Shrunk/dead agent
          return (
            <g key={agent.agentId}>
              <circle
                cx={pos.x}
                cy={pos.y}
                r={10}
                fill={`${agent.color}10`}
                stroke={`${agent.color}30`}
                strokeWidth="1"
              />
              <text
                x={pos.x}
                y={pos.y + 3}
                textAnchor="middle"
                fill={`${agent.color}50`}
                fontSize="8"
                fontFamily={FONTS.body}
                fontWeight="bold"
              >
                {agent.agentName.charAt(0)}
              </text>
              <text
                x={pos.x}
                y={pos.y + 20}
                textAnchor="middle"
                fill={`${agent.color}40`}
                fontSize="7"
                fontFamily={FONTS.pixel}
              >
                {agent.status === "bankrupt" ? "BANKRUPT" : "ACQUIRED"}
              </text>
            </g>
          );
        }

        return (
          <g key={agent.agentId}>
            {/* Glow for dominant agents */}
            {isThreating && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={radius + 8}
                fill="none"
                stroke={agent.color}
                strokeWidth="2"
                opacity="0.3"
              >
                <animate attributeName="r" values={`${radius + 4};${radius + 12};${radius + 4}`} dur="2s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.3;0.1;0.3" dur="2s" repeatCount="indefinite" />
              </circle>
            )}

            {/* Main bubble */}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={radius}
              fill={`${agent.color}20`}
              stroke={agent.color}
              strokeWidth="2"
              style={{ transition: "r 0.8s ease" }}
            />

            {/* Agent initial */}
            <text
              x={pos.x}
              y={pos.y - 2}
              textAnchor="middle"
              fill={agent.color}
              fontSize={Math.max(12, radius * 0.35)}
              fontFamily={FONTS.body}
              fontWeight="bold"
            >
              {agent.agentName.charAt(0)}
            </text>

            {/* Valuation label */}
            <text
              x={pos.x}
              y={pos.y + Math.max(10, radius * 0.25)}
              textAnchor="middle"
              fill={COLORS.textPrimary}
              fontSize={STARTUP_SIZES.bodySm}
              fontFamily={FONTS.pixel}
            >
              {formatCash(valuations[i])}
            </text>

            {/* Name below bubble */}
            <text
              x={pos.x}
              y={pos.y + radius + 14}
              textAnchor="middle"
              fill={agent.color}
              fontSize={STARTUP_SIZES.bodySm}
              fontFamily={FONTS.body}
              fontWeight="bold"
            >
              {agent.agentName.length > 12 ? agent.agentName.slice(0, 11) + "…" : agent.agentName}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

