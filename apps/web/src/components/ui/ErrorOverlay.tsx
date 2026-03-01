import { useGameStore } from "../../stores/gameStore";

export function ErrorOverlay() {
  const error = useGameStore((s) => s.error);
  const reset = useGameStore((s) => s.reset);

  if (!error) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.9)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 200,
      fontFamily: "'Press Start 2P', monospace",
    }}>
      <div style={{ fontSize: "10px", color: "#d94a4a", marginBottom: "20px" }}>
        SIMULATION ERROR
      </div>
      <div style={{
        fontSize: "9px",
        color: "#a0a0a0",
        marginBottom: "30px",
        maxWidth: "500px",
        textAlign: "center",
        lineHeight: "2",
      }}>
        {error}
      </div>
      <button
        onClick={reset}
        style={{
          padding: "8px 16px",
          background: "transparent",
          border: "1px solid #4a90d9",
          color: "#4a90d9",
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          cursor: "pointer",
        }}
      >
        Back to scenarios
      </button>
    </div>
  );
}
