import type { MarketEvent } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface MarketEventBannerProps {
  event: MarketEvent | null;
  turn: number;
  maxTurns: number;
  isRunning?: boolean;
  decidedCount?: number;
  totalAgents?: number;
}

const EVENT_COLORS: Record<string, string> = {
  NONE: COLORS.textSecondary,
  GPU_SHORTAGE: COLORS.accentRed,
  FUNDING_BOOM: "#4ad97a",
  REGULATION: COLORS.accentOrange,
  VIRAL_TREND: "#a64ad9",
  DATA_BREACH: COLORS.accentRed,
};

export function MarketEventBanner({ event, turn, maxTurns, isRunning, decidedCount, totalAgents }: MarketEventBannerProps) {
  const color = event ? EVENT_COLORS[event.type] || COLORS.textSecondary : COLORS.textSecondary;
  const hasEvent = event && event.type !== "NONE";

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 20px",
        borderBottom: `1px solid ${COLORS.textSecondary}15`,
        fontFamily: FONTS.body,
        background: hasEvent ? `${color}08` : "transparent",
        transition: "background 0.5s ease",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <span style={{ fontSize: STARTUP_SIZES.headerLg, color: COLORS.textPrimary, fontFamily: FONTS.pixel }}>
          QUARTER {turn}/{maxTurns}
        </span>
        {isRunning && (
          <span
            style={{
              fontSize: STARTUP_SIZES.body,
              color: COLORS.accentOrange,
              animation: "pulse 1.5s ease-in-out infinite",
              fontFamily: FONTS.pixel,
            }}
          >
            AI DECIDING...
          </span>
        )}
        {decidedCount !== undefined && totalAgents !== undefined && totalAgents > 0 && (
          <span style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary }}>
            {decidedCount}/{totalAgents} decided
          </span>
        )}
      </div>
      {hasEvent && (
        <div
          style={{
            fontSize: STARTUP_SIZES.headerSm,
            color,
            padding: "6px 16px",
            border: `1px solid ${color}40`,
            background: `${color}15`,
            fontFamily: FONTS.pixel,
            animation: "fadeIn 0.3s ease-in",
          }}
        >
          {event!.type.replace(/_/g, " ")}
        </div>
      )}
    </div>
  );
}
