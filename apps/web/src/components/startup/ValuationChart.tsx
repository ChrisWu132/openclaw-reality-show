import type { StartupGame } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface ValuationChartProps {
  game: StartupGame;
  height?: number;
}

export function ValuationChart({ game, height }: ValuationChartProps) {
  const H = height || STARTUP_SIZES.chartHeight;

  if (game.turnLog.length === 0) {
    return (
      <div>
        <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, fontFamily: FONTS.pixel, marginBottom: "8px" }}>
          VALUATION
        </div>
        <div style={{ fontSize: STARTUP_SIZES.body, color: "#606060", fontFamily: FONTS.body, padding: "16px 0", textAlign: "center" }}>
          No valuation yet — deploy to get users
        </div>
      </div>
    );
  }

  // Build valuation series per agent
  const series = game.agents.map((agent) => {
    const values = game.turnLog.map((entry) => {
      const turnAction = entry.actions.find((a) => a.agentId === agent.agentId);
      return turnAction?.valuationAfter ?? 0;
    });
    return { agentId: agent.agentId, color: agent.color, name: agent.agentName, values };
  });

  const allValues = series.flatMap((s) => s.values);
  const maxVal = Math.max(...allValues, 1);

  if (maxVal <= 1 && allValues.every((v) => v === 0)) {
    // Show mini resource comparison instead of empty message
    return (
      <div>
        <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, fontFamily: FONTS.pixel, marginBottom: "8px" }}>
          RESOURCES (no valuation yet)
        </div>
        <div style={{ display: "flex", gap: "16px", padding: "12px 0", justifyContent: "center", flexWrap: "wrap" }}>
          {game.agents.map((agent) => (
            <div key={agent.agentId} style={{ textAlign: "center" }}>
              <div style={{ fontSize: STARTUP_SIZES.bodySm, color: agent.color, fontFamily: FONTS.body, fontWeight: "bold", marginBottom: "6px" }}>
                {agent.agentName.slice(0, 10)}
              </div>
              <div style={{ display: "flex", gap: "4px" }}>
                {(["compute", "data", "model"] as const).map((key) => {
                  const val = agent.resources[key];
                  return (
                    <div key={key} style={{ width: "20px", textAlign: "center" }}>
                      <div
                        style={{
                          height: `${Math.max(4, val * 0.4)}px`,
                          width: "14px",
                          background: agent.color,
                          opacity: 0.6,
                          margin: "0 auto 2px",
                        }}
                      />
                      <div style={{ fontSize: "7px", color: COLORS.textSecondary }}>{key[0].toUpperCase()}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const turns = game.turnLog.length;
  const maxTurns = game.maxTurns;

  const W = 600;
  const YPAD = 20;
  const XPAD_LEFT = 50;
  const XPAD_RIGHT = 10;
  const plotW = W - XPAD_LEFT - XPAD_RIGHT;
  const plotH = H - YPAD * 2;

  // Y-axis: scale dynamically to actual data
  const yMax = Math.max(maxVal * 1.5, 10_000);
  const yStep = yMax / 4;
  const yLabels = [0, yStep, yStep * 2, yStep * 3, yMax].map((v) => Math.round(v));

  // X-axis labels
  const xLabels = [1, 5, 10, 15, 20].filter((t) => t <= maxTurns);

  // $100M threshold
  const thresholdY = YPAD + plotH * (1 - 100_000_000 / yMax);

  return (
    <div>
      <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, fontFamily: FONTS.pixel, marginBottom: "8px" }}>
        VALUATION
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "rgba(0,0,0,0.3)" }}>
        {/* Grid lines */}
        {yLabels.map((val) => {
          const y = YPAD + plotH * (1 - val / yMax);
          return (
            <g key={`y-${val}`}>
              <line
                x1={XPAD_LEFT}
                y1={y}
                x2={XPAD_LEFT + plotW}
                y2={y}
                stroke="#222"
                strokeWidth="0.5"
              />
              <text
                x={XPAD_LEFT - 4}
                y={y + 3}
                textAnchor="end"
                fill="#555"
                fontSize={STARTUP_SIZES.bodySm}
                fontFamily={FONTS.body}
              >
                {val >= 1_000_000 ? `$${(val / 1_000_000).toFixed(1)}M` : val === 0 ? "$0" : `$${(val / 1_000).toFixed(0)}K`}
              </text>
            </g>
          );
        })}

        {/* X-axis labels */}
        {xLabels.map((t) => {
          const x = XPAD_LEFT + ((t - 1) / Math.max(maxTurns - 1, 1)) * plotW;
          return (
            <text
              key={`x-${t}`}
              x={x}
              y={H - 4}
              textAnchor="middle"
              fill="#555"
              fontSize={STARTUP_SIZES.bodySm}
              fontFamily={FONTS.body}
            >
              Q{t}
            </text>
          );
        })}

        {/* $100M threshold dashed line — only show when scale is large enough */}
        {yMax >= 50_000_000 && (
          <line
            x1={XPAD_LEFT}
            y1={thresholdY}
            x2={XPAD_LEFT + plotW}
            y2={thresholdY}
            stroke="#d9a64a"
            strokeWidth="1"
            strokeDasharray="6 4"
            opacity="0.5"
          />
        )}

        {/* Lines per agent */}
        {series.map((s) => {
          if (s.values.length === 0) return null;
          const points = s.values
            .map((v, i) => {
              const x = XPAD_LEFT + (i / Math.max(turns - 1, 1)) * plotW;
              const y = YPAD + plotH * (1 - v / yMax);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={s.agentId}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth="2"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "6px" }}>
        {series.map((s) => (
          <div key={s.agentId} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "10px", height: "3px", background: s.color }} />
            <span style={{ fontSize: STARTUP_SIZES.legendText, color: "#888", fontFamily: FONTS.body }}>
              {s.name.slice(0, 14)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
