import type { StartupAgent } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

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
  isActive?: boolean;
}

export function AgentCard({ agent, lastAction, isActive }: AgentCardProps) {
  const r = agent.resources;
  const valuation = calcValuation(agent);
  const isOut = agent.status !== "active";

  return (
    <div
      style={{
        padding: "12px",
        background: "rgba(0,0,0,0.4)",
        border: `1px solid ${isActive ? agent.color : isOut ? COLORS.textSecondary + "20" : agent.color + "40"}`,
        marginBottom: "10px",
        opacity: isOut ? 0.5 : 1,
        boxShadow: isActive ? `0 0 12px ${agent.color}30` : "none",
        transition: "box-shadow 0.3s ease, border-color 0.3s ease",
      }}
    >
      {/* Valuation header */}
      <div style={{ fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.valuationLg, color: agent.color, marginBottom: "6px" }}>
        {formatCash(valuation)}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerMd, color: agent.color, fontFamily: FONTS.body, fontWeight: "bold" }}>{agent.agentName}</div>
        {isOut && (
          <div style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.accentRed, fontFamily: FONTS.pixel }}>
            {agent.status === "bankrupt" ? "BANKRUPT" : "ACQUIRED"}
          </div>
        )}
      </div>

      <div style={{ fontSize: STARTUP_SIZES.body, color: COLORS.textSecondary, fontFamily: FONTS.body, lineHeight: "2" }}>
        <ResourceBar label="CASH" value={formatCash(r.cash)} percent={Math.min(100, (r.cash / 1_000_000) * 100)} color="#4ad9b1" />
        <ResourceBar label="COMPUTE" value={`${r.compute}`} percent={r.compute} color="#4a90d9" />
        <ResourceBar label="DATA" value={`${r.data}`} percent={r.data} color="#d9a64a" />
        <ResourceBar label="MODEL" value={`${r.model}`} percent={r.model} color="#d94a4a" />
        <ResourceBar label="USERS" value={r.users.toLocaleString()} percent={Math.min(100, r.users / 100)} color="#a64ad9" />
      </div>

      {lastAction && (
        <div
          style={{
            fontSize: STARTUP_SIZES.bodySm,
            color: COLORS.textSecondary,
            fontFamily: FONTS.body,
            marginTop: "6px",
            lineHeight: "1.6",
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
      <span style={{ width: "55px", textAlign: "right", fontSize: STARTUP_SIZES.body }}>{label}</span>
      <div
        style={{
          flex: 1,
          height: "10px",
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
      <span style={{ width: "50px", textAlign: "right", fontSize: STARTUP_SIZES.bodySm }}>{value}</span>
    </div>
  );
}
