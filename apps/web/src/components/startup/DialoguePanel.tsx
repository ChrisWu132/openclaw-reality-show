import { useEffect, useState, useRef } from "react";
import type { DialogueStatement, StartupAgent } from "@openclaw/shared";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

interface DialoguePanelProps {
  agents: StartupAgent[];
  statements: DialogueStatement[];
  latestStatement: DialogueStatement | null;
}

const TONE_COLORS: Record<string, string> = {
  threatening: "#d94a4a",
  mocking: "#d9a64a",
  diplomatic: "#4a90d9",
  desperate: "#a64ad9",
  confident: "#4ad97a",
  accusatory: "#d94a4a",
};

function TypewriterText({ text }: { text: string }) {
  const [displayed, setDisplayed] = useState("");
  const [isTyping, setIsTyping] = useState(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setDisplayed("");
    setIsTyping(true);
    let idx = 0;

    function typeNext() {
      if (idx < text.length) {
        setDisplayed(text.slice(0, idx + 1));
        idx++;
        timerRef.current = setTimeout(typeNext, 15);
      } else {
        setIsTyping(false);
      }
    }

    timerRef.current = setTimeout(typeNext, 50);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [text]);

  return (
    <span>
      {displayed}
      {isTyping && <span style={{ opacity: 0.5, animation: "pulse 0.8s ease-in-out infinite" }}>|</span>}
    </span>
  );
}

export function DialoguePanel({ agents, statements, latestStatement }: DialoguePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [statements.length]);

  if (statements.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          color: COLORS.textSecondary,
          fontFamily: FONTS.body,
        }}
      >
        Board meeting starting...
      </div>
    );
  }

  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "16px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: FONTS.pixel,
          fontSize: STARTUP_SIZES.headerSm,
          color: COLORS.textSecondary,
          marginBottom: "16px",
          letterSpacing: "0.1em",
          paddingBottom: "8px",
          borderBottom: `1px solid ${COLORS.textSecondary}20`,
        }}
      >
        QUARTERLY BOARD MEETING
      </div>

      {/* Statements */}
      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        }}
      >
        {statements.map((stmt, idx) => {
          const agent = agents.find((a) => a.agentId === stmt.speakerId);
          const targetAgent = stmt.targetAgentId
            ? agents.find((a) => a.agentId === stmt.targetAgentId)
            : null;
          const color = agent?.color || COLORS.textSecondary;
          const toneColor = TONE_COLORS[stmt.tone] || COLORS.textSecondary;
          const isLatest = stmt === latestStatement;

          return (
            <div
              key={idx}
              style={{
                padding: "12px 16px",
                background: "rgba(0,0,0,0.3)",
                borderLeft: `3px solid ${color}`,
                animation: isLatest ? "fadeIn 0.3s ease-in" : undefined,
              }}
            >
              {/* Speaker header */}
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                <div
                  style={{
                    width: "24px",
                    height: "24px",
                    borderRadius: "50%",
                    background: `${color}20`,
                    border: `2px solid ${color}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "11px",
                    fontWeight: "bold",
                    color,
                    fontFamily: FONTS.body,
                  }}
                >
                  {agent?.agentName?.charAt(0) || "?"}
                </div>
                <span style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.headerMd, color, fontWeight: "bold" }}>
                  {agent?.agentName || "Unknown"}
                </span>
                <span style={{ fontFamily: FONTS.pixel, fontSize: "9px", color: toneColor, padding: "2px 6px", border: `1px solid ${toneColor}40`, background: `${toneColor}10` }}>
                  {stmt.tone.toUpperCase()}
                </span>
                {targetAgent && (
                  <span style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary }}>
                    to {targetAgent.agentName}
                  </span>
                )}
                {!targetAgent && !stmt.targetAgentId && (
                  <span style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.bodySm, color: COLORS.textSecondary }}>
                    to everyone
                  </span>
                )}
              </div>

              {/* Statement text */}
              <div style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.body, color: COLORS.textPrimary, lineHeight: "1.7" }}>
                {isLatest ? <TypewriterText text={stmt.text} /> : `"${stmt.text}"`}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
