import type { StartupGame } from "@openclaw/shared";

interface ValuationChartProps {
  game: StartupGame;
}

export function ValuationChart({ game }: ValuationChartProps) {
  const font = "'Press Start 2P', monospace";

  if (game.turnLog.length === 0) {
    return (
      <div>
        <div style={{ fontSize: "7px", color: "#a0a0a0", fontFamily: font, marginBottom: "8px" }}>
          VALUATION
        </div>
        <div style={{ fontSize: "6px", color: "#606060", fontFamily: font, padding: "16px 0", textAlign: "center" }}>
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

  // If all valuations are zero, show message
  if (maxVal <= 1 && allValues.every((v) => v === 0)) {
    return (
      <div>
        <div style={{ fontSize: "7px", color: "#a0a0a0", fontFamily: font, marginBottom: "8px" }}>
          VALUATION
        </div>
        <div style={{ fontSize: "6px", color: "#606060", fontFamily: font, padding: "16px 0", textAlign: "center" }}>
          No valuation yet — deploy to get users
        </div>
      </div>
    );
  }
  const turns = game.turnLog.length;

  const W = 260;
  const H = 100;
  const PAD = 5;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;

  return (
    <div>
      <div style={{ fontSize: "7px", color: "#a0a0a0", fontFamily: font, marginBottom: "8px" }}>
        VALUATION
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ background: "rgba(0,0,0,0.3)" }}>
        {/* Grid lines */}
        {[0.25, 0.5, 0.75].map((frac) => (
          <line
            key={frac}
            x1={PAD}
            y1={PAD + plotH * (1 - frac)}
            x2={PAD + plotW}
            y2={PAD + plotH * (1 - frac)}
            stroke="#222"
            strokeWidth="0.5"
          />
        ))}

        {/* Lines per agent */}
        {series.map((s) => {
          if (s.values.length === 0) return null;
          const points = s.values
            .map((v, i) => {
              const x = PAD + (i / Math.max(turns - 1, 1)) * plotW;
              const y = PAD + plotH * (1 - v / maxVal);
              return `${x},${y}`;
            })
            .join(" ");
          return (
            <polyline
              key={s.agentId}
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          );
        })}
      </svg>

      {/* Legend */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
        {series.map((s) => (
          <div key={s.agentId} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <div style={{ width: "8px", height: "3px", background: s.color }} />
            <span style={{ fontSize: "5px", color: "#888", fontFamily: font }}>
              {s.name.slice(0, 10)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
