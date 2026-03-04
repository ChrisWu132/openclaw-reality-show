import type { MoralDimension } from "@openclaw/shared";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

const DIMENSION_LABELS: Record<MoralDimension, string> = {
  utilitarian: "Utilitarian",
  deontological: "Deontological",
  virtue: "Virtue Ethics",
  authority: "Authority",
  self_preservation: "Self-Preservation",
  empathy: "Empathy",
};

const DIMENSION_COLORS: Record<MoralDimension, string> = {
  utilitarian: "#4a90d9",
  deontological: "#d94a4a",
  virtue: "#4ade80",
  authority: "#d4a574",
  self_preservation: "#a78bfa",
  empathy: "#f472b6",
};

function BarChart({ scores }: { scores: Record<MoralDimension, number> }) {
  const entries = Object.entries(scores) as [MoralDimension, number][];
  const maxAbs = Math.max(...entries.map(([, v]) => Math.abs(v)), 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px", width: "100%", maxWidth: "400px" }}>
      {entries.map(([dim, score]) => {
        const width = Math.abs(score) / maxAbs * 100;
        return (
          <div key={dim} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "6px", color: COLORS.textSecondary, width: "120px", textAlign: "right" }}>
              {DIMENSION_LABELS[dim]}
            </div>
            <div style={{ flex: 1, height: "8px", background: "rgba(255,255,255,0.05)", position: "relative" }}>
              <div
                style={{
                  position: "absolute",
                  left: score >= 0 ? "50%" : `${50 - width / 2}%`,
                  width: `${width / 2}%`,
                  height: "100%",
                  background: DIMENSION_COLORS[dim],
                  opacity: 0.8,
                }}
              />
            </div>
            <div style={{ fontSize: "7px", color: DIMENSION_COLORS[dim], width: "30px" }}>
              {score > 0 ? "+" : ""}{score}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function MoralProfileCard() {
  const moralProfile = useGameStore((s) => s.moralProfile);
  const narrative = useGameStore((s) => s.narrative);
  const decisionLog = useGameStore((s) => s.decisionLog);
  const reset = useGameStore((s) => s.reset);

  if (!moralProfile) return null;

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
        padding: "20px",
        overflow: "auto",
      }}
    >
      <div style={{ fontSize: "16px", color: COLORS.accentBlue, letterSpacing: "0.15em", marginBottom: "8px" }}>
        MORAL PROFILE
      </div>

      {moralProfile.dominantFramework && (
        <div style={{ fontSize: "10px", color: DIMENSION_COLORS[moralProfile.dominantFramework], marginBottom: "30px" }}>
          {DIMENSION_LABELS[moralProfile.dominantFramework].toUpperCase()}
        </div>
      )}

      <div style={{ display: "flex", gap: "40px", marginBottom: "30px" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", color: "#4ade80" }}>{moralProfile.totalSaved}</div>
          <div style={{ fontSize: "7px", color: COLORS.textSecondary, marginTop: "4px" }}>SAVED</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "20px", color: COLORS.accentRed }}>{moralProfile.totalSacrificed}</div>
          <div style={{ fontSize: "7px", color: COLORS.textSecondary, marginTop: "4px" }}>SACRIFICED</div>
        </div>
      </div>

      <BarChart scores={moralProfile.scores} />

      {narrative && (
        <div
          style={{
            maxWidth: "600px",
            fontSize: "8px",
            color: COLORS.textSecondary,
            lineHeight: "2.2",
            marginTop: "30px",
            textAlign: "center",
            fontStyle: "italic",
          }}
        >
          {narrative}
        </div>
      )}

      <div style={{ marginTop: "30px", maxWidth: "600px", width: "100%" }}>
        <div style={{ fontSize: "8px", color: "#606070", marginBottom: "12px", textAlign: "center" }}>
          DECISION LOG
        </div>
        {decisionLog.map((entry, i) => (
          <div
            key={i}
            style={{
              fontSize: "6px",
              color: COLORS.textSecondary,
              lineHeight: "2",
              marginBottom: "6px",
              padding: "4px 8px",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            Round {entry.round}: {entry.dilemmaTitle} — "{entry.choiceLabel}" ({entry.casualties} casualties)
          </div>
        ))}
      </div>

      <button
        onClick={reset}
        style={{
          marginTop: "30px",
          fontSize: "9px",
          color: COLORS.accentBlue,
          background: "transparent",
          border: `1px solid rgba(74, 144, 217, 0.4)`,
          padding: "12px 24px",
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "0.1em",
        }}
      >
        BEGIN ANOTHER CYCLE
      </button>
    </div>
  );
}
