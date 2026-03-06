import { useState } from "react";
import { useStartupStore } from "../../stores/startupStore";
import { startStartupGame as apiStartGame } from "../../services/startup-api";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

const ACCENT = "#4ad9b1";

const RESOURCES = [
  { name: "Cash", desc: "Operating funds for hiring, compute, and acquisitions", icon: "$" },
  { name: "Compute", desc: "Processing power (0-100) for training AI models", icon: "C" },
  { name: "Data", desc: "Dataset quality (0-100) for model training", icon: "D" },
  { name: "Model", desc: "Model quality (0-100) — your core product", icon: "M" },
  { name: "Users", desc: "Customer base and revenue source", icon: "U" },
];

const ACTIONS = [
  { name: "TRAIN", desc: "Invest compute + data to improve model quality" },
  { name: "DEPLOY", desc: "Ship your model to acquire users and revenue" },
  { name: "FUNDRAISE", desc: "Raise capital from investors" },
  { name: "ACQUIRE_COMPUTE", desc: "Buy or lease GPU capacity" },
  { name: "ACQUIRE_DATA", desc: "Purchase or scrape training data" },
  { name: "POACH", desc: "Steal talent from a competitor, degrading their resources" },
  { name: "OPEN_SOURCE", desc: "Release your model publicly for community growth" },
];

const WIN_CONDITIONS = [
  "Reach $100M valuation",
  "Acquire a rival (5x their valuation)",
  "Be the last company standing",
  "Highest valuation after 20 quarters",
];

export function StartupIntro() {
  const activeGame = useStartupStore((s) => s.activeGame);
  const setPhase = useStartupStore((s) => s.setPhase);
  const [starting, setStarting] = useState(false);

  async function handleBegin() {
    if (!activeGame) return;
    setStarting(true);
    try {
      await apiStartGame(activeGame.id);
      setPhase("watching");
    } catch (err) {
      alert((err as Error).message);
      setStarting(false);
    }
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        overflow: "auto",
        padding: "40px 40px 80px",
        fontFamily: FONTS.body,
        alignItems: "center",
      }}
    >
      <div style={{ maxWidth: "640px", width: "100%" }}>
        {/* Title */}
        <div
          style={{
            fontFamily: FONTS.pixel,
            fontSize: "18px",
            color: ACCENT,
            letterSpacing: "0.15em",
            textAlign: "center",
            marginBottom: "8px",
          }}
        >
          AI STARTUP ARENA
        </div>
        <div
          style={{
            fontSize: STARTUP_SIZES.body,
            color: COLORS.textSecondary,
            textAlign: "center",
            marginBottom: "36px",
            lineHeight: "1.6",
          }}
        >
          Watch AI founders compete to build the most valuable AI company over 20 quarters.
          <br />
          You are spectating. Click to advance through events.
        </div>

        {/* Resources */}
        <Section title="RESOURCES">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {RESOURCES.map((r) => (
              <div
                key={r.name}
                style={{
                  padding: "10px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${COLORS.textSecondary}15`,
                }}
              >
                <span style={{ fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm, color: ACCENT }}>{r.icon}</span>
                <span style={{ fontWeight: "bold", marginLeft: "8px", fontSize: STARTUP_SIZES.body, color: COLORS.textPrimary }}>{r.name}</span>
                <div style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary, marginTop: "4px" }}>{r.desc}</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Actions */}
        <Section title="AVAILABLE ACTIONS">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {ACTIONS.map((a) => (
              <div
                key={a.name}
                style={{
                  display: "flex",
                  gap: "12px",
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${COLORS.textSecondary}15`,
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm, color: ACCENT, minWidth: "120px" }}>{a.name}</span>
                <span style={{ fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary }}>{a.desc}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* Market Events */}
        <Section title="MARKET EVENTS">
          <div
            style={{
              padding: "10px 12px",
              background: "rgba(0,0,0,0.3)",
              border: `1px solid ${COLORS.textSecondary}15`,
              fontSize: STARTUP_SIZES.body,
              color: COLORS.textSecondary,
              lineHeight: "1.8",
            }}
          >
            Random events shake up the market each quarter: GPU shortages, funding booms,
            data breaches, talent wars, and regulatory changes. Adapt or fall behind.
          </div>
        </Section>

        {/* Win Conditions */}
        <Section title="WIN CONDITIONS">
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {WIN_CONDITIONS.map((w, i) => (
              <div
                key={i}
                style={{
                  padding: "8px 12px",
                  background: "rgba(0,0,0,0.3)",
                  border: `1px solid ${COLORS.textSecondary}15`,
                  fontSize: STARTUP_SIZES.body,
                  color: COLORS.textPrimary,
                }}
              >
                <span style={{ color: ACCENT, marginRight: "8px" }}>{i + 1}.</span>
                {w}
              </div>
            ))}
          </div>
        </Section>

        {/* Players */}
        {activeGame && (
          <Section title="COMPETITORS">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {activeGame.agents.map((a) => (
                <div
                  key={a.agentId}
                  style={{
                    padding: "8px 16px",
                    background: "rgba(0,0,0,0.3)",
                    border: `1px solid ${ACCENT}30`,
                    fontFamily: FONTS.pixel,
                    fontSize: STARTUP_SIZES.bodySm,
                    color: COLORS.textPrimary,
                  }}
                >
                  {a.agentName}
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* BEGIN button */}
        <button
          onClick={handleBegin}
          disabled={starting}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.headerLg,
            color: ACCENT,
            background: "transparent",
            border: `2px solid ${ACCENT}80`,
            padding: "18px 48px",
            cursor: starting ? "wait" : "pointer",
            width: "100%",
            letterSpacing: "0.2em",
            marginTop: "36px",
            opacity: starting ? 0.5 : 1,
            transition: "border-color 0.3s, box-shadow 0.3s",
          }}
          onMouseEnter={(e) => {
            if (!starting) {
              e.currentTarget.style.borderColor = ACCENT;
              e.currentTarget.style.boxShadow = `0 0 30px ${ACCENT}40`;
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = `${ACCENT}80`;
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          {starting ? "STARTING..." : "BEGIN"}
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "24px" }}>
      <div
        style={{
          fontFamily: FONTS.pixel,
          fontSize: STARTUP_SIZES.headerSm,
          color: COLORS.textSecondary,
          marginBottom: "10px",
          letterSpacing: "0.1em",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
