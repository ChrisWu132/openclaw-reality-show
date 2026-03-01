import React, { useEffect, useRef } from "react";
import { useGameStore } from "../../stores/gameStore";

export function IncidentPanel() {
  const incidentEntries = useGameStore((s) => s.incidentEntries);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest entry
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [incidentEntries.length]);

  if (incidentEntries.length === 0) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "6px",
        right: "6px",
        width: "240px",
        maxHeight: "200px",
        background: "rgba(0, 0, 0, 0.85)",
        border: "1px solid rgba(217, 74, 74, 0.25)",
        borderTop: "2px solid rgba(217, 74, 74, 0.5)",
        zIndex: 15,
      }}
    >
      <div
        style={{
          padding: "6px 8px",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "6px",
          color: "#d94a4a",
          letterSpacing: "0.15em",
          borderBottom: "1px solid rgba(217, 74, 74, 0.15)",
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        <span>INCIDENT LOG</span>
        <span style={{ color: "#804040" }}>{incidentEntries.length}</span>
      </div>
      <div
        ref={scrollRef}
        style={{
          maxHeight: "160px",
          overflowY: "auto",
          padding: "4px 8px",
        }}
      >
        {incidentEntries.map((entry, i) => {
          const isDetain = entry.toLowerCase().includes("detain");
          const isWarning = entry.toLowerCase().includes("warning");
          return (
            <div
              key={i}
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "6px",
                color: isDetain ? "#d94a4a" : isWarning ? "#cc9933" : "#707070",
                lineHeight: "1.8",
                padding: "3px 0",
                borderBottom:
                  i < incidentEntries.length - 1
                    ? "1px solid rgba(255, 255, 255, 0.03)"
                    : "none",
                animation: i === incidentEntries.length - 1 ? "fadeIn 0.5s ease-in" : "none",
              }}
            >
              {entry}
            </div>
          );
        })}
      </div>
    </div>
  );
}
