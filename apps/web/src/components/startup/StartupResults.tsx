import { useStartupStore } from "../../stores/startupStore";
import { useGameStore } from "../../stores/gameStore";
import { EcosystemMap } from "./EcosystemMap";
import { ValuationChart } from "./ValuationChart";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

function formatCash(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n}`;
}

function calcValuation(r: { users: number; model: number; compute: number; data: number }): number {
  return r.users * (r.model / 10) * (1 + (r.compute + r.data) / 200);
}

export function StartupResults() {
  const activeGame = useStartupStore((s) => s.activeGame);
  const narrative = useStartupStore((s) => s.narrative);
  const startupReset = useStartupStore((s) => s.reset);
  const setMainPhase = useGameStore((s) => s.setPhase);

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        No game data
      </div>
    );
  }

  const winner = activeGame.agents.find((a) => a.agentId === activeGame.winner);
  const gameNarrative = narrative || activeGame.narrative;

  const winConditionLabel: Record<string, string> = {
    valuation_threshold: "REACHED $100M VALUATION",
    acquisition: "ACQUISITION",
    last_standing: "LAST STANDING",
    turn_limit: "HIGHEST VALUATION AT Q20",
  };

  // Action distribution per agent
  const actionCounts: Record<string, Record<string, number>> = {};
  for (const agent of activeGame.agents) {
    actionCounts[agent.agentId] = {};
  }
  for (const entry of activeGame.turnLog) {
    for (const action of entry.actions) {
      const counts = actionCounts[action.agentId];
      if (counts) {
        counts[action.action.type] = (counts[action.action.type] || 0) + 1;
      }
    }
  }

  // Sort agents by valuation
  const rankedAgents = [...activeGame.agents].sort((a, b) => calcValuation(b.resources) - calcValuation(a.resources));

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: FONTS.body,
        overflow: "auto",
        padding: "40px",
      }}
    >
      <div style={{ fontSize: STARTUP_SIZES.headerMd, color: COLORS.textSecondary, letterSpacing: "0.2em", marginBottom: "16px", fontFamily: FONTS.pixel }}>
        GAME OVER — QUARTER {activeGame.currentTurn}
      </div>

      {winner && (
        <div
          style={{
            fontSize: "22px",
            color: winner.color,
            letterSpacing: "0.1em",
            textShadow: `0 0 40px ${winner.color}60`,
            marginBottom: "8px",
            fontFamily: FONTS.pixel,
            animation: "fadeIn 1s ease-in",
          }}
        >
          {winner.agentName.toUpperCase()} WINS
        </div>
      )}

      <div style={{ fontSize: STARTUP_SIZES.body, color: COLORS.textSecondary, marginBottom: "40px", fontFamily: FONTS.pixel }}>
        {winConditionLabel[activeGame.winCondition || ""] || activeGame.winCondition}
      </div>

      {/* AI Narrative */}
      {gameNarrative && (
        <div
          style={{
            width: "100%",
            maxWidth: "700px",
            marginBottom: "40px",
            padding: "24px",
            background: "rgba(0,0,0,0.4)",
            border: `1px solid ${COLORS.textSecondary}20`,
            borderLeft: `3px solid ${winner?.color || COLORS.accentBlue}`,
          }}
        >
          <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "12px", fontFamily: FONTS.pixel, letterSpacing: "0.1em" }}>
            THE STORY
          </div>
          <div
            style={{
              fontSize: STARTUP_SIZES.body,
              color: COLORS.textPrimary,
              lineHeight: "2",
              whiteSpace: "pre-wrap",
            }}
          >
            {gameNarrative}
          </div>
        </div>
      )}

      {/* Final Standings */}
      <div style={{ width: "100%", maxWidth: "700px", marginBottom: "30px" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "12px", fontFamily: FONTS.pixel }}>
          FINAL STANDINGS
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: STARTUP_SIZES.body }}>
          <thead>
            <tr style={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.textSecondary}20` }}>
              <th style={{ textAlign: "left", padding: "8px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>#</th>
              <th style={{ textAlign: "left", padding: "8px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>COMPANY</th>
              <th style={{ textAlign: "right", padding: "8px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>VALUATION</th>
              <th style={{ textAlign: "right", padding: "8px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>USERS</th>
              <th style={{ textAlign: "right", padding: "8px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {rankedAgents.map((agent, idx) => {
              const val = calcValuation(agent.resources);
              const isWinner = agent.agentId === activeGame.winner;
              return (
                <tr
                  key={agent.agentId}
                  style={{
                    borderBottom: `1px solid ${COLORS.textSecondary}10`,
                    background: isWinner ? `${agent.color}10` : "transparent",
                  }}
                >
                  <td style={{ padding: "8px", color: COLORS.textSecondary }}>{idx + 1}</td>
                  <td style={{ padding: "8px", color: agent.color, fontWeight: "bold" }}>
                    {agent.agentName} {isWinner ? "★" : ""}
                  </td>
                  <td style={{ padding: "8px", textAlign: "right", color: COLORS.textPrimary }}>{formatCash(val)}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: COLORS.textSecondary }}>{agent.resources.users.toLocaleString()}</td>
                  <td style={{ padding: "8px", textAlign: "right", color: agent.status === "active" ? "#4ad97a" : COLORS.accentRed }}>
                    {agent.status === "active" ? "ACTIVE" : agent.status === "bankrupt" ? `BANKRUPT Q${agent.eliminatedOnTurn}` : `ACQUIRED Q${agent.eliminatedOnTurn}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Valuation Chart */}
      <div style={{ width: "100%", maxWidth: "700px", marginBottom: "30px" }}>
        <ValuationChart game={activeGame} height={200} />
      </div>

      {/* Action Distribution */}
      <div style={{ width: "100%", maxWidth: "700px", marginBottom: "40px" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "12px", fontFamily: FONTS.pixel }}>
          ACTION DISTRIBUTION
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {activeGame.agents.map((agent) => {
            const counts = actionCounts[agent.agentId] || {};
            const total = Object.values(counts).reduce((s, c) => s + c, 0) || 1;
            return (
              <div
                key={agent.agentId}
                style={{
                  flex: "1 1 200px",
                  padding: "12px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${agent.color}30`,
                }}
              >
                <div style={{ fontSize: STARTUP_SIZES.body, color: agent.color, marginBottom: "8px", fontWeight: "bold" }}>
                  {agent.agentName}
                </div>
                {Object.entries(counts).sort(([, a], [, b]) => b - a).map(([type, count]) => (
                  <div key={type} style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "3px" }}>
                    <span style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary, width: "80px" }}>{type}</span>
                    <div
                      style={{
                        height: "8px",
                        background: agent.color,
                        width: `${(count / total) * 100}%`,
                        maxWidth: "100px",
                        transition: "width 0.5s ease",
                      }}
                    />
                    <span style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.textPrimary }}>{count}</span>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "16px" }}>
        <button
          onClick={() => startupReset()}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.body,
            color: ACCENT,
            background: "transparent",
            border: `1px solid ${ACCENT}40`,
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          NEW GAME
        </button>
        <button
          onClick={() => {
            startupReset();
            setMainPhase("mode-select");
          }}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.body,
            color: COLORS.textSecondary,
            background: "transparent",
            border: `1px solid ${COLORS.textSecondary}40`,
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          MODE SELECT
        </button>
      </div>
    </div>
  );
}

const ACCENT = "#4ad9b1";
