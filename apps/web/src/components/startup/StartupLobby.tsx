import { useState, useEffect } from "react";
import type { StartupGame, StartupAgentConfig } from "@openclaw/shared";
import { STARTUP_PRESETS } from "@openclaw/shared";
import { useStartupStore } from "../../stores/startupStore";
import { useGameStore } from "../../stores/gameStore";
import {
  createStartupGame,
  listStartupGames,
} from "../../services/startup-api";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

const ACCENT = "#4ad9b1";

interface AgentInput {
  agentName: string;
  presetId: string;
}

const DEFAULT_NAMES = ["NeuralForge", "DeepScale AI", "SynthMind", "Cognito Labs"];

export function StartupLobby() {
  const { setPhase, setActiveGame, setGames, games } = useStartupStore();
  const setMainPhase = useGameStore((s) => s.setPhase);
  const [loading, setLoading] = useState(false);
  const [agentInputs, setAgentInputs] = useState<AgentInput[]>([
    { agentName: DEFAULT_NAMES[0], presetId: "growth_hacker" },
    { agentName: DEFAULT_NAMES[1], presetId: "deep_tech" },
  ]);

  useEffect(() => {
    listStartupGames().then(setGames).catch(() => {});
  }, [setGames]);

  async function handleCreate() {
    const validAgents = agentInputs.filter((a) => a.agentName.trim());
    if (validAgents.length < 2) return;

    const agentConfigs: StartupAgentConfig[] = validAgents.map((a) => ({
      agentId: crypto.randomUUID(),
      agentName: a.agentName.trim(),
      agentSource: "preset" as const,
      presetId: a.presetId,
    }));

    setLoading(true);
    try {
      const game = await createStartupGame(agentConfigs);
      setActiveGame(game);
      setPhase("intro");
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
    const presets = STARTUP_PRESETS.map((p) => p.id);
    const usedPresets = agentInputs.map((a) => a.presetId);
    const nextPreset = presets.find((p) => !usedPresets.includes(p)) || presets[0];
    setAgentInputs([
      ...agentInputs,
      { agentName: DEFAULT_NAMES[agentInputs.length] || "Agent", presetId: nextPreset },
    ]);
  }

  function removeAgent(idx: number) {
    if (agentInputs.length <= 2) return;
    setAgentInputs(agentInputs.filter((_, i) => i !== idx));
  }

  function updateAgent(idx: number, updates: Partial<AgentInput>) {
    const arr = [...agentInputs];
    arr[idx] = { ...arr[idx], ...updates };
    setAgentInputs(arr);
  }

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
        fontFamily: FONTS.body,
      }}
    >
      <button
        onClick={() => setMainPhase("mode-select")}
        style={{
          fontFamily: FONTS.pixel,
          fontSize: STARTUP_SIZES.body,
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

      <div style={{ fontSize: "18px", color: ACCENT, letterSpacing: "0.15em", marginBottom: "40px", textAlign: "center", fontFamily: FONTS.pixel }}>
        AI STARTUP ARENA
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerMd, color: COLORS.textSecondary, marginBottom: "20px", fontFamily: FONTS.pixel }}>NEW GAME</div>

        {/* Agent Cards */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: STARTUP_SIZES.body, color: COLORS.textSecondary, display: "block", marginBottom: "12px" }}>
            AI FOUNDERS ({agentInputs.length}/4)
          </label>
          {agentInputs.map((agent, idx) => (
            <div
              key={idx}
              style={{
                padding: "16px",
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${COLORS.textSecondary}30`,
                marginBottom: "12px",
              }}
            >
              {/* Name row */}
              <div style={{ display: "flex", gap: "8px", marginBottom: "12px", alignItems: "center" }}>
                <input
                  value={agent.agentName}
                  onChange={(e) => updateAgent(idx, { agentName: e.target.value })}
                  placeholder="Company Name"
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: STARTUP_SIZES.headerMd,
                    padding: "8px 12px",
                    background: "rgba(0,0,0,0.4)",
                    border: `1px solid ${COLORS.textSecondary}30`,
                    color: COLORS.textPrimary,
                    flex: 1,
                  }}
                />
                {agentInputs.length > 2 && (
                  <button
                    onClick={() => removeAgent(idx)}
                    style={{
                      fontFamily: FONTS.pixel,
                      fontSize: STARTUP_SIZES.body,
                      color: COLORS.accentRed,
                      background: "transparent",
                      border: "none",
                      cursor: "pointer",
                      padding: "4px 8px",
                    }}
                  >
                    X
                  </button>
                )}
              </div>

              {/* Preset grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                {STARTUP_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => updateAgent(idx, { presetId: preset.id })}
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: STARTUP_SIZES.body,
                      color: agent.presetId === preset.id ? preset.color : COLORS.textSecondary,
                      background: agent.presetId === preset.id ? `${preset.color}15` : "rgba(0,0,0,0.3)",
                      border: `1px solid ${agent.presetId === preset.id ? preset.color + "60" : COLORS.textSecondary + "20"}`,
                      padding: "8px 10px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{preset.name}</div>
                    <div style={{ fontSize: "7px", opacity: 0.7 }}>{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {agentInputs.length < 4 && (
            <button
              onClick={addAgent}
              style={{
                fontFamily: FONTS.pixel,
                fontSize: STARTUP_SIZES.body,
                color: ACCENT,
                background: "transparent",
                border: `1px dashed ${ACCENT}40`,
                padding: "10px 12px",
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
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.headerMd,
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
        <div style={{ maxWidth: "600px", margin: "40px auto 0", width: "100%" }}>
          <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "16px", fontFamily: FONTS.pixel }}>EXISTING GAMES</div>
          {games.map((game) => (
            <button
              key={game.id}
              onClick={() => watchGame(game)}
              style={{
                fontFamily: FONTS.body,
                fontSize: STARTUP_SIZES.body,
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
                  fontFamily: FONTS.pixel,
                  fontSize: STARTUP_SIZES.bodySm,
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
