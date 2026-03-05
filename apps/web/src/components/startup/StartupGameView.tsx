import { useStartupStore } from "../../stores/startupStore";
import { useStartupPolling } from "../../hooks/useStartupPolling";
import { EcosystemMap } from "./EcosystemMap";
import { AgentCard } from "./AgentCard";
import { TurnLog } from "./TurnLog";
import { MarketEventBanner } from "./MarketEventBanner";
import { ValuationChart } from "./ValuationChart";
import { COLORS } from "../../styles/theme";

export function StartupGameView() {
  const activeGame = useStartupStore((s) => s.activeGame);
  const setPhase = useStartupStore((s) => s.setPhase);

  useStartupPolling(activeGame?.id ?? null);

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        Loading game...
      </div>
    );
  }

  const font = "'Press Start 2P', monospace";
  const lastTurnLog = activeGame.turnLog[activeGame.turnLog.length - 1] ?? null;
  const currentEvent = lastTurnLog?.marketEvent ?? null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: font,
        overflow: "hidden",
      }}
    >
      {/* Top bar */}
      <MarketEventBanner
        event={currentEvent}
        turn={activeGame.currentTurn}
        maxTurns={activeGame.maxTurns}
        isRunning={activeGame.status === "running"}
      />

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Agent Cards */}
        <div
          style={{
            width: "240px",
            minWidth: "240px",
            padding: "16px",
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
              marginBottom: "16px",
              padding: "4px 0",
            }}
          >
            {"<"} BACK
          </button>
          {activeGame.agents.map((agent) => {
            const lastAction = lastTurnLog?.actions.find((a) => a.agentId === agent.agentId);
            return (
              <AgentCard
                key={agent.agentId}
                agent={agent}
                lastAction={lastAction ? `${lastAction.action.type}: ${lastAction.result.slice(0, 50)}` : undefined}
              />
            );
          })}
        </div>

        {/* Center: Ecosystem Map */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <EcosystemMap agents={activeGame.agents} />
        </div>

        {/* Right: Turn Log + Chart */}
        <div
          style={{
            width: "280px",
            minWidth: "280px",
            padding: "16px",
            overflowY: "auto",
            borderLeft: `1px solid ${COLORS.textSecondary}15`,
          }}
        >
          <ValuationChart game={activeGame} />
          <div style={{ marginTop: "16px" }} />
          <TurnLog game={activeGame} />
        </div>
      </div>
    </div>
  );
}
