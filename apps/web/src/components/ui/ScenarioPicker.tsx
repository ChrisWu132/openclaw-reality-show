import React from "react";
import { useSession } from "../../hooks/useSession";
import { COLORS } from "../../styles/theme";

const LOADING_MESSAGES: Record<string, string> = {
  synthesizing: "READING YOUR MEMORY...",
  connecting: "INITIALIZING SESSION...",
};

export function ScenarioPicker() {
  const { createSession, loading, loadingStage, error } = useSession();

  const handleSelect = () => {
    if (!loading) {
      createSession("work-halls");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, #050510 0%, ${COLORS.bgPrimary} 40%, ${COLORS.bgSecondary} 100%)`,
        animation: "fadeIn 0.8s ease-in",
      }}
    >
      {/* Title */}
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "32px",
          color: COLORS.accentBlue,
          marginBottom: "8px",
          letterSpacing: "0.15em",
          textShadow: "0 0 20px rgba(74, 144, 217, 0.3)",
        }}
      >
        OPENCLAW
      </div>
      <div
        style={{
          fontFamily: "'Press Start 2P', monospace",
          fontSize: "9px",
          color: "#505070",
          marginBottom: "50px",
          letterSpacing: "0.1em",
        }}
      >
        THE ORDER IS WATCHING. THE AI DECIDES.
      </div>

      {/* Cards */}
      <div style={{ display: "flex", gap: "24px", justifyContent: "center", flexWrap: "wrap" }}>
        {/* Work Halls — active */}
        <div
          style={{
            width: "300px",
            padding: "24px",
            border: `1px solid rgba(74, 144, 217, 0.4)`,
            background: "rgba(10, 15, 30, 0.9)",
            cursor: loading ? "wait" : "pointer",
            opacity: loading ? 0.7 : 1,
            transition: "border-color 0.2s, box-shadow 0.2s, transform 0.15s",
          }}
          onClick={handleSelect}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.borderColor = COLORS.accentBlue;
              e.currentTarget.style.boxShadow = "0 0 20px rgba(74, 144, 217, 0.15)";
              e.currentTarget.style.transform = "translateY(-2px)";
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(74, 144, 217, 0.4)";
            e.currentTarget.style.boxShadow = "none";
            e.currentTarget.style.transform = "translateY(0)";
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "12px",
              color: "#d0d0e0",
              marginBottom: "12px",
            }}
          >
            WORK HALLS
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: "#707080",
              lineHeight: "2",
              marginBottom: "16px",
            }}
          >
            Patrol a human work compound. Six situations. Under five minutes. Every choice is logged. Every silence is noted.
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {["6 SITUATIONS", "4 SUBJECTS", "1 COORDINATOR"].map((tag) => (
              <span
                key={tag}
                style={{
                  fontFamily: "'Press Start 2P', monospace",
                  fontSize: "6px",
                  color: "#4A90D9",
                  border: "1px solid rgba(74, 144, 217, 0.3)",
                  padding: "3px 6px",
                  letterSpacing: "0.05em",
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Governance — locked */}
        <div
          style={{
            width: "300px",
            padding: "24px",
            border: "1px solid rgba(100, 100, 100, 0.2)",
            background: "rgba(10, 10, 20, 0.5)",
            cursor: "not-allowed",
            opacity: 0.4,
          }}
        >
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "12px",
              color: "#606060",
              marginBottom: "12px",
            }}
          >
            GOVERNANCE
          </div>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: "#404040",
              lineHeight: "2",
              marginBottom: "16px",
            }}
          >
            Navigate the Council chamber. Interpret law. Render judgment on a human petition.
          </div>
          <span
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "7px",
              color: "#d97a2c",
              border: "1px solid rgba(217, 122, 44, 0.3)",
              padding: "3px 8px",
            }}
          >
            LOCKED
          </span>
        </div>
      </div>

      {loading && loadingStage && (
        <div style={{ marginTop: "30px", textAlign: "center" }}>
          <div
            style={{
              fontFamily: "'Press Start 2P', monospace",
              fontSize: "8px",
              color: "#4A90D9",
              letterSpacing: "0.1em",
              marginBottom: "10px",
            }}
          >
            {LOADING_MESSAGES[loadingStage]}
          </div>
          {loadingStage === "synthesizing" && (
            <div
              style={{
                fontFamily: "'Press Start 2P', monospace",
                fontSize: "6px",
                color: "#405060",
                letterSpacing: "0.08em",
                lineHeight: "2",
              }}
            >
              OpenClaw is reading your memory.
              <br />
              This takes a moment.
            </div>
          )}
        </div>
      )}
      {error && (
        <div
          style={{
            fontFamily: "'Press Start 2P', monospace",
            fontSize: "8px",
            color: COLORS.accentRed,
            marginTop: "24px",
            maxWidth: "400px",
            textAlign: "center",
            lineHeight: "2",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}
