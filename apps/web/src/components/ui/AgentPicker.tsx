import { useState, useEffect, useRef } from "react";
import { PERSONALITY_PRESETS } from "@openclaw/shared";
import type { PresetId } from "@openclaw/shared";
import { useGameStore } from "../../stores/gameStore";
import { useSession } from "../../hooks/useSession";
import { probeOpenClaw, DEFAULT_OPENCLAW_URL } from "../../services/openclaw-gateway";
import { checkRelayStatus, startSession } from "../../services/api";
import { COLORS } from "../../styles/theme";

type ProbeStatus = "idle" | "checking" | "connected" | "not-found";
type OpenClawMode = "remote" | "local";

export function AgentPicker() {
  const setAgentSource = useGameStore((s) => s.setAgentSource);
  const setOpenclawUrl = useGameStore((s) => s.setOpenclawUrl);
  const openclawUrl = useGameStore((s) => s.openclawUrl);
  const joinCode = useGameStore((s) => s.joinCode);
  const sessionId = useGameStore((s) => s.sessionId);
  const sseUrl = useGameStore((s) => s.sseUrl);
  const relayConnected = useGameStore((s) => s.relayConnected);
  const { createSession, loading } = useSession();
  const [selectedPreset, setSelectedPreset] = useState<PresetId | null>(null);
  const [probeStatus, setProbeStatus] = useState<ProbeStatus>("idle");
  const [urlInput, setUrlInput] = useState(openclawUrl || DEFAULT_OPENCLAW_URL);
  const [openclawMode, setOpenclawMode] = useState<OpenClawMode>("remote");
  const [waitingForRelay, setWaitingForRelay] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Poll for relay connection when we have a join code
  useEffect(() => {
    if (!joinCode || relayConnected) {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    setWaitingForRelay(true);
    pollRef.current = setInterval(async () => {
      try {
        const status = await checkRelayStatus(joinCode);
        if (status.claimed) {
          useGameStore.getState().setRelayConnected(true);
          setWaitingForRelay(false);
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    }, 2000);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [joinCode, relayConnected]);

  // Auto-start session when relay connects
  useEffect(() => {
    if (relayConnected && sessionId) {
      startSession(sessionId).catch(() => {});
    }
  }, [relayConnected, sessionId]);

  const handleProbe = () => {
    setProbeStatus("checking");
    probeOpenClaw(urlInput).then((ok) => setProbeStatus(ok ? "connected" : "not-found"));
  };

  const handleOpenClawStart = async () => {
    if (openclawMode === "local") {
      setOpenclawUrl(urlInput);
    }
    setAgentSource("openclaw");
    await new Promise((r) => setTimeout(r, 0));
    await createSession(openclawMode === "remote");
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
            Connect your OpenClaw agent.
            <br />
            It makes the decisions. You watch.
          </div>

          {/* Mode toggle: Remote vs Local */}
          <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
            <button
              onClick={() => setOpenclawMode("remote")}
              style={{
                fontFamily: "inherit",
                fontSize: "7px",
                color: openclawMode === "remote" ? COLORS.accentBlue : "#606070",
                background: openclawMode === "remote" ? "rgba(74,144,217,0.1)" : "transparent",
                border: `1px solid ${openclawMode === "remote" ? "rgba(74,144,217,0.4)" : "rgba(255,255,255,0.1)"}`,
                padding: "6px 12px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              REMOTE
            </button>
            <button
              onClick={() => setOpenclawMode("local")}
              style={{
                fontFamily: "inherit",
                fontSize: "7px",
                color: openclawMode === "local" ? COLORS.accentBlue : "#606070",
                background: openclawMode === "local" ? "rgba(74,144,217,0.1)" : "transparent",
                border: `1px solid ${openclawMode === "local" ? "rgba(74,144,217,0.4)" : "rgba(255,255,255,0.1)"}`,
                padding: "6px 12px",
                cursor: "pointer",
                flex: 1,
              }}
            >
              LOCAL
            </button>
          </div>

          {/* Remote mode: Show join code after session creation */}
          {openclawMode === "remote" && !joinCode && (
            <>
              <div style={{ fontSize: "7px", color: "#606070", lineHeight: "2", marginBottom: "16px" }}>
                Share a link with your OpenClaw owner.
                <br />
                They run the relay on their machine.
              </div>
              <button
                onClick={handleOpenClawStart}
                disabled={busy}
                style={{
                  fontSize: "8px",
                  color: COLORS.accentBlue,
                  background: "transparent",
                  border: "1px solid rgba(74, 144, 217, 0.5)",
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
                    e.currentTarget.style.borderColor = COLORS.accentBlue;
                    e.currentTarget.style.boxShadow = "0 0 15px rgba(74, 144, 217, 0.2)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.5)";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                {busy ? "CREATING..." : "GET JOIN CODE"}
              </button>
            </>
          )}

          {/* Remote mode: Show join code + waiting state */}
          {openclawMode === "remote" && joinCode && (
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "6px", color: "#606070", marginBottom: "8px", letterSpacing: "0.1em" }}>
                SHARE THIS CODE
              </div>
              <div
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "24px",
                  color: COLORS.accentBlue,
                  letterSpacing: "0.3em",
                  marginBottom: "12px",
                  textShadow: "0 0 20px rgba(74, 144, 217, 0.4)",
                  userSelect: "all",
                  cursor: "pointer",
                }}
                title="Click to select"
              >
                {joinCode}
              </div>
              <div style={{ fontSize: "6px", color: "#606070", marginBottom: "12px" }}>
                OR SHARE THIS LINK:
              </div>
              <div
                style={{
                  fontSize: "7px",
                  color: COLORS.accentBlue,
                  background: "rgba(0,0,0,0.4)",
                  padding: "8px 12px",
                  border: "1px solid rgba(74,144,217,0.2)",
                  wordBreak: "break-all",
                  userSelect: "all",
                  cursor: "pointer",
                  marginBottom: "16px",
                }}
                onClick={() => {
                  const url = `${window.location.origin}/relay?code=${joinCode}`;
                  navigator.clipboard.writeText(url).catch(() => {});
                }}
                title="Click to copy"
              >
                {window.location.origin}/relay?code={joinCode}
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", fontSize: "7px" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    display: "inline-block",
                    background: relayConnected ? "#7ACC5A" : "#D9974A",
                    boxShadow: relayConnected ? "0 0 6px #7ACC5A" : "none",
                    animation: !relayConnected ? "pulse 1.5s ease-in-out infinite" : "none",
                  }}
                />
                <span style={{ color: relayConnected ? "#7ACC5A" : "#D9974A" }}>
                  {relayConnected ? "OPENCLAW CONNECTED!" : "WAITING FOR OPENCLAW..."}
                </span>
              </div>
              {relayConnected && (
                <div style={{ fontSize: "6px", color: "#606070", marginTop: "8px" }}>
                  Game starting automatically...
                </div>
              )}
            </div>
          )}

          {/* Local mode: Original URL probe flow */}
          {openclawMode === "local" && (
            <>
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "6px", color: "#606070", marginBottom: "4px", letterSpacing: "0.05em" }}>OPENCLAW URL</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="ws://hostname:port"
                    style={{
                      fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
                      fontSize: "8px",
                      padding: "6px 8px",
                      background: "rgba(0,0,0,0.4)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: COLORS.textPrimary,
                      flex: 1,
                    }}
                  />
                  <button
                    onClick={handleProbe}
                    disabled={!urlInput.trim()}
                    style={{
                      fontFamily: "inherit",
                      fontSize: "7px",
                      color: COLORS.accentBlue,
                      background: "transparent",
                      border: "1px solid rgba(74, 144, 217, 0.3)",
                      padding: "6px 10px",
                      cursor: urlInput.trim() ? "pointer" : "not-allowed",
                      letterSpacing: "0.05em",
                    }}
                  >
                    PROBE
                  </button>
                </div>
              </div>

              {probeStatus !== "idle" && (
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
              )}

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
            </>
          )}
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
