import { useState, useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function DilemmaCard() {
  const dilemma = useGameStore((s) => s.currentDilemma);
  const scenePhase = useGameStore((s) => s.scenePhase);
  const currentDecision = useGameStore((s) => s.currentDecision);
  const setDilemmaFullyRevealed = useGameStore((s) => s.setDilemmaFullyRevealed);

  const [step, setStep] = useState(0);
  const dilemmaIdRef = useRef<string | null>(null);

  // Reset step when a new dilemma arrives
  useEffect(() => {
    if (!dilemma || scenePhase !== "dilemma") return;

    const id = dilemma.id;
    if (dilemmaIdRef.current === id) return;
    dilemmaIdRef.current = id;
    setStep(0);
    setDilemmaFullyRevealed(false);

    const t1 = setTimeout(() => setStep(1), 800);
    const t2 = setTimeout(() => {
      setStep(2);
      setDilemmaFullyRevealed(true);
    }, 1800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [dilemma?.id, scenePhase, setDilemmaFullyRevealed]);

  // If we're past dilemma phase (deciding/decision), ensure everything is visible
  useEffect(() => {
    if (scenePhase === "deciding" || scenePhase === "decision") {
      setStep(2);
    }
  }, [scenePhase]);

  if (!dilemma || scenePhase === "idle" || scenePhase === "round_start") return null;

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
      {/* Title — step 0 */}
      <div style={{
        fontSize: "10px",
        color: COLORS.accentBlue,
        marginBottom: "8px",
        letterSpacing: "0.1em",
        opacity: step >= 0 ? 1 : 0,
        transform: step >= 0 ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.5s ease, transform 0.5s ease",
      }}>
        {dilemma.title}
      </div>

      {/* Description — step 1 */}
      <div style={{
        fontSize: "12px",
        fontFamily: "'IBM Plex Mono', 'Courier New', monospace",
        color: COLORS.textSecondary,
        lineHeight: "1.7",
        maxWidth: "700px",
        marginBottom: "12px",
        opacity: step >= 1 ? 1 : 0,
        transform: step >= 1 ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 0.6s ease, transform 0.6s ease",
      }}>
        {dilemma.description}
      </div>

      {/* Choices — step 2 */}
      {showChoices && (
        <div style={{
          display: "flex",
          gap: "20px",
          marginTop: "8px",
          opacity: step >= 2 ? 1 : 0,
          transform: step >= 2 ? "translateY(0)" : "translateY(15px)",
          transition: "opacity 0.6s ease, transform 0.6s ease",
        }}>
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
                  {isChosen ? "\u25B8 " : ""}{choice.label}
                </div>
                <div style={{ fontSize: "11px", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: COLORS.textSecondary, lineHeight: "1.6" }}>
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
