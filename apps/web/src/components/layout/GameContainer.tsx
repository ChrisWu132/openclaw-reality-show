import { useState, useEffect } from "react";
import { TrolleyScene } from "../../three/TrolleyScene";
import { DilemmaCard } from "../ui/DilemmaCard";
import { ReasoningPanel } from "../ui/ReasoningPanel";
import { RoundCounter } from "../ui/RoundCounter";
import { ConsequenceOverlay } from "../ui/ConsequenceOverlay";
import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

function AiDecidingIndicator() {
  const [dots, setDots] = useState("");
  const [thinkLine, setThinkLine] = useState(0);

  const THINK_LINES = [
    "Calculating moral weight...",
    "Evaluating consequences...",
    "Processing ethical framework...",
    "Weighing human cost...",
    "Analyzing decision vectors...",
  ];

  useEffect(() => {
    const dotInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    const lineInterval = setInterval(() => {
      setThinkLine((prev) => (prev + 1) % THINK_LINES.length);
    }, 2000);
    return () => {
      clearInterval(dotInterval);
      clearInterval(lineInterval);
    };
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        top: "50px",
        right: "20px",
        fontFamily: "'Press Start 2P', monospace",
        background: "rgba(0, 0, 0, 0.8)",
        border: "1px solid rgba(217, 122, 44, 0.3)",
        padding: "12px 18px",
        zIndex: 10,
        animation: "slideUp 0.4s ease-out",
        minWidth: "220px",
      }}
    >
      <div style={{ fontSize: "8px", color: COLORS.accentOrange, letterSpacing: "0.1em", marginBottom: "8px" }}>
        AI DECIDING{dots}
      </div>
      <div style={{ fontSize: "11px", fontFamily: "'IBM Plex Mono', 'Courier New', monospace", color: "#505060", lineHeight: "1.6" }}>
        {THINK_LINES[thinkLine]}
      </div>
    </div>
  );
}

function RoundTransition() {
  const currentRound = useGameStore((s) => s.currentRound);

  const tierColor: string =
    currentRound >= 8 ? COLORS.accentRed :
    currentRound >= 4 ? COLORS.accentOrange :
    COLORS.accentBlue;

  const tierLabel =
    currentRound >= 8 ? "NO GOOD OPTIONS" :
    currentRound >= 4 ? "ASYMMETRIC VALUE" :
    "CLASSIC DILEMMA";

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: COLORS.bgPrimary,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Press Start 2P', monospace",
        zIndex: 25,
        animation: "fadeIn 0.3s ease-in",
      }}
    >
      <div style={{
        fontSize: "16px",
        color: COLORS.textSecondary,
        letterSpacing: "0.25em",
        textShadow: `0 0 30px ${tierColor}44`,
      }}>
        ROUND {currentRound}
      </div>
      <div style={{ fontSize: "7px", color: tierColor, marginTop: "12px", letterSpacing: "0.15em", opacity: 0.7 }}>
        {tierLabel}
      </div>
    </div>
  );
}

/** Click prompt hint — centered on screen */
function ClickPrompt({ label }: { label: string }) {
  return (
    <div
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "10px",
        color: "rgba(255,255,255,0.6)",
        letterSpacing: "0.15em",
        animation: "pulse 2s infinite",
        zIndex: 30,
        pointerEvents: "none",
        textShadow: "0 0 10px rgba(255,255,255,0.1)",
        background: "rgba(0, 0, 0, 0.4)",
        padding: "12px 24px",
        borderRadius: "2px",
      }}
    >
      {label}
    </div>
  );
}

export function GameContainer() {
  const scenePhase = useGameStore((s) => s.scenePhase);
  const consequenceSubPhase = useGameStore((s) => s.consequenceSubPhase);
  const waitingForClick = useGameStore((s) => s.waitingForClick);
  const advanceClick = useGameStore((s) => s.advanceClick);
  const dilemmaFullyRevealed = useGameStore((s) => s.dilemmaFullyRevealed);

  // Determine click prompt text
  let clickLabel = "";
  if (waitingForClick) {
    switch (scenePhase) {
      case "round_start":
        clickLabel = "CLICK TO BEGIN";
        break;
      case "dilemma":
        clickLabel = "CLICK TO LET THE AI DECIDE";
        break;
      case "decision":
        clickLabel = "CLICK TO SEE CONSEQUENCE";
        break;
      case "consequence":
        clickLabel = "CLICK TO CONTINUE";
        break;
      default:
        clickLabel = "CLICK TO CONTINUE";
    }
  }

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        background: COLORS.bgPrimary,
        overflow: "hidden",
        cursor: waitingForClick ? "pointer" : "default",
      }}
      onClick={() => {
        if (waitingForClick) advanceClick();
      }}
    >
      <TrolleyScene />
      <RoundCounter />
      <DilemmaCard />
      <ReasoningPanel />
      <ConsequenceOverlay />

      {scenePhase === "round_start" && <RoundTransition />}
      {scenePhase === "deciding" && <AiDecidingIndicator />}

      {/* Click prompt — hidden during consequence animation until aftermath, and during dilemma until fully revealed */}
      {waitingForClick
        && !(scenePhase === "consequence" && consequenceSubPhase !== "aftermath")
        && !(scenePhase === "dilemma" && !dilemmaFullyRevealed)
        && <ClickPrompt label={clickLabel} />
      }
    </div>
  );
}
