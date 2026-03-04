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
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 50%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: "'Press Start 2P', monospace",
      }}
    >
      <div style={{ fontSize: "18px", color: COLORS.accentBlue, letterSpacing: "0.15em", marginBottom: "40px" }}>
        SELECT YOUR AGENT
      </div>

      <div style={{ fontSize: "8px", color: "#606070", lineHeight: "2", textAlign: "center", maxWidth: "500px", marginBottom: "40px" }}>
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
          padding: "12px 24px",
          cursor: busy ? "wait" : "pointer",
          letterSpacing: "0.1em",
          marginBottom: "20px",
          fontFamily: "inherit",
          opacity: busy ? 0.5 : 1,
        }}
      >
        {busy ? "LOADING..." : "USE DEFAULT COORDINATOR"}
      </button>

      <div style={{ fontSize: "7px", color: "#404050", marginBottom: "20px" }}>— OR —</div>

      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          value={agentName}
          onChange={(e) => setAgentName(e.target.value)}
          placeholder="Agent name..."
          style={{
            fontSize: "8px",
            color: COLORS.textPrimary,
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(74, 144, 217, 0.3)",
            padding: "8px 12px",
            fontFamily: "inherit",
            outline: "none",
            width: "200px",
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
            padding: "8px 16px",
            cursor: busy ? "wait" : "pointer",
            fontFamily: "inherit",
            opacity: busy ? 0.5 : 1,
          }}
        >
          CREATE FROM MEMORY
        </button>
      </div>
    </div>
  );
}
