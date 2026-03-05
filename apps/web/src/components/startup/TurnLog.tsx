import type { StartupGame } from "@openclaw/shared";
import { COLORS } from "../../styles/theme";

interface TurnLogProps {
  game: StartupGame;
}

export function TurnLog({ game }: TurnLogProps) {
  const font = "'Press Start 2P', monospace";
  const entries = [...game.turnLog].reverse().slice(0, 10);

  return (
    <div>
      <div style={{ fontSize: "8px", color: COLORS.textSecondary, fontFamily: font, marginBottom: "12px" }}>
        TURN LOG
      </div>
      {entries.length === 0 && (
        <div style={{ fontSize: "7px", color: COLORS.textSecondary, fontFamily: font }}>
          Waiting for first quarter...
        </div>
      )}
      {entries.map((entry) => (
        <div
          key={entry.turn}
          style={{
            marginBottom: "12px",
            paddingBottom: "8px",
            borderBottom: `1px solid ${COLORS.textSecondary}10`,
          }}
        >
          <div style={{ fontSize: "7px", color: COLORS.textSecondary, fontFamily: font, marginBottom: "4px" }}>
            Q{entry.turn}{" "}
            {entry.marketEvent.type !== "NONE" && (
              <span style={{ color: marketEventColor(entry.marketEvent.type) }}>
                [{entry.marketEvent.type.replace(/_/g, " ")}]
              </span>
            )}
          </div>
          {entry.actions.map((a, i) => {
            const agentName = game.agents.find((ag) => ag.agentId === a.agentId)?.agentName || "?";
            const agentColor = game.agents.find((ag) => ag.agentId === a.agentId)?.color || "#888";
            return (
              <div
                key={i}
                style={{
                  fontSize: "6px",
                  fontFamily: font,
                  color: COLORS.textPrimary,
                  lineHeight: "2",
                  marginLeft: "4px",
                }}
              >
                <span style={{ color: agentColor }}>{agentName}</span>:{" "}
                <span style={{ color: a.success ? "#4ad97a" : COLORS.accentRed }}>
                  {a.action.type}
                </span>{" "}
                <span style={{ color: COLORS.textSecondary, wordBreak: "break-word" as const }}>{a.result.slice(0, 45)}</span>
              </div>
            );
          })}
          {entry.eliminations.length > 0 && (
            <div style={{ fontSize: "6px", fontFamily: font, color: COLORS.accentRed, marginTop: "2px" }}>
              BANKRUPT: {entry.eliminations.map((id) => game.agents.find((a) => a.agentId === id)?.agentName || id.slice(0, 8)).join(", ")}
            </div>
          )}
          {entry.acquisitions.length > 0 && (
            <div style={{ fontSize: "6px", fontFamily: font, color: "#d9a64a", marginTop: "2px" }}>
              ACQUIRED: {entry.acquisitions.map((acq) => {
                const target = game.agents.find((a) => a.agentId === acq.target)?.agentName || "?";
                const acquirer = game.agents.find((a) => a.agentId === acq.acquirer)?.agentName || "?";
                return `${acquirer} acquired ${target}`;
              }).join("; ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function marketEventColor(type: string): string {
  switch (type) {
    case "GPU_SHORTAGE": return COLORS.accentRed;
    case "FUNDING_BOOM": return "#4ad97a";
    case "REGULATION": return COLORS.accentOrange;
    case "VIRAL_TREND": return "#a64ad9";
    case "DATA_BREACH": return COLORS.accentRed;
    default: return COLORS.textSecondary;
  }
}
