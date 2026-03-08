import { useState, useEffect } from "react";
import type { WerewolfGame, WerewolfAgentConfig } from "@openclaw/shared";
import { WEREWOLF_PRESETS } from "@openclaw/shared";
import { useWerewolfStore } from "../../stores/werewolfStore";
import { useGameStore } from "../../stores/gameStore";
import { createWerewolfGame, listWerewolfGames } from "../../services/werewolf-api";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

const ACCENT = "#f0a500";
const BG_DARK = "#1a0a2e";
const BG_MID = "#0d1b2a";

const presetList = Object.values(WEREWOLF_PRESETS);

const DEFAULT_NAMES = [
  "Aldric", "Selene", "Thorne", "Isolde", "Gareth", "Mirabel", "Rowan",
];

interface AgentInput {
  agentName: string;
  presetId: string;
}

export function WerewolfLobby() {
  const { setPhase, setActiveGame, setGames, games } = useWerewolfStore();
  const setMainPhase = useGameStore((s) => s.setPhase);
  const [loading, setLoading] = useState(false);
  const [agentInputs, setAgentInputs] = useState<AgentInput[]>([
    { agentName: DEFAULT_NAMES[0], presetId: "aggressive_accuser" },
    { agentName: DEFAULT_NAMES[1], presetId: "quiet_observer" },
    { agentName: DEFAULT_NAMES[2], presetId: "charismatic_leader" },
    { agentName: DEFAULT_NAMES[3], presetId: "paranoid_detective" },
    { agentName: DEFAULT_NAMES[4], presetId: "emotional_empath" },
  ]);

  useEffect(() => {
    listWerewolfGames().then(setGames).catch(() => {});
  }, [setGames]);

  async function handleCreate() {
    const validAgents = agentInputs.filter((a) => a.agentName.trim());
    if (validAgents.length < 5) return;

    const agentConfigs: WerewolfAgentConfig[] = validAgents.map((a) => ({
      agentId: crypto.randomUUID(),
      agentName: a.agentName.trim(),
      agentSource: "preset" as const,
      presetId: a.presetId,
    }));

    setLoading(true);
    try {
      const game = await createWerewolfGame(agentConfigs);
      setActiveGame(game);
      setPhase("watching");
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function watchGame(game: WerewolfGame) {
    setActiveGame(game);
    setPhase(game.status === "finished" ? "finished" : "watching");
  }

  function addAgent() {
    if (agentInputs.length >= 7) return;
    const usedPresets = agentInputs.map((a) => a.presetId);
    const nextPreset = presetList.find((p) => !usedPresets.includes(p.id))?.id || presetList[0].id;
    setAgentInputs([
      ...agentInputs,
      { agentName: DEFAULT_NAMES[agentInputs.length] || "Villager", presetId: nextPreset },
    ]);
  }

  function removeAgent(idx: number) {
    if (agentInputs.length <= 5) return;
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
        background: `linear-gradient(180deg, ${BG_DARK} 0%, ${BG_MID} 50%, #000 100%)`,
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

      <div style={{
        fontSize: "18px",
        color: ACCENT,
        letterSpacing: "0.15em",
        marginBottom: "40px",
        textAlign: "center",
        fontFamily: FONTS.pixel,
      }}>
        AI WEREWOLF
      </div>

      <div style={{ maxWidth: "600px", margin: "0 auto", width: "100%" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerMd, color: COLORS.textSecondary, marginBottom: "20px", fontFamily: FONTS.pixel }}>
          ASSEMBLE THE VILLAGE
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ fontSize: STARTUP_SIZES.body, color: COLORS.textSecondary, display: "block", marginBottom: "12px" }}>
            VILLAGERS ({agentInputs.length}/7) - minimum 5
          </label>
          {agentInputs.map((agent, idx) => (
            <div
              key={idx}
              style={{
                padding: "12px 16px",
                background: "rgba(0,0,0,0.4)",
                border: `1px solid ${COLORS.textSecondary}30`,
                marginBottom: "8px",
              }}
            >
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
                <input
                  value={agent.agentName}
                  onChange={(e) => updateAgent(idx, { agentName: e.target.value })}
                  placeholder="Character Name"
                  style={{
                    fontFamily: FONTS.body,
                    fontSize: STARTUP_SIZES.headerMd,
                    padding: "6px 10px",
                    background: "rgba(0,0,0,0.4)",
                    border: `1px solid ${COLORS.textSecondary}30`,
                    color: COLORS.textPrimary,
                    flex: 1,
                  }}
                />
                {agentInputs.length > 5 && (
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

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
                {presetList.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => updateAgent(idx, { presetId: preset.id })}
                    style={{
                      fontFamily: FONTS.body,
                      fontSize: "7px",
                      color: agent.presetId === preset.id ? ACCENT : COLORS.textSecondary,
                      background: agent.presetId === preset.id ? `${ACCENT}15` : "rgba(0,0,0,0.3)",
                      border: `1px solid ${agent.presetId === preset.id ? ACCENT + "60" : COLORS.textSecondary + "20"}`,
                      padding: "6px 8px",
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ fontWeight: "bold", marginBottom: "2px" }}>{preset.label}</div>
                    <div style={{ opacity: 0.7, fontSize: "6px" }}>{preset.description}</div>
                  </button>
                ))}
              </div>
            </div>
          ))}
          {agentInputs.length < 7 && (
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
              + ADD VILLAGER
            </button>
          )}
        </div>

        <button
          onClick={handleCreate}
          disabled={loading || agentInputs.filter((a) => a.agentName.trim()).length < 5}
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
          }}
        >
          {loading ? "GATHERING VILLAGERS..." : "BEGIN THE NIGHT"}
        </button>
      </div>

      {games.length > 0 && (
        <div style={{ maxWidth: "600px", margin: "40px auto 0", width: "100%" }}>
          <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "16px", fontFamily: FONTS.pixel }}>
            EXISTING GAMES
          </div>
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
              <span>{game.players.map((p) => p.agentName).join(", ")}</span>
              <span
                style={{
                  color: game.status === "running" ? ACCENT : game.status === "finished" ? COLORS.textSecondary : COLORS.accentOrange,
                  fontFamily: FONTS.pixel,
                  fontSize: STARTUP_SIZES.bodySm,
                }}
              >
                {game.status.toUpperCase()} {game.status === "running" ? `R${game.currentRound}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
