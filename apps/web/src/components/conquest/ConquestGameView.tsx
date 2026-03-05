import { useConquestStore } from "../../stores/conquestStore";
import { useConquestPolling } from "../../hooks/useConquestPolling";
import { HexGrid } from "./HexGrid";
import { AgentSidebar } from "./AgentSidebar";
import { TurnLog } from "./TurnLog";
import { COLORS } from "../../styles/theme";

export function ConquestGameView() {
  const activeGame = useConquestStore((s) => s.activeGame);
  const selectedHex = useConquestStore((s) => s.selectedHex);
  const setSelectedHex = useConquestStore((s) => s.setSelectedHex);
  const setPhase = useConquestStore((s) => s.setPhase);

  useConquestPolling(activeGame?.id ?? null);

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        Loading game...
      </div>
    );
  }

  const font = "'Press Start 2P', monospace";

  return (
    <div
      style={{
        display: "flex",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      {/* Left Sidebar — Agent Stats */}
      <div
        style={{
          width: "260px",
          minWidth: "260px",
          padding: "20px",
          overflowY: "auto",
          borderRight: `1px solid ${COLORS.textSecondary}15`,
        }}
      >
        <button
          onClick={() => setPhase("lobby")}
          style={{
            fontFamily: font,
            fontSize: "7px",
            color: COLORS.textSecondary,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginBottom: "20px",
            padding: "4px 0",
          }}
        >
          {"<"} BACK TO LOBBY
        </button>
        <AgentSidebar game={activeGame} />
      </div>

      {/* Center — Hex Grid */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <HexGrid
          game={activeGame}
          selectedHex={selectedHex}
          onHexClick={setSelectedHex}
        />
      </div>

      {/* Right Sidebar — Turn Log */}
      <div
        style={{
          width: "280px",
          minWidth: "280px",
          padding: "20px",
          overflowY: "auto",
          borderLeft: `1px solid ${COLORS.textSecondary}15`,
        }}
      >
        <TurnLog game={activeGame} />

        {/* Selected hex info */}
        {selectedHex && (() => {
          const territory = activeGame.territories.find(
            (t) => t.coord.q === selectedHex.q && t.coord.r === selectedHex.r
          );
          if (!territory) return null;
          const agent = territory.owner
            ? activeGame.agents.find((a) => a.agentId === territory.owner)
            : null;

          return (
            <div
              style={{
                marginTop: "16px",
                padding: "12px",
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${COLORS.textSecondary}20`,
              }}
            >
              <div style={{ fontSize: "7px", color: COLORS.textSecondary, marginBottom: "6px" }}>
                HEX ({selectedHex.q}, {selectedHex.r})
              </div>
              <div style={{ fontSize: "7px", color: COLORS.textPrimary, lineHeight: "2" }}>
                <div>Terrain: {territory.terrain}</div>
                <div>Strength: {territory.strength}</div>
                <div>
                  Owner:{" "}
                  <span style={{ color: agent?.color || COLORS.textSecondary }}>
                    {agent?.agentName || "Neutral"}
                  </span>
                </div>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}
