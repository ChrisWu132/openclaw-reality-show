import { useConquestStore } from "../../stores/conquestStore";
import { useGameStore } from "../../stores/gameStore";
import { HexGrid } from "./HexGrid";
import { COLORS } from "../../styles/theme";

export function ConquestResults() {
  const activeGame = useConquestStore((s) => s.activeGame);
  const conquestReset = useConquestStore((s) => s.reset);
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
  const total = activeGame.territories.length;

  const winConditionLabel: Record<string, string> = {
    territorial_majority: "TERRITORIAL MAJORITY",
    last_standing: "LAST STANDING",
    turn_limit: "TURN LIMIT REACHED",
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
      {/* Winner Announcement */}
      <div style={{ fontSize: "10px", color: COLORS.textSecondary, letterSpacing: "0.2em", marginBottom: "16px" }}>
        GAME OVER — TURN {activeGame.currentTurn}
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

      {/* Final Map */}
      <div style={{ width: "100%", maxWidth: "500px", marginBottom: "40px" }}>
        <HexGrid
          game={activeGame}
          selectedHex={null}
          onHexClick={() => {}}
        />
      </div>

      {/* Per-Agent Stats */}
      <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", justifyContent: "center", marginBottom: "40px" }}>
        {activeGame.agents.map((agent) => {
          const owned = activeGame.territories.filter((t) => t.owner === agent.agentId).length;
          const isWinner = agent.agentId === activeGame.winner;
          return (
            <div
              key={agent.agentId}
              style={{
                padding: "16px 20px",
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${isWinner ? agent.color : COLORS.textSecondary + "30"}`,
                minWidth: "160px",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: "8px", color: agent.color, marginBottom: "8px" }}>
                {agent.agentName}
              </div>
              <div style={{ fontSize: "7px", color: COLORS.textSecondary, lineHeight: "2" }}>
                <div>Territories: {owned}/{total}</div>
                <div>Status: {agent.status === "eliminated" ? `ELIMINATED T${agent.eliminatedOnTurn}` : "ACTIVE"}</div>
                {isWinner && <div style={{ color: agent.color, marginTop: "4px" }}>WINNER</div>}
              </div>
            </div>
          );
        })}
      </div>

      {/* Back Buttons */}
      <div style={{ display: "flex", gap: "16px" }}>
        <button
          onClick={() => conquestReset()}
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
          NEW CONQUEST
        </button>
        <button
          onClick={() => {
            conquestReset();
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
