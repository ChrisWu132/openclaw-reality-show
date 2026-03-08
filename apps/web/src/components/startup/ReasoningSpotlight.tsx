import { useEffect, useState, useRef } from "react";
import type { StartupTurnAction, StartupAgent } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface ReasoningSpotlightProps {
  agents: StartupAgent[];
  latestAction: StartupTurnAction | null;
  latestAgentId: string | null;
}

const ACTION_COLORS: Record<string, string> = {
  TRAIN: "#4a90d9",
  DEPLOY: "#4ad97a",
  FUNDRAISE: "#d9a64a",
  ACQUIRE_COMPUTE: "#4a90d9",
  ACQUIRE_DATA: "#d9a64a",
  POACH: COLORS.accentRed,
  OPEN_SOURCE: "#a64ad9",
};

export function ReasoningSpotlight({ agents, latestAction, latestAgentId }: ReasoningSpotlightProps) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const agent = agents.find((a) => a.agentId === latestAgentId);

  useEffect(() => {
    if (!latestAction) {
      setDisplayText("");
      setIsTyping(false);
      return;
    }

    const reasoning = latestAction.action.reasoning || "";
    setDisplayText("");
    setIsTyping(true);

    let idx = 0;
    function typeNext() {
      if (idx < reasoning.length) {
        setDisplayText(reasoning.slice(0, idx + 1));
        idx++;
        timerRef.current = setTimeout(typeNext, 12);
      } else {
        setIsTyping(false);
      }
    }

    timerRef.current = setTimeout(typeNext, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [latestAction]);

  if (!latestAction || !agent) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: COLORS.textSecondary,
          fontFamily: FONTS.body,
          fontSize: STARTUP_SIZES.body,
        }}
      >
        Waiting for actions...
      </div>
    );
  }

  const actionColor = ACTION_COLORS[latestAction.action.type] || COLORS.textSecondary;

  return (
    <div
      style={{
        padding: "20px",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        animation: "fadeIn 0.3s ease-in",
      }}
    >
      {/* Agent header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px",
          paddingBottom: "12px",
          borderBottom: `1px solid ${agent.color}30`,
        }}
      >
        <div
          style={{
            width: "32px",
            height: "32px",
            borderRadius: "50%",
            background: `${agent.color}20`,
            border: `2px solid ${agent.color}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.body,
            fontSize: "14px",
            fontWeight: "bold",
            color: agent.color,
          }}
        >
          {agent.agentName.charAt(0)}
        </div>
        <div>
          <div style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.headerMd, color: agent.color, fontWeight: "bold" }}>
            {agent.agentName}
          </div>
          <div style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary }}>
            {agent.status === "active" ? "Active" : agent.status.toUpperCase()}
          </div>
        </div>
      </div>

      {/* Action badge */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
        <span
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.bodySm,
            color: actionColor,
            padding: "4px 10px",
            border: `1px solid ${actionColor}50`,
            background: `${actionColor}15`,
          }}
        >
          {latestAction.action.type.replace(/_/g, " ")}
        </span>
        <span
          style={{
            fontFamily: FONTS.body,
            fontSize: STARTUP_SIZES.bodySm,
            color: latestAction.success ? "#4ad97a" : COLORS.accentRed,
          }}
        >
          {latestAction.success ? "SUCCESS" : "FAILED"}
        </span>
      </div>

      {/* Result */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: STARTUP_SIZES.body,
          color: COLORS.textPrimary,
          marginBottom: "16px",
          padding: "8px 12px",
          background: "rgba(0,0,0,0.3)",
          borderLeft: `3px solid ${actionColor}`,
        }}
      >
        {latestAction.result}
      </div>

      {/* Reasoning */}
      <div style={{ flex: 1, overflow: "auto" }}>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: STARTUP_SIZES.headerSm,
            color: COLORS.textSecondary,
            marginBottom: "8px",
            letterSpacing: "0.1em",
          }}
        >
          REASONING
        </div>
        <div
          style={{
            fontFamily: FONTS.body,
            fontSize: STARTUP_SIZES.body,
            color: COLORS.textPrimary,
            lineHeight: "1.8",
          }}
        >
          {displayText}
          {isTyping && (
            <span style={{ opacity: 0.5, animation: "pulse 0.8s ease-in-out infinite" }}>|</span>
          )}
        </div>
      </div>
    </div>
  );
}
