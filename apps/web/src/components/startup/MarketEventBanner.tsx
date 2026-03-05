import type { MarketEvent } from "@openclaw/shared";
import { COLORS } from "../../styles/theme";

interface MarketEventBannerProps {
  event: MarketEvent | null;
  turn: number;
  maxTurns: number;
  isRunning?: boolean;
}

const EVENT_COLORS: Record<string, string> = {
  NONE: COLORS.textSecondary,
  GPU_SHORTAGE: COLORS.accentRed,
  FUNDING_BOOM: "#4ad97a",
  REGULATION: COLORS.accentOrange,
  VIRAL_TREND: "#a64ad9",
  DATA_BREACH: COLORS.accentRed,
};

export function MarketEventBanner({ event, turn, maxTurns, isRunning }: MarketEventBannerProps) {
  const font = "'Press Start 2P', monospace";
  const color = event ? EVENT_COLORS[event.type] || COLORS.textSecondary : COLORS.textSecondary;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        borderBottom: `1px solid ${COLORS.textSecondary}15`,
        fontFamily: font,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "10px", color: COLORS.textPrimary }}>
          QUARTER {turn}/{maxTurns}
        </span>
        {isRunning && (
          <span
            style={{
              fontSize: "7px",
              color: COLORS.accentOrange,
              animation: "pulse 1.5s ease-in-out infinite",
            }}
          >
            AI DECIDING...
          </span>
        )}
      </div>
      {event && event.type !== "NONE" && (
        <div
          style={{
            fontSize: "7px",
            color,
            padding: "4px 12px",
            border: `1px solid ${color}40`,
            background: `${color}10`,
          }}
        >
          {event.type.replace(/_/g, " ")}
        </div>
      )}
    </div>
  );
}
