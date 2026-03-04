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
    <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%", maxWidth: "450px" }}>
      {entries.map(([dim, score], i) => {
        const width = (Math.abs(score) / maxAbs) * 100;
        return (
          <div
            key={dim}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              animation: `slideUp 0.5s ease-out ${i * 0.1}s both`,
            }}
          >
            <div style={{ fontSize: "6px", color: COLORS.textSecondary, width: "110px", textAlign: "right", letterSpacing: "0.05em" }}>
              {DIMENSION_LABELS[dim]}
            </div>
            <div style={{ flex: 1, height: "10px", background: "rgba(255,255,255,0.04)", position: "relative", overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  left: score >= 0 ? "50%" : `${50 - width / 2}%`,
                  width: `${width / 2}%`,
                  height: "100%",
                  background: `linear-gradient(90deg, ${DIMENSION_COLORS[dim]}88, ${DIMENSION_COLORS[dim]})`,
                  transition: "width 1s ease-out",
                  boxShadow: `0 0 8px ${DIMENSION_COLORS[dim]}44`,
                }}
              />
              {/* Center line */}
              <div style={{ position: "absolute", left: "50%", top: 0, width: "1px", height: "100%", background: "rgba(255,255,255,0.1)" }} />
            </div>
            <div style={{ fontSize: "7px", color: DIMENSION_COLORS[dim], width: "35px", fontFamily: "'Press Start 2P', monospace" }}>
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
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        fontFamily: "'Press Start 2P', monospace",
        padding: "40px 20px 20px",
        overflow: "auto",
        position: "relative",
      }}
    >
      {/* Vignette */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)", pointerEvents: "none" }} />

      <div style={{
        fontSize: "18px",
        color: COLORS.accentBlue,
        letterSpacing: "0.2em",
        marginBottom: "8px",
        animation: "fadeIn 1s ease-in",
        textShadow: "0 0 30px rgba(74, 144, 217, 0.3)",
      }}>
        MORAL PROFILE
      </div>

      {moralProfile.dominantFramework && (
        <div style={{
          fontSize: "10px",
          color: DIMENSION_COLORS[moralProfile.dominantFramework],
          marginBottom: "30px",
          animation: "fadeIn 1.5s ease-in",
          textShadow: `0 0 20px ${DIMENSION_COLORS[moralProfile.dominantFramework]}44`,
        }}>
          {DIMENSION_LABELS[moralProfile.dominantFramework].toUpperCase()}
        </div>
      )}

      {/* Stats */}
      <div style={{
        display: "flex",
        gap: "60px",
        marginBottom: "35px",
        animation: "scaleIn 0.8s ease-out 0.3s both",
      }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", color: "#4ade80", textShadow: "0 0 20px rgba(74, 222, 128, 0.3)" }}>
            {moralProfile.totalSaved}
          </div>
          <div style={{ fontSize: "7px", color: COLORS.textSecondary, marginTop: "6px", letterSpacing: "0.1em" }}>SAVED</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "24px", color: COLORS.accentRed, textShadow: "0 0 20px rgba(217, 74, 74, 0.3)" }}>
            {moralProfile.totalSacrificed}
          </div>
          <div style={{ fontSize: "7px", color: COLORS.textSecondary, marginTop: "6px", letterSpacing: "0.1em" }}>SACRIFICED</div>
        </div>
      </div>

      <BarChart scores={moralProfile.scores} />

      {narrative && (
        <div
          style={{
            maxWidth: "600px",
            fontSize: "8px",
            color: COLORS.textSecondary,
            lineHeight: "2.4",
            marginTop: "35px",
            textAlign: "center",
            fontStyle: "italic",
            animation: "fadeIn 2s ease-in 0.8s both",
            padding: "0 20px",
          }}
        >
          "{narrative}"
        </div>
      )}

      {/* Decision Log */}
      <div style={{ marginTop: "35px", maxWidth: "600px", width: "100%" }}>
        <div style={{ fontSize: "8px", color: "#505060", marginBottom: "14px", textAlign: "center", letterSpacing: "0.1em" }}>
          DECISION LOG
        </div>
        {decisionLog.map((entry, i) => (
          <div
            key={i}
            style={{
              fontSize: "6px",
              color: COLORS.textSecondary,
              lineHeight: "2",
              marginBottom: "4px",
              padding: "6px 10px",
              background: "rgba(255,255,255,0.02)",
              borderLeft: `2px solid ${entry.casualties > 0 ? "rgba(217, 74, 74, 0.3)" : "rgba(74, 222, 128, 0.3)"}`,
              animation: `slideUp 0.3s ease-out ${i * 0.05}s both`,
            }}
          >
            <span style={{ color: "#606070" }}>R{entry.round}</span>{" "}
            {entry.dilemmaTitle} — <span style={{ color: COLORS.accentOrange }}>{entry.choiceLabel}</span>{" "}
            <span style={{ color: entry.casualties > 0 ? COLORS.accentRed : "#4ade80" }}>({entry.casualties} casualties)</span>
          </div>
        ))}
      </div>

      <button
        onClick={reset}
        style={{
          marginTop: "35px",
          marginBottom: "20px",
          fontSize: "9px",
          color: COLORS.accentBlue,
          background: "transparent",
          border: `1px solid rgba(74, 144, 217, 0.4)`,
          padding: "14px 28px",
          cursor: "pointer",
          fontFamily: "inherit",
          letterSpacing: "0.1em",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.accentBlue;
          e.currentTarget.style.boxShadow = "0 0 20px rgba(74, 144, 217, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.4)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        BEGIN ANOTHER CYCLE
      </button>
    </div>
  );
}
