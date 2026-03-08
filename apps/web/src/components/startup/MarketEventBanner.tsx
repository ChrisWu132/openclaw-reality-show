import type { MarketEvent } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface MarketEventBannerProps {
  event: MarketEvent | null;
  turn: number;
  maxTurns: number;
  isRunning?: boolean;
  decidedCount?: number;
  totalAgents?: number;
  turnPhase?: string;
}

const EVENT_COLORS: Record<string, string> = {
  NONE: COLORS.textSecondary,
  GPU_SHORTAGE: COLORS.accentRed,
  FUNDING_BOOM: "#4ad97a",
  REGULATION: COLORS.accentOrange,
  VIRAL_TREND: "#a64ad9",
  DATA_BREACH: COLORS.accentRed,
  HOSTILE_TAKEOVER: COLORS.accentRed,
  ACQUISITION_FRENZY: COLORS.accentOrange,
  FINAL_FUNDING: "#d9a64a",
};

const EVENT_DESCRIPTIONS: Record<string, string> = {
  GPU_SHORTAGE: "Compute costs +50%",
  FUNDING_BOOM: "Fundraising yields +50%",
  REGULATION: "Deploy costs +$30K",
  VIRAL_TREND: "User growth 2x",
  DATA_BREACH: "All agents lose 15 data",
  HOSTILE_TAKEOVER: "Leader pays $200K or loses 20% users",
  ACQUISITION_FRENZY: "Acquisition ratio drops to 3x",
  FINAL_FUNDING: "Top model agent gets $500K",
};

export function MarketEventBanner({ event, turn, maxTurns, isRunning, decidedCount, totalAgents, turnPhase }: MarketEventBannerProps) {
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
              color: turnPhase === "dialogue" ? "#4ad97a" : COLORS.accentOrange,
              animation: "pulse 1.5s ease-in-out infinite",
              fontFamily: FONTS.pixel,
            }}
          >
            {turnPhase === "dialogue" ? "BOARD MEETING" : "AI DECIDING..."}
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
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: "2px",
          }}
        >
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
          {EVENT_DESCRIPTIONS[event!.type] && (
            <span style={{ fontSize: "9px", color: COLORS.textSecondary, fontFamily: FONTS.body }}>
              {EVENT_DESCRIPTIONS[event!.type]}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
