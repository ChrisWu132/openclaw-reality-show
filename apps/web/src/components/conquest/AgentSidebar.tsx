import type { ConquestGame } from "@openclaw/shared";
import { COLORS } from "../../styles/theme";

interface AgentSidebarProps {
  game: ConquestGame;
}

export function AgentSidebar({ game }: AgentSidebarProps) {
  const total = game.territories.length;
  const font = "'Press Start 2P', monospace";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontFamily: font, fontSize: "8px", color: COLORS.textSecondary, marginBottom: "4px" }}>
        TURN {game.currentTurn}
      </div>

      {game.agents.map((agent) => {
        const owned = game.territories.filter((t) => t.owner === agent.agentId).length;
        const totalStr = game.territories
          .filter((t) => t.owner === agent.agentId)
          .reduce((s, t) => s + t.strength, 0);

        // Last action
        const lastTurn = game.turnLog[game.turnLog.length - 1];
        const lastAction = lastTurn?.actions.find((a) => a.agentId === agent.agentId);

        return (
          <div
            key={agent.agentId}
            style={{
              padding: "12px",
              background: "rgba(0,0,0,0.4)",
              border: `1px solid ${agent.color}40`,
              borderLeft: `3px solid ${agent.color}`,
              opacity: agent.status === "eliminated" ? 0.4 : 1,
            }}
          >
            <div style={{ fontFamily: font, fontSize: "8px", color: agent.color, marginBottom: "6px" }}>
              {agent.agentName}
              {agent.status === "eliminated" && (
                <span style={{ color: COLORS.accentRed, marginLeft: "8px" }}>ELIMINATED</span>
              )}
            </div>
            <div style={{ fontFamily: font, fontSize: "7px", color: COLORS.textSecondary, lineHeight: "2" }}>
              <div>
                Territories: {owned}/{total} ({(owned / total * 100).toFixed(0)}%)
              </div>
              <div>Total Strength: {totalStr}</div>
              {lastAction && (
                <div style={{ marginTop: "4px", color: COLORS.textSecondary, fontSize: "6px", lineHeight: "1.8" }}>
                  Last: {lastAction.action.type} {lastAction.success ? "\u2713" : "\u2717"}
                  {lastAction.action.reasoning && (
                    <div style={{ color: "#606070", marginTop: "2px", fontFamily: "monospace", fontSize: "9px" }}>
                      "{lastAction.action.reasoning.slice(0, 100)}{lastAction.action.reasoning.length > 100 ? "..." : ""}"
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
