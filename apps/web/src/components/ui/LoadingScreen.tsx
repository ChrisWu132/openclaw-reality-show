import React, { useState, useEffect } from "react";
import { COLORS } from "../../styles/theme";

const BOOT_LINES = [
  "INITIALIZING ORDER SURVEILLANCE NETWORK...",
  "LOADING COORDINATOR PROTOCOL v3.1...",
  "SCANNING WORK HALL 3 — 34 SUBJECTS REGISTERED",
  "COMPLIANCE MONITORING: ACTIVE",
  "FEAR INDEX CALIBRATION: NOMINAL",
  "CONNECTING TO SIMULATION...",
];

export function LoadingScreen() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    BOOT_LINES.forEach((_, i) => {
      timers.push(
        setTimeout(() => setVisibleLines(i + 1), 400 * (i + 1))
      );
    });
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."));
    }, 500);
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
      }}
    >
      <div
        style={{
          maxWidth: "600px",
          padding: "40px",
        }}
      >
        {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
          <div
            key={i}
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: i === visibleLines - 1 ? "#4A90D9" : "#404050",
              marginBottom: "12px",
              letterSpacing: "0.1em",
              lineHeight: "1.8",
              animation: "fadeIn 0.3s ease-in",
            }}
          >
            {i < visibleLines - 1 ? `[OK] ${line}` : `${line}${dots}`}
          </div>
        ))}
      </div>
    </div>
  );
}
