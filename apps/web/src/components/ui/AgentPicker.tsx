import { useState } from "react";
import { useGameStore } from "../../stores/gameStore";
import { useSession } from "../../hooks/useSession";
import { createAgentFromMemory } from "../../services/api";
import { COLORS } from "../../styles/theme";

export function AgentPicker() {
  const setAgent = useGameStore((s) => s.setAgent);
  const { createSession, loading } = useSession();
  const [creating, setCreating] = useState(false);
  const [agentName, setAgentName] = useState("My OpenClaw");

  const handleStartWithDefault = async () => {
    await createSession();
  };

  const handleCreateFromMemory = async () => {
    setCreating(true);
    try {
      const { agentId, name } = await createAgentFromMemory(agentName);
      setAgent(agentId, name);
      await createSession();
    } catch (err) {
      // If OpenClaw not available, start without agent
      console.warn("OpenClaw unavailable, starting without agent:", err);
      await createSession();
    } finally {
      setCreating(false);
    }
  };

  const busy = loading || creating;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: "'Press Start 2P', monospace",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <div style={{
        fontSize: "18px",
        color: COLORS.accentBlue,
        letterSpacing: "0.2em",
        marginBottom: "40px",
        textShadow: "0 0 25px rgba(74, 144, 217, 0.3)",
        animation: "fadeIn 0.8s ease-in",
      }}>
        SELECT YOUR AGENT
      </div>

      <div style={{
        fontSize: "8px",
        color: "#606070",
        lineHeight: "2.2",
        textAlign: "center",
        maxWidth: "500px",
        marginBottom: "45px",
        animation: "fadeIn 1.2s ease-in",
      }}>
        Your agent will face 10 moral dilemmas.
        <br />
        Each choice reveals who they really are.
      </div>

      <button
        onClick={handleStartWithDefault}
        disabled={busy}
        style={{
          fontSize: "9px",
          color: COLORS.accentBlue,
          background: "transparent",
          border: `1px solid rgba(74, 144, 217, 0.4)`,
          padding: "14px 28px",
          cursor: busy ? "wait" : "pointer",
          letterSpacing: "0.1em",
          marginBottom: "24px",
          fontFamily: "inherit",
          opacity: busy ? 0.5 : 1,
          transition: "border-color 0.3s, box-shadow 0.3s, opacity 0.3s",
          animation: "slideUp 0.6s ease-out 0.4s both",
        }}
        onMouseEnter={(e) => {
          if (!busy) {
            e.currentTarget.style.borderColor = COLORS.accentBlue;
            e.currentTarget.style.boxShadow = "0 0 20px rgba(74, 144, 217, 0.2)";
          }
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.4)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        {busy ? "LOADING..." : "USE DEFAULT COORDINATOR"}
      </button>

      <div style={{
        fontSize: "7px",
        color: "#404050",
        marginBottom: "24px",
        animation: "fadeIn 1.5s ease-in",
      }}>
        — OR —
      </div>

      <div style={{
        display: "flex",
        gap: "10px",
        alignItems: "center",
        animation: "slideUp 0.6s ease-out 0.6s both",
      }}>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="Agent name..."
          style={{
            fontSize: "8px",
            color: COLORS.textPrimary,
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(74, 144, 217, 0.2)",
            padding: "10px 14px",
            fontFamily: "inherit",
            outline: "none",
            width: "200px",
            transition: "border-color 0.3s",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.5)";
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.2)";
          }}
        />
        <button
          onClick={handleCreateFromMemory}
          disabled={busy}
          style={{
            fontSize: "8px",
            color: COLORS.accentOrange,
            background: "transparent",
            border: `1px solid rgba(217, 122, 44, 0.4)`,
            padding: "10px 18px",
            cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit",
            opacity: busy ? 0.5 : 1,
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}
          onMouseEnter={(e) => {
            if (!busy) {
              e.currentTarget.style.borderColor = COLORS.accentOrange;
              e.currentTarget.style.boxShadow = "0 0 15px rgba(217, 122, 44, 0.2)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(217, 122, 44, 0.4)";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          CREATE FROM MEMORY
        </button>
      </div>
    </div>
  );
}
