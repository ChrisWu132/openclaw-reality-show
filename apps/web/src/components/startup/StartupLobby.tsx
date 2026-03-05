import { useState, useEffect } from "react";
import type { StartupGame } from "@openclaw/shared";
import { useStartupStore } from "../../stores/startupStore";
import { useGameStore } from "../../stores/gameStore";
import {
  createStartupGame,
  listStartupGames,
  startStartupGame as apiStartGame,
} from "../../services/startup-api";
import { COLORS } from "../../styles/theme";

const ACCENT = "#4ad9b1";

export function StartupLobby() {
  const { setPhase, setActiveGame, setGames, games } = useStartupStore();
  const setMainPhase = useGameStore((s) => s.setPhase);
  const [loading, setLoading] = useState(false);
  const [agentInputs, setAgentInputs] = useState([
    { agentId: "", agentName: "NeuralForge" },
    { agentId: "", agentName: "DeepScale AI" },
  ]);

  useEffect(() => {
    listStartupGames().then(setGames).catch(() => {});
  }, [setGames]);

  async function handleCreate() {
    const validAgents = agentInputs.filter((a) => a.agentName.trim());
    if (validAgents.length < 2) return;

    const agents = validAgents.map((a) => ({
      agentId: a.agentId || crypto.randomUUID(),
      agentName: a.agentName.trim(),
    }));

    setLoading(true);
    try {
      const game = await createStartupGame(agents);
      setActiveGame(game);
      await apiStartGame(game.id);
      setPhase("watching");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function watchGame(game: StartupGame) {
    setActiveGame(game);
    setPhase(game.status === "finished" ? "finished" : "watching");
  }

  function addAgent() {
    if (agentInputs.length >= 4) return;
    const names = ["NeuralForge", "DeepScale AI", "SynthMind", "Cognito Labs"];
    setAgentInputs([...agentInputs, { agentId: "", agentName: names[agentInputs.length] || "Agent" }]);
  }

  function removeAgent(idx: number) {
    if (agentInputs.length <= 2) return;
    setAgentInputs(agentInputs.filter((_, i) => i !== idx));
  }

  function updateAgent(idx: number, field: "agentId" | "agentName", value: string) {
    const updated = [...agentInputs];
    updated[idx] = { ...updated[idx], [field]: value };
    setAgentInputs(updated);
  }

  const font = "'Press Start 2P', monospace";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        overflow: "auto",
        padding: "40px",
        fontFamily: font,
      }}
    >
      <button
        onClick={() => setMainPhase("mode-select")}
        style={{
          fontFamily: font,
          fontSize: "8px",
          color: COLORS.textSecondary,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          alignSelf: "flex-start",
          marginBottom: "30px",
          padding: "4px 0",
        }}
      >
        {"<"} BACK TO MODES
      </button>

      <div style={{ fontSize: "16px", color: ACCENT, letterSpacing: "0.15em", marginBottom: "40px", textAlign: "center" }}>
        AI STARTUP ARENA
      </div>

      <div style={{ maxWidth: "500px", margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: "8px", color: COLORS.textSecondary, marginBottom: "16px" }}>NEW GAME</div>

        {/* Agent Inputs */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: "7px", color: COLORS.textSecondary, display: "block", marginBottom: "8px" }}>AI FOUNDERS</label>
          {agentInputs.map((agent, idx) => (
            <div key={idx} style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
              <input
                value={agent.agentName}
                onChange={(e) => updateAgent(idx, "agentName", e.target.value)}
                placeholder="Company Name"
                style={{
                  fontFamily: font,
                  fontSize: "8px",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${COLORS.textSecondary}30`,
                  color: COLORS.textPrimary,
                  flex: 1,
                }}
              />
              <input
                value={agent.agentId}
                onChange={(e) => updateAgent(idx, "agentId", e.target.value)}
                placeholder="Agent ID (optional)"
                style={{
                  fontFamily: font,
                  fontSize: "7px",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.4)",
                  border: `1px solid ${COLORS.textSecondary}30`,
                  color: COLORS.textSecondary,
                  flex: 1,
                }}
              />
              {agentInputs.length > 2 && (
                <button
                  onClick={() => removeAgent(idx)}
                  style={{
                    fontFamily: font,
                    fontSize: "8px",
                    color: COLORS.accentRed,
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                  }}
                >
                  X
                </button>
              )}
            </div>
          ))}
          {agentInputs.length < 4 && (
            <button
              onClick={addAgent}
              style={{
                fontFamily: font,
                fontSize: "7px",
                color: ACCENT,
                background: "transparent",
                border: `1px dashed ${ACCENT}40`,
                padding: "6px 12px",
                cursor: "pointer",
                width: "100%",
              }}
            >
              + ADD FOUNDER
            </button>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading}
          style={{
            fontFamily: font,
            fontSize: "10px",
            color: ACCENT,
            background: "transparent",
            border: `1px solid ${ACCENT}60`,
            padding: "14px 32px",
            cursor: loading ? "wait" : "pointer",
            width: "100%",
            letterSpacing: "0.15em",
            opacity: loading ? 0.5 : 1,
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = ACCENT;
              e.currentTarget.style.boxShadow = `0 0 25px ${ACCENT}30`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${ACCENT}60`;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {loading ? "LAUNCHING..." : "LAUNCH ARENA"}
        </button>
      </div>

      {/* Existing Games */}
      {games.length > 0 && (
        <div style={{ maxWidth: "500px", margin: "40px auto 0", width: "100%" }}>
          <div style={{ fontSize: "8px", color: COLORS.textSecondary, marginBottom: "16px" }}>EXISTING GAMES</div>
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => watchGame(game)}
              style={{
                fontFamily: font,
                fontSize: "7px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                width: "100%",
                padding: "12px 16px",
                background: "rgba(0,0,0,0.3)",
                border: `1px solid ${COLORS.textSecondary}20`,
                color: COLORS.textPrimary,
                cursor: "pointer",
                marginBottom: "8px",
                textAlign: "left",
              }}
            >
              <span>{game.agents.map((a) => a.agentName).join(" vs ")}</span>
              <span
                style={{
                  color: game.status === "running" ? ACCENT : game.status === "finished" ? COLORS.textSecondary : COLORS.accentOrange,
                }}
              >
                {game.status.toUpperCase()} {game.status === "running" ? `Q${game.currentTurn}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
