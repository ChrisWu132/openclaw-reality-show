import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

const ACCENT_TEAL = "#4ad9b1";

export function ModeSelector() {
  const setPhase = useGameStore((s) => s.setPhase);
  const setGameMode = useGameStore((s) => s.setGameMode);

  function selectTrolley() {
    setGameMode("trolley");
    setPhase("agent-select");
  }

  function selectStartup() {
    setGameMode("startup");
    setPhase("startup");
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #020208 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.6) 100%)",
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "10px",
          color: COLORS.textSecondary,
          letterSpacing: "0.2em",
          marginBottom: "50px",
        }}
      >
        CHOOSE YOUR ARENA
      </div>

      <div style={{ display: "flex", gap: "40px" }}>
        {/* Trolley Problem Card */}
        <ModeCard
          title="THE TROLLEY PROBLEM"
          description="One AI agent faces 10 moral dilemmas. Who lives? Who dies?"
          accentColor={COLORS.accentRed}
          onClick={selectTrolley}
        />

        {/* AI Startup Arena Card */}
        <ModeCard
          title="AI STARTUP ARENA"
          description="2-4 AI founders compete to build the most valuable AI company."
          accentColor={ACCENT_TEAL}
          onClick={selectStartup}
        />
      </div>
    </div>
  );
}

function ModeCard({
  title,
  description,
  accentColor,
  onClick,
}: {
  title: string;
  description: string;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        background: "rgba(0, 0, 0, 0.5)",
        border: `1px solid ${accentColor}40`,
        padding: "40px 30px",
        width: "280px",
        cursor: "pointer",
        textAlign: "center",
        transition: "border-color 0.3s, box-shadow 0.3s, transform 0.2s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = accentColor;
        e.currentTarget.style.boxShadow = `0 0 30px ${accentColor}30, inset 0 0 30px ${accentColor}08`;
        e.currentTarget.style.transform = "translateY(-4px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = `${accentColor}40`;
        e.currentTarget.style.boxShadow = "none";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: accentColor,
          letterSpacing: "0.1em",
          marginBottom: "20px",
          lineHeight: "1.6",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: "7px",
          color: COLORS.textSecondary,
          lineHeight: "2.2",
        }}
      >
        {description}
      </div>
    </button>
  );
}
