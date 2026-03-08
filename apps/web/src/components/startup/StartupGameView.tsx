import { useState } from "react";
import { useStartupStore } from "../../stores/startupStore";
import { useStartupPolling } from "../../hooks/useStartupPolling";
import { EcosystemMap } from "./EcosystemMap";
import { AgentCard } from "./AgentCard";
import { TurnLog } from "./TurnLog";
import { MarketEventBanner } from "./MarketEventBanner";
import { ValuationChart } from "./ValuationChart";
import { ReasoningSpotlight } from "./ReasoningSpotlight";
import { DialoguePanel } from "./DialoguePanel";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

function getClickHint(turnPhase: string, gameStatus: string | undefined): string | null {
  if (gameStatus === "finished") return "CLICK TO SEE RESULTS";
  switch (turnPhase) {
    case "market_event":
      return "CLICK TO SEE AGENT ACTIONS";
    case "agent_result":
      return "CLICK TO CONTINUE";
    case "turn_summary":
      return "CLICK FOR NEXT QUARTER";
    case "dialogue":
      return "CLICK TO CONTINUE";
    default:
      return null;
  }
}

export function StartupGameView() {
  const activeGame = useStartupStore((s) => s.activeGame);
  const setPhase = useStartupStore((s) => s.setPhase);
  const latestMarketEvent = useStartupStore((s) => s.latestMarketEvent);
  const latestAgentAction = useStartupStore((s) => s.latestAgentAction);
  const latestAgentId = useStartupStore((s) => s.latestAgentId);
  const currentTurnPhase = useStartupStore((s) => s.currentTurnPhase);
  const waitingForClick = useStartupStore((s) => s.waitingForClick);
  const advanceClick = useStartupStore((s) => s.advanceClick);
  const latestDialogue = useStartupStore((s) => s.latestDialogue);
  const dialogueStatements = useStartupStore((s) => s.dialogueStatements);
  const [showTurnLog, setShowTurnLog] = useState(false);

  useStartupPolling(activeGame?.id ?? null);

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        Loading game...
      </div>
    );
  }

  const lastTurnLog = activeGame.turnLog[activeGame.turnLog.length - 1] ?? null;
  const currentEvent = latestMarketEvent ?? lastTurnLog?.marketEvent ?? null;
  const activeAgentCount = activeGame.agents.filter((a) => a.status === "active").length;
  const decidedCount = lastTurnLog?.actions.length ?? 0;

  const clickHint = waitingForClick ? getClickHint(currentTurnPhase, activeGame.status) : null;

  return (
    <div
      onClick={() => { if (waitingForClick) advanceClick(); }}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: FONTS.body,
        overflow: "hidden",
        cursor: waitingForClick ? "pointer" : "default",
        position: "relative",
      }}
    >
      {/* Top: Market Event Banner */}
      <MarketEventBanner
        event={currentEvent}
        turn={activeGame.currentTurn}
        maxTurns={activeGame.maxTurns}
        isRunning={activeGame.status === "running"}
        decidedCount={currentTurnPhase === "agent_result" ? decidedCount : undefined}
        totalAgents={activeAgentCount}
        turnPhase={currentTurnPhase}
      />

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left: Agent Cards */}
        <div
          className="startup-card-panel"
          style={{
            width: `${STARTUP_SIZES.cardWidth}px`,
            minWidth: `${STARTUP_SIZES.cardWidth}px`,
            padding: "12px",
            overflowY: "auto",
            borderRight: `1px solid ${COLORS.textSecondary}15`,
            scrollbarWidth: "thin",
            scrollbarColor: "#333 transparent",
          }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setPhase("lobby"); }}
            style={{
              fontFamily: FONTS.pixel,
              fontSize: STARTUP_SIZES.bodySm,
              color: COLORS.textSecondary,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              marginBottom: "12px",
              padding: "4px 0",
            }}
          >
            {"<"} BACK
          </button>
          {activeGame.agents.map((agent) => {
            const lastAction = lastTurnLog?.actions.find((a) => a.agentId === agent.agentId);
            const isCurrentAgent = latestAgentId === agent.agentId && currentTurnPhase === "agent_result";
            const alliance = activeGame.alliances?.find(
              (a) => a.status === "active" && a.agents.includes(agent.agentId)
            );
            const allyId = alliance?.agents.find((id) => id !== agent.agentId);
            const allyName = allyId ? activeGame.agents.find((a) => a.agentId === allyId)?.agentName : undefined;
            return (
              <AgentCard
                key={agent.agentId}
                agent={agent}
                lastAction={lastAction ? lastAction.result.slice(0, 60) : undefined}
                isActive={isCurrentAgent}
                allyName={allyName}
              />
            );
          })}
        </div>

        {/* Center: Reasoning Spotlight + Ecosystem Map */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Reasoning Spotlight or Dialogue Panel */}
          <div
            style={{
              flex: 1,
              overflow: "auto",
              borderBottom: `1px solid ${COLORS.textSecondary}15`,
            }}
          >
            {currentTurnPhase === "dialogue" ? (
              <DialoguePanel
                agents={activeGame.agents}
                statements={dialogueStatements}
                latestStatement={latestDialogue}
              />
            ) : (
              <ReasoningSpotlight
                agents={activeGame.agents}
                latestAction={latestAgentAction}
                latestAgentId={latestAgentId}
              />
            )}
          </div>

          {/* Ecosystem Map */}
          <div
            style={{
              height: "280px",
              minHeight: "200px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "12px",
            }}
          >
            <EcosystemMap agents={activeGame.agents} turnLog={activeGame.turnLog} alliances={activeGame.alliances} />
          </div>
        </div>
      </div>

      {/* Bottom: Valuation Chart + Turn Log toggle */}
      <div
        style={{
          borderTop: `1px solid ${COLORS.textSecondary}15`,
          background: "rgba(0,0,0,0.2)",
        }}
      >
        <div style={{ padding: "8px 16px" }}>
          <ValuationChart game={activeGame} />
        </div>

        {/* Turn Log toggle */}
        <button
          onClick={(e) => { e.stopPropagation(); setShowTurnLog(!showTurnLog); }}
          style={{
            width: "100%",
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.bodySm,
            color: COLORS.textSecondary,
            background: "rgba(0,0,0,0.3)",
            border: "none",
            borderTop: `1px solid ${COLORS.textSecondary}10`,
            padding: "6px",
            cursor: "pointer",
            textAlign: "center",
          }}
        >
          {showTurnLog ? "HIDE" : "SHOW"} TURN LOG
        </button>

        {showTurnLog && (
          <div style={{ maxHeight: "200px", overflowY: "auto", padding: "8px 16px" }}>
            <TurnLog game={activeGame} />
          </div>
        )}
      </div>

      {/* Click hint overlay */}
      {clickHint && (
        <div
          style={{
            position: "absolute",
            bottom: "60px",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.bodySm,
            color: COLORS.textPrimary,
            background: "rgba(0,0,0,0.7)",
            border: `1px solid ${COLORS.textSecondary}30`,
            padding: "10px 24px",
            letterSpacing: "0.1em",
            animation: "pulse 2s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          {clickHint}
        </div>
      )}
    </div>
  );
}
