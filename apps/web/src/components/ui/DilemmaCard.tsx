import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function DilemmaCard() {
  const dilemma = useGameStore((s) => s.currentDilemma);
  const scenePhase = useGameStore((s) => s.scenePhase);

  if (!dilemma || scenePhase === "idle" || scenePhase === "round_start") return null;

  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        background: "linear-gradient(transparent, rgba(0,0,0,0.95) 20%)",
        padding: "60px 30px 20px",
        fontFamily: "'Press Start 2P', monospace",
        pointerEvents: "none",
        zIndex: 10,
      }}
    >
      <div style={{ fontSize: "10px", color: COLORS.accentBlue, marginBottom: "8px", letterSpacing: "0.1em" }}>
        {dilemma.title}
      </div>
      <div style={{ fontSize: "7px", color: COLORS.textSecondary, lineHeight: "2", maxWidth: "700px", marginBottom: "12px" }}>
        {dilemma.description}
      </div>

      {scenePhase === "dilemma" && (
        <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
          {dilemma.choices.map((choice) => (
            <div
              key={choice.id}
              style={{
                flex: 1,
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "8px 12px",
                background: "rgba(0,0,0,0.4)",
              }}
            >
              <div style={{ fontSize: "8px", color: COLORS.textPrimary, marginBottom: "4px" }}>
                {choice.label}
              </div>
              <div style={{ fontSize: "6px", color: COLORS.textSecondary, lineHeight: "1.8" }}>
                {choice.description}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
