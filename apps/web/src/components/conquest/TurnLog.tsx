import type { ConquestGame } from "@openclaw/shared";
import { COLORS } from "../../styles/theme";

interface TurnLogProps {
  game: ConquestGame;
}

export function TurnLog({ game }: TurnLogProps) {
  const font = "'Press Start 2P', monospace";
  const recentTurns = game.turnLog.slice(-10).reverse();

  const agentNames = new Map<string, { name: string; color: string }>();
  for (const agent of game.agents) {
    agentNames.set(agent.agentId, { name: agent.agentName, color: agent.color });
  }

  return (
    <div
      style={{
        maxHeight: "300px",
        overflowY: "auto",
        padding: "8px",
        background: "rgba(0,0,0,0.3)",
        border: `1px solid ${COLORS.textSecondary}20`,
      }}
    >
      <div style={{ fontFamily: font, fontSize: "7px", color: COLORS.textSecondary, marginBottom: "8px" }}>
        ACTION LOG
      </div>

      {recentTurns.length === 0 && (
        <div style={{ fontFamily: font, fontSize: "7px", color: "#404050" }}>No actions yet...</div>
      )}

      {recentTurns.map((turn) => (
        <div key={turn.turn} style={{ marginBottom: "8px" }}>
          <div style={{ fontFamily: font, fontSize: "6px", color: COLORS.textSecondary, marginBottom: "4px" }}>
            TURN {turn.turn}
          </div>
          {turn.actions.map((action, i) => {
            const agent = agentNames.get(action.agentId);
            return (
              <div
                key={i}
                style={{
                  fontFamily: "monospace",
                  fontSize: "10px",
                  color: action.success ? "#8a8a9a" : "#6a5a5a",
                  lineHeight: "1.6",
                  paddingLeft: "8px",
                }}
              >
                <span style={{ color: agent?.color || COLORS.textSecondary }}>
                  {agent?.name || action.agentId.slice(0, 8)}
                </span>
                {" "}
                {action.action.type} {action.success ? "\u2713" : "\u2717"} {action.result}
              </div>
            );
          })}
          {turn.eliminations.length > 0 && (
            <div style={{ fontFamily: font, fontSize: "6px", color: COLORS.accentRed, marginTop: "2px", paddingLeft: "8px" }}>
              ELIMINATED: {turn.eliminations.map((id) => agentNames.get(id)?.name || id.slice(0, 8)).join(", ")}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
