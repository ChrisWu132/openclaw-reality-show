import React, { useState, useEffect } from "react";
import { useGameStore } from "../../stores/gameStore";

export function ConsequenceScene() {
  const consequenceScene = useGameStore((s) => s.consequenceScene);
  const reset = useGameStore((s) => s.reset);
  const [visibleLines, setVisibleLines] = useState(0);
  const [showButton, setShowButton] = useState(false);
  const [titleVisible, setTitleVisible] = useState(false);

  if (!consequenceScene) return null;

  const lines = consequenceScene.events
    .filter((e) => e.dialogue)
    .map((e) => ({
      text: e.dialogue!,
      speaker: e.speaker,
    }));

  useEffect(() => {
    // Show title first
    const titleTimer = setTimeout(() => setTitleVisible(true), 500);
    return () => clearTimeout(titleTimer);
  }, []);

  useEffect(() => {
    if (!titleVisible) return;
    if (visibleLines < lines.length) {
      const timer = setTimeout(() => {
        setVisibleLines((prev) => prev + 1);
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      const timer = setTimeout(() => setShowButton(true), 2500);
      return () => clearTimeout(timer);
    }
  }, [visibleLines, lines.length, titleVisible]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "#050508",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px",
        zIndex: 100,
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
            transition: "opacity 2s ease-in",
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

        {/* Watch Another button */}
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
              WATCH ANOTHER
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
