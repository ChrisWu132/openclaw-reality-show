import type { StartupAgent } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface ThinkingIndicatorProps {
  agent: StartupAgent | null;
}

export function ThinkingIndicator({ agent }: ThinkingIndicatorProps) {
  if (!agent) return null;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "16px 20px",
        fontFamily: FONTS.body,
      }}
    >
      <div style={{ display: "flex", gap: "4px" }}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: agent.color,
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
      <span style={{ fontSize: STARTUP_SIZES.body, color: agent.color }}>
        {agent.agentName}
      </span>
      <span style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary }}>
        is strategizing...
      </span>
    </div>
  );
}
