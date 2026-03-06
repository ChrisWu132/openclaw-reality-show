import { useState, useEffect } from "react";
import { PERSONALITY_PRESETS } from "@openclaw/shared";
import type { PresetId } from "@openclaw/shared";
import { useGameStore } from "../../stores/gameStore";
import { useSession } from "../../hooks/useSession";
import { probeOpenClaw } from "../../services/openclaw-gateway";
import { COLORS } from "../../styles/theme";

type ProbeStatus = "checking" | "connected" | "not-found";

export function AgentPicker() {
  const setAgentSource = useGameStore((s) => s.setAgentSource);
  const { createSession, loading } = useSession();
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [probeStatus, setProbeStatus] = useState<ProbeStatus>("checking");

  useEffect(() => {
    probeOpenClaw().then((ok) => setProbeStatus(ok ? "connected" : "not-found"));
  }, []);

  const handleOpenClawStart = async () => {
    setAgentSource("openclaw");
    // Small delay to let store update propagate
    await new Promise((r) => setTimeout(r, 0));
    await createSession();
  };

  const handlePresetStart = async (presetId: PresetId) => {
    setAgentSource("preset", presetId);
    await new Promise((r) => setTimeout(r, 0));
    await createSession();
  };

  const handleRandom = () => {
    const random = PERSONALITY_PRESETS[Math.floor(Math.random() * PERSONALITY_PRESETS.length)];
    handlePresetStart(random.id);
  };

  const busy = loading;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: "'Press Start 2P', monospace",
        position: "relative",
        overflow: "auto",
        paddingTop: "60px",
        paddingBottom: "40px",
      }}
    >
      {/* Vignette */}
      <div style={{ position: "fixed", inset: 0, background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <div style={{
        fontSize: "18px",
        color: COLORS.accentBlue,
        letterSpacing: "0.2em",
        marginBottom: "40px",
        textShadow: "0 0 25px rgba(74, 144, 217, 0.3)",
        animation: "fadeIn 0.8s ease-in",
        zIndex: 1,
      }}>
        SELECT YOUR AGENT
      </div>

      {/* Two-column layout */}
      <div style={{
        display: "flex",
        gap: "40px",
        alignItems: "flex-start",
        flexWrap: "wrap",
        justifyContent: "center",
        zIndex: 1,
        maxWidth: "900px",
      }}>
        {/* Path A: Bring Your OpenClaw */}
        <div style={{
          border: "1px solid rgba(74, 144, 217, 0.3)",
          padding: "24px",
          width: "340px",
          animation: "slideUp 0.6s ease-out 0.2s both",
        }}>
          <div style={{ fontSize: "10px", color: COLORS.accentBlue, marginBottom: "16px", letterSpacing: "0.1em" }}>
            BRING YOUR OPENCLAW
          </div>
          <div style={{ fontSize: "7px", color: "#606070", lineHeight: "2", marginBottom: "16px" }}>
            Connect your local OpenClaw agent.
            <br />
            It makes the decisions. You watch.
          </div>

          <div style={{ fontSize: "7px", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              display: "inline-block",
              background: probeStatus === "connected" ? "#7ACC5A"
                : probeStatus === "checking" ? "#D9974A"
                : "#D94A4A",
              boxShadow: probeStatus === "connected" ? "0 0 6px #7ACC5A" : "none",
            }} />
            <span style={{
              color: probeStatus === "connected" ? "#7ACC5A"
                : probeStatus === "checking" ? "#D9974A"
                : "#666",
            }}>
              {probeStatus === "connected" ? "CONNECTED"
                : probeStatus === "checking" ? "CHECKING..."
                : "NOT FOUND"}
            </span>
          </div>

          <button
            onClick={handleOpenClawStart}
            disabled={busy || probeStatus !== "connected"}
            style={{
              fontSize: "8px",
              color: probeStatus === "connected" ? COLORS.accentBlue : "#555",
              background: "transparent",
              border: `1px solid ${probeStatus === "connected" ? "rgba(74, 144, 217, 0.5)" : "rgba(85, 85, 85, 0.3)"}`,
              padding: "10px 20px",
              cursor: probeStatus === "connected" && !busy ? "pointer" : "not-allowed",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
              opacity: busy ? 0.5 : 1,
              transition: "border-color 0.3s, box-shadow 0.3s",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              if (probeStatus === "connected" && !busy) {
                e.currentTarget.style.borderColor = COLORS.accentBlue;
                e.currentTarget.style.boxShadow = "0 0 15px rgba(74, 144, 217, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = probeStatus === "connected" ? "rgba(74, 144, 217, 0.5)" : "rgba(85, 85, 85, 0.3)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {busy ? "CONNECTING..." : "CONNECT & PLAY"}
          </button>
        </div>

        {/* Path B: Quick Play */}
        <div style={{
          border: "1px solid rgba(217, 151, 74, 0.3)",
          padding: "24px",
          width: "440px",
          animation: "slideUp 0.6s ease-out 0.4s both",
        }}>
          <div style={{ fontSize: "10px", color: COLORS.accentOrange, marginBottom: "16px", letterSpacing: "0.1em" }}>
            QUICK PLAY
          </div>
          <div style={{ fontSize: "7px", color: "#606070", lineHeight: "2", marginBottom: "16px" }}>
            Pick a personality preset. Gemini decides.
          </div>

          {/* Preset grid */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "8px",
            marginBottom: "16px",
          }}>
            {PERSONALITY_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => {
                  setSelectedPreset(preset.id);
                  handlePresetStart(preset.id);
                }}
                disabled={busy}
                style={{
                  fontSize: "7px",
                  color: preset.color,
                  background: selectedPreset === preset.id ? `${preset.color}15` : "transparent",
                  border: `1px solid ${selectedPreset === preset.id ? preset.color : `${preset.color}40`}`,
                  padding: "10px 8px",
                  cursor: busy ? "wait" : "pointer",
                  fontFamily: "inherit",
                  textAlign: "left",
                  transition: "border-color 0.3s, box-shadow 0.3s, background 0.3s",
                  opacity: busy ? 0.5 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!busy) {
                    e.currentTarget.style.borderColor = preset.color;
                    e.currentTarget.style.boxShadow = `0 0 10px ${preset.color}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = selectedPreset === preset.id ? preset.color : `${preset.color}40`;
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <div style={{ marginBottom: "4px", letterSpacing: "0.05em" }}>{preset.name}</div>
                <div style={{ fontSize: "6px", color: "#606070", lineHeight: "1.8" }}>{preset.description}</div>
              </button>
            ))}
          </div>

          <button
            onClick={handleRandom}
            disabled={busy}
            style={{
              fontSize: "8px",
              color: COLORS.accentOrange,
              background: "transparent",
              border: "1px solid rgba(217, 151, 74, 0.5)",
              padding: "10px 20px",
              cursor: busy ? "wait" : "pointer",
              fontFamily: "inherit",
              letterSpacing: "0.1em",
              opacity: busy ? 0.5 : 1,
              transition: "border-color 0.3s, box-shadow 0.3s",
              width: "100%",
            }}
            onMouseEnter={(e) => {
              if (!busy) {
                e.currentTarget.style.borderColor = COLORS.accentOrange;
                e.currentTarget.style.boxShadow = "0 0 15px rgba(217, 151, 74, 0.2)";
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "rgba(217, 151, 74, 0.5)";
              e.currentTarget.style.boxShadow = "none";
            }}
          >
            {busy ? "LOADING..." : "RANDOM"}
          </button>
        </div>
      </div>
    </div>
  );
}
