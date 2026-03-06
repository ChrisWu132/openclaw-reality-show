import type { StartupGame } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface TurnLogProps {
  game: StartupGame;
}

export function TurnLog({ game }: TurnLogProps) {
  const entries = [...game.turnLog].reverse().slice(0, 10);

  return (
    <div>
      <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, fontFamily: FONTS.pixel, marginBottom: "12px" }}>
        TURN LOG
      </div>
      {entries.length === 0 && (
        <div style={{ fontSize: STARTUP_SIZES.body, color: COLORS.textSecondary, fontFamily: FONTS.body }}>
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
          <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, fontFamily: FONTS.pixel, marginBottom: "4px" }}>
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
            const reasoningSnippet = a.action.reasoning ? a.action.reasoning.slice(0, 60) : "";
            return (
              <div
                key={i}
                style={{
                  fontSize: STARTUP_SIZES.bodySm,
                  fontFamily: FONTS.body,
                  color: COLORS.textPrimary,
                  lineHeight: "1.8",
                  marginLeft: "4px",
                  marginBottom: "2px",
                }}
              >
                <span style={{ color: agentColor, fontWeight: "bold" }}>{agentName}</span>:{" "}
                <span style={{ color: a.success ? "#4ad97a" : COLORS.accentRed }}>
                  {a.action.type}
                </span>{" "}
                <span style={{ color: COLORS.textSecondary, wordBreak: "break-word" as const }}>{a.result.slice(0, 50)}</span>
                {reasoningSnippet && (
                  <div style={{ fontSize: "7px", color: `${COLORS.textSecondary}90`, marginLeft: "8px", fontStyle: "italic" }}>
                    {reasoningSnippet}{reasoningSnippet.length >= 60 ? "…" : ""}
                  </div>
                )}
              </div>
            );
          })}
          {entry.eliminations.length > 0 && (
            <div style={{ fontSize: STARTUP_SIZES.bodySm, fontFamily: FONTS.body, color: COLORS.accentRed, marginTop: "2px" }}>
              BANKRUPT: {entry.eliminations.map((id) => game.agents.find((a) => a.agentId === id)?.agentName || id.slice(0, 8)).join(", ")}
            </div>
          )}
          {entry.acquisitions.length > 0 && (
            <div style={{ fontSize: STARTUP_SIZES.bodySm, fontFamily: FONTS.body, color: "#d9a64a", marginTop: "2px" }}>
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
