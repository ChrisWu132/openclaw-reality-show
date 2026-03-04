import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function DilemmaCard() {
  const dilemma = useGameStore((s) => s.currentDilemma);
  const scenePhase = useGameStore((s) => s.scenePhase);
  const currentDecision = useGameStore((s) => s.currentDecision);

  if (!dilemma || scenePhase === "idle" || scenePhase === "round_start") return null;

  // Hide during consequence (ConsequenceOverlay takes center stage)
  const isConsequence = scenePhase === "consequence";
  const showChoices = scenePhase === "dilemma" || scenePhase === "deciding" || scenePhase === "decision";

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
        opacity: isConsequence ? 0.3 : 1,
        transition: "opacity 0.5s ease",
      }}
    >
      <div style={{ fontSize: "10px", color: COLORS.accentBlue, marginBottom: "8px", letterSpacing: "0.1em" }}>
        {dilemma.title}
      </div>
      <div style={{ fontSize: "7px", color: COLORS.textSecondary, lineHeight: "2", maxWidth: "700px", marginBottom: "12px" }}>
        {dilemma.description}
      </div>

      {showChoices && (
        <div style={{ display: "flex", gap: "20px", marginTop: "8px" }}>
          {dilemma.choices.map((choice) => {
            const isChosen = currentDecision?.choiceId === choice.id;
            return (
              <div
                key={choice.id}
                style={{
                  flex: 1,
                  border: `1px solid ${isChosen ? COLORS.accentOrange : "rgba(255,255,255,0.1)"}`,
                  padding: "8px 12px",
                  background: isChosen ? "rgba(217, 122, 44, 0.15)" : "rgba(0,0,0,0.4)",
                  transition: "all 0.4s ease",
                }}
              >
                <div style={{
                  fontSize: "8px",
                  color: isChosen ? COLORS.accentOrange : COLORS.textPrimary,
                  marginBottom: "4px",
                  transition: "color 0.4s ease",
                }}>
                  {isChosen ? "▸ " : ""}{choice.label}
                </div>
                <div style={{ fontSize: "6px", color: COLORS.textSecondary, lineHeight: "1.8" }}>
                  {choice.description}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
