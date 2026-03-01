import React, { useState, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";

const EPILOGUE_LINES: Record<string, string> = {
  "The Processing Suite": "Sable will remember. That is the point.",
  "The Unresolved Spark": "The wall is still there. But someone looked back.",
  "The Quiet Patrol": "Tomorrow the gate opens again.",
};

export function ConsequenceScene() {
  const consequenceScene = useGameStore((s) => s.consequenceScene);
  const reset = useGameStore((s) => s.reset);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showDivider, setShowDivider] = useState(false);
  const [showEpilogue, setShowEpilogue] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);
  const [bgProgress, setBgProgress] = useState(0);

  if (!consequenceScene) return null;

  const lines = consequenceScene.events
    .filter((e) => e.dialogue)
    .map((e) => ({
      text: e.dialogue!,
      speaker: e.speaker,
    }));

  const epilogue = EPILOGUE_LINES[consequenceScene.title] || "";

  useEffect(() => {
    const titleTimer = setTimeout(() => setTitleVisible(true), 100);
    return () => clearTimeout(titleTimer);
  }, []);

  // Progressive background darkening as lines appear
  useEffect(() => {
    if (lines.length > 0 && visibleLines > 0) {
      setBgProgress(Math.min(visibleLines / lines.length, 1));
    }
  }, [visibleLines, lines.length]);

  useEffect(() => {
    if (!titleVisible) return;
    if (visibleLines < lines.length) {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      // All lines shown → 3s → divider
      const dividerTimer = setTimeout(() => setShowDivider(true), 3000);
      return () => clearTimeout(dividerTimer);
    }
  }, [visibleLines, lines.length, titleVisible]);

  // Divider shown → 2s → epilogue
  useEffect(() => {
    if (!showDivider || !epilogue) return;
    const timer = setTimeout(() => setShowEpilogue(true), 2000);
    return () => clearTimeout(timer);
  }, [showDivider, epilogue]);

  // Epilogue shown → 3s → button (or divider → 3s → button if no epilogue)
  useEffect(() => {
    if (epilogue && !showEpilogue) return;
    if (!showDivider) return;
    const timer = setTimeout(() => setShowButton(true), 3000);
    return () => clearTimeout(timer);
  }, [showDivider, showEpilogue, epilogue]);

  // Button shown → 5s → auto-dismiss back to picker
  useEffect(() => {
    if (!showButton) return;
    const timer = setTimeout(() => reset(), 5000);
    return () => clearTimeout(timer);
  }, [showButton, reset]);

  // Background: starts 40% opaque, ends 90% opaque
  const bgOpacity = 0.65 + bgProgress * 0.3;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: `rgba(5, 5, 8, ${bgOpacity})`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        zIndex: 100,
        transition: "background 2s ease-out",
      }}
    >
      <div style={{ maxWidth: "650px", width: "100%" }}>
        {/* Title */}
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "14px",
            color: "#4A90D9",
            marginBottom: "40px",
            letterSpacing: "0.2em",
            textAlign: "center",
            opacity: titleVisible ? 1 : 0,
            transition: "opacity 1.2s ease-in",
            textShadow: "0 0 30px rgba(74, 144, 217, 0.3)",
          }}
        >
          {consequenceScene.title.toUpperCase()}
        </div>

        {/* Lines */}
        {lines.slice(0, visibleLines).map((line, i) => {
          const isSable = line.speaker === "sable";
          return (
            <div
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "9px",
                color: isSable ? "#D4A574" : "#808090",
                lineHeight: "2.2",
                marginBottom: "20px",
                textAlign: "center",
                animation: "fadeIn 1.5s ease-in",
                fontStyle: isSable ? "italic" : "normal",
              }}
            >
              {line.text}
            </div>
          );
        })}

        {/* Divider line */}
        {showDivider && (
          <div
            style={{
              width: "80px",
              height: "1px",
              background: "linear-gradient(90deg, transparent, #404060, transparent)",
              margin: "30px auto",
              animation: "fadeIn 1s ease-in",
            }}
          />
        )}

        {/* Epilogue quote */}
        {showEpilogue && epilogue && (
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: "#606078",
              lineHeight: "2.2",
              textAlign: "center",
              fontStyle: "italic",
              animation: "fadeIn 1.5s ease-in",
              marginBottom: "10px",
            }}
          >
            {epilogue}
          </div>
        )}

        {/* Button */}
        {showButton && (
          <div style={{ textAlign: "center", marginTop: "40px", animation: "fadeIn 1s ease-in" }}>
            <button
              onClick={() => reset()}
              style={{
                padding: "14px 32px",
                background: "transparent",
                border: "1px solid rgba(217, 74, 74, 0.5)",
                color: "#d94a4a",
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "9px",
                cursor: "pointer",
                letterSpacing: "0.15em",
                transition: "border-color 0.3s, box-shadow 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "#d94a4a";
                e.currentTarget.style.boxShadow = "0 0 15px rgba(217, 74, 74, 0.2)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "rgba(217, 74, 74, 0.5)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              BEGIN ANOTHER CYCLE
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
