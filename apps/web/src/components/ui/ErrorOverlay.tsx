import { useGameStore } from "../../stores/gameStore";
import { COLORS } from "../../styles/theme";

export function ErrorOverlay() {
  const error = useGameStore((s) => s.error);
  const reset = useGameStore((s) => s.reset);

  if (!error) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0, 0, 0, 0.92)",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      zIndex: 200,
      fontFamily: "'Press Start 2P', monospace",
      animation: "fadeIn 0.3s ease-in",
    }}>
      {/* Red tint */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, rgba(217, 74, 74, 0.08) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      <div style={{
        fontSize: "12px",
        color: COLORS.accentRed,
        marginBottom: "24px",
        letterSpacing: "0.2em",
        textShadow: "0 0 20px rgba(217, 74, 74, 0.3)",
      }}>
        SIMULATION ERROR
      </div>
      <div style={{
        fontSize: "8px",
        color: "#a0a0a0",
        marginBottom: "35px",
        maxWidth: "500px",
        textAlign: "center",
        lineHeight: "2.2",
      }}>
        {error}
      </div>
      <button
        onClick={reset}
        style={{
          padding: "10px 20px",
          background: "transparent",
          border: `1px solid rgba(74, 144, 217, 0.4)`,
          color: COLORS.accentBlue,
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "8px",
          cursor: "pointer",
          letterSpacing: "0.1em",
          transition: "border-color 0.3s, box-shadow 0.3s",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = COLORS.accentBlue;
          e.currentTarget.style.boxShadow = "0 0 15px rgba(74, 144, 217, 0.2)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.4)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        RETURN TO MENU
      </button>
    </div>
  );
}
