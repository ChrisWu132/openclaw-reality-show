import { useStartupStore } from "../../stores/startupStore";
import { useGameStore } from "../../stores/gameStore";
import { EcosystemMap } from "./EcosystemMap";
import { ValuationChart } from "./ValuationChart";
import { COLORS } from "../../styles/theme";

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
  const startupReset = useStartupStore((s) => s.reset);
  const setMainPhase = useGameStore((s) => s.setPhase);
  const font = "'Press Start 2P', monospace";

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        No game data
      </div>
    );
  }

  const winner = activeGame.agents.find((a) => a.agentId === activeGame.winner);

  const winConditionLabel: Record<string, string> = {
    valuation_threshold: "REACHED $100M VALUATION",
    acquisition: "ACQUISITION",
    last_standing: "LAST STANDING",
    turn_limit: "HIGHEST VALUATION AT Q20",
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: font,
        overflow: "auto",
        padding: "40px",
      }}
    >
      <div style={{ fontSize: "10px", color: COLORS.textSecondary, letterSpacing: "0.2em", marginBottom: "16px" }}>
        GAME OVER — QUARTER {activeGame.currentTurn}
      </div>

      {winner && (
        <div
          style={{
            fontSize: "18px",
            color: winner.color,
            letterSpacing: "0.1em",
            textShadow: `0 0 40px ${winner.color}60`,
            marginBottom: "8px",
          }}
        >
          {winner.agentName.toUpperCase()} WINS
        </div>
      )}

      <div style={{ fontSize: "7px", color: COLORS.textSecondary, marginBottom: "40px" }}>
        {winConditionLabel[activeGame.winCondition || ""] || activeGame.winCondition}
      </div>

      {/* Ecosystem Map */}
      <div style={{ width: "100%", maxWidth: "500px", marginBottom: "30px" }}>
        <EcosystemMap agents={activeGame.agents} />
      </div>

      {/* Valuation Chart */}
      <div style={{ width: "100%", maxWidth: "400px", marginBottom: "30px" }}>
        <ValuationChart game={activeGame} />
      </div>

      {/* Per-Agent Stats */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", marginBottom: "40px" }}>
        {activeGame.agents.map((agent) => {
          const r = agent.resources;
          const val = calcValuation(r);
          const isWinner = agent.agentId === activeGame.winner;
          return (
            <div
              key={agent.agentId}
              style={{
                padding: "16px 20px",
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${isWinner ? agent.color : COLORS.textSecondary + "30"}`,
                minWidth: "180px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "8px", color: agent.color, marginBottom: "8px" }}>
                {agent.agentName}
              </div>
              <div style={{ fontSize: "6px", color: COLORS.textSecondary, lineHeight: "2.2" }}>
                <div>Valuation: {formatCash(val)}</div>
                <div>Users: {r.users.toLocaleString()}</div>
                <div>Model: {r.model} | Compute: {r.compute} | Data: {r.data}</div>
                <div>Cash: {formatCash(r.cash)}</div>
                <div>Status: {agent.status === "bankrupt" ? `BANKRUPT Q${agent.eliminatedOnTurn}` : agent.status === "acquired" ? `ACQUIRED Q${agent.eliminatedOnTurn}` : "ACTIVE"}</div>
                {isWinner && <div style={{ color: agent.color, marginTop: "4px" }}>WINNER</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "16px" }}>
        <button
          onClick={() => startupReset()}
          style={{
            fontFamily: font,
            fontSize: "8px",
            color: "#4ad9b1",
            background: "transparent",
            border: "1px solid #4ad9b140",
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
            fontFamily: font,
            fontSize: "8px",
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
