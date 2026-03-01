import { useEffect, useState } from "react";
import { useGameStore } from "../../stores/gameStore";

export function ZoneLabel() {
  const location = useGameStore((s) => s.currentLocation);
  const label = useGameStore((s) => s.situationLabel);
  const situation = useGameStore((s) => s.currentSituation);
  const [time, setTime] = useState("00:00:00");

  // Fake surveillance timestamp
  useEffect(() => {
    const start = Date.now();
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const h = String(Math.floor(elapsed / 3600)).padStart(2, "0");
      const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
      const s = String(elapsed % 60).padStart(2, "0");
      setTime(`${h}:${m}:${s}`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  if (!location) return null;

  return (
    <div
      style={{
        position: "absolute",
        top: "6px",
        left: "6px",
        padding: "6px 10px",
        background: "rgba(0, 0, 0, 0.85)",
        border: "1px solid rgba(74, 144, 217, 0.2)",
        borderLeft: "2px solid rgba(74, 144, 217, 0.5)",
        zIndex: 10,
      }}
    >
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "7px",
        color: "#4A90D9",
        letterSpacing: "0.15em",
        marginBottom: "4px",
      }}>
        REC {time}
      </div>
      <div style={{
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "9px",
        color: "#c0c0d0",
      }}>
        {location}
      </div>
      {label && (
        <div style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "7px",
          marginTop: "4px",
          color: "#707080",
          letterSpacing: "0.05em",
        }}>
          [{situation}/6] {label}
        </div>
      )}
    </div>
  );
}
