import { useState, useEffect } from "react";
import { COLORS } from "../../styles/theme";

const BOOT_LINES = [
  "INITIALIZING MORAL CALCULUS ENGINE...",
  "LOADING TROLLEY SCENARIO MATRIX...",
  "CALIBRATING DECISION FRAMEWORK v4.2...",
  "ETHICAL WEIGHT COEFFICIENTS: LOADED",
  "PERSONALITY MATRIX: SYNCHRONIZED",
  "CONNECTING TO SIMULATION...",
];

export function LoadingScreen() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleLines(i + 1), 350 * (i + 1)));
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: COLORS.bgPrimary,
        position: "relative",
      }}
    >
      {/* Scanline effect */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "repeating-linear-gradient(transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ maxWidth: "600px", padding: "40px" }}>
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => {
          const isActive = i === visibleLines - 1;
          const isComplete = i < visibleLines - 1;
          return (
            <div
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "8px",
                color: isActive ? COLORS.accentBlue : isComplete ? "#3a5040" : "#404050",
                marginBottom: "14px",
                letterSpacing: "0.1em",
                lineHeight: "1.8",
                animation: "slideUp 0.3s ease-out",
              }}
            >
              {isComplete ? (
                <><span style={{ color: "#4ade80" }}>[OK]</span> {line}</>
              ) : (
                <>{line}{dots}</>
              )}
            </div>
          );
        })}

        {/* Progress bar */}
        <div style={{
          width: "100%",
          height: "3px",
          background: "rgba(255,255,255,0.03)",
          marginTop: "20px",
        }}>
          <div style={{
            width: `${(visibleLines / BOOT_LINES.length) * 100}%`,
            height: "100%",
            background: COLORS.accentBlue,
            transition: "width 0.4s ease-out",
            boxShadow: `0 0 8px ${COLORS.accentBlue}44`,
          }} />
        </div>
      </div>
    </div>
  );
}
