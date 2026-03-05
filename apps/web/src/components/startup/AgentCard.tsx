import type { StartupAgent } from "@openclaw/shared";
import { COLORS } from "../../styles/theme";

function formatCash(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function calcValuation(agent: StartupAgent): number {
  const { users, model, compute, data } = agent.resources;
  return users * (model / 10) * (1 + (compute + data) / 200);
}

interface AgentCardProps {
  agent: StartupAgent;
  lastAction?: string;
}

export function AgentCard({ agent, lastAction }: AgentCardProps) {
  const r = agent.resources;
  const valuation = calcValuation(agent);
  const isOut = agent.status !== "active";
  const font = "'Press Start 2P', monospace";

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${isOut ? COLORS.textSecondary + "20" : agent.color + "40"}`,
        marginBottom: "10px",
        opacity: isOut ? 0.5 : 1,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: "8px", color: agent.color, fontFamily: font }}>{agent.agentName}</div>
        {isOut && (
          <div style={{ fontSize: "6px", color: COLORS.accentRed, fontFamily: font }}>
            {agent.status === "bankrupt" ? "BANKRUPT" : "ACQUIRED"}
          </div>
        )}
      </div>

      <div style={{ fontSize: "7px", color: COLORS.textSecondary, fontFamily: font, lineHeight: "2.2" }}>
        <ResourceBar label="CASH" value={formatCash(r.cash)} percent={Math.min(100, (r.cash / 1_000_000) * 100)} color="#4ad9b1" />
        <ResourceBar label="COMPUTE" value={`${r.compute}`} percent={r.compute} color="#4a90d9" />
        <ResourceBar label="DATA" value={`${r.data}`} percent={r.data} color="#d9a64a" />
        <ResourceBar label="MODEL" value={`${r.model}`} percent={r.model} color="#d94a4a" />
        <ResourceBar label="USERS" value={r.users.toLocaleString()} percent={Math.min(100, r.users / 100)} color="#a64ad9" />
      </div>

      <div style={{ fontSize: "7px", color: agent.color, fontFamily: font, marginTop: "6px" }}>
        VAL: {formatCash(valuation)}
      </div>

      {lastAction && (
        <div
          style={{
            fontSize: "6px",
            color: COLORS.textSecondary,
            fontFamily: font,
            marginTop: "6px",
            lineHeight: "1.8",
            borderTop: `1px solid ${COLORS.textSecondary}15`,
            paddingTop: "6px",
          }}
        >
          {lastAction}
        </div>
      )}
    </div>
  );
}

function ResourceBar({
  label,
  value,
  percent,
  color,
}: {
  label: string;
  value: string;
  percent: number;
  color: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "2px" }}>
      <span style={{ width: "55px", textAlign: "right" }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: "6px",
          background: "#222",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            height: "100%",
            width: `${Math.max(0, Math.min(100, percent))}%`,
            background: color,
            transition: "width 0.5s ease",
          }}
        />
      </div>
      <span style={{ width: "45px", textAlign: "right", fontSize: "6px" }}>{value}</span>
    </div>
  );
}
