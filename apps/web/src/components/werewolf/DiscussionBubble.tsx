import { useEffect, useState, useRef } from "react";
import type { DiscussionStatement, WerewolfPlayer } from "@openclaw/shared";
import { FONTS, STARTUP_SIZES, COLORS } from "../../styles/theme";

const TONE_COLORS: Record<string, string> = {
  accusatory: "#e74c3c",
  defensive: "#3498db",
  analytical: "#9b59b6",
  emotional: "#e67e22",
  calm: "#2ecc71",
  suspicious: "#f39c12",
  confident: "#1abc9c",
};

interface DiscussionBubbleProps {
  statement: DiscussionStatement;
  players: WerewolfPlayer[];
}

export function DiscussionBubble({ statement, players }: DiscussionBubbleProps) {
  const [displayText, setDisplayText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const speaker = players.find((p) => p.agentId === statement.speakerId);
  const accusedPlayer = statement.accusation
    ? players.find((p) => p.agentId === statement.accusation)
    : null;
  const toneColor = TONE_COLORS[statement.tone] || COLORS.textSecondary;

  useEffect(() => {
    setDisplayText("");
    setIsTyping(true);

    let idx = 0;
    const text = statement.text;

    function typeNext() {
      if (idx < text.length) {
        setDisplayText(text.slice(0, idx + 1));
        idx++;
        timerRef.current = setTimeout(typeNext, 15);
      } else {
        setIsTyping(false);
      }
    }

    timerRef.current = setTimeout(typeNext, 100);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [statement]);

  return (
    <div
      style={{
        padding: "16px",
        background: "rgba(0,0,0,0.4)",
        borderLeft: `3px solid ${speaker?.color || COLORS.textSecondary}`,
        marginBottom: "0",
        animation: "fadeIn 0.3s ease-in",
      }}
    >
      {/* Speaker header */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: `${speaker?.color || COLORS.textSecondary}20`,
            border: `2px solid ${speaker?.color || COLORS.textSecondary}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: FONTS.body,
            fontSize: "12px",
            fontWeight: "bold",
            color: speaker?.color || COLORS.textSecondary,
          }}
        >
          {speaker?.agentName.charAt(0) || "?"}
        </div>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: STARTUP_SIZES.headerMd,
          color: speaker?.color || COLORS.textPrimary,
          fontWeight: "bold",
        }}>
          {speaker?.agentName || "Unknown"}
        </div>
        <span
          style={{
            fontFamily: FONTS.pixel,
            fontSize: "6px",
            color: toneColor,
            padding: "2px 6px",
            border: `1px solid ${toneColor}50`,
            background: `${toneColor}15`,
            letterSpacing: "0.05em",
          }}
        >
          {statement.tone.toUpperCase()}
        </span>
      </div>

      {/* Statement text */}
      <div
        style={{
          fontFamily: FONTS.body,
          fontSize: STARTUP_SIZES.body,
          color: COLORS.textPrimary,
          lineHeight: "1.8",
          fontStyle: "italic",
        }}
      >
        "{displayText}"
        {isTyping && (
          <span style={{ opacity: 0.5, animation: "pulse 0.8s ease-in-out infinite" }}>|</span>
        )}
      </div>

      {/* Accusation badge */}
      {accusedPlayer && (
        <div style={{
          marginTop: "8px",
          display: "inline-flex",
          alignItems: "center",
          gap: "6px",
          padding: "3px 8px",
          background: `${COLORS.accentRed}15`,
          border: `1px solid ${COLORS.accentRed}40`,
        }}>
          <span style={{ fontFamily: FONTS.pixel, fontSize: "6px", color: COLORS.accentRed }}>
            ACCUSING
          </span>
          <span style={{ fontFamily: FONTS.body, fontSize: STARTUP_SIZES.bodySm, color: accusedPlayer.color, fontWeight: "bold" }}>
            {accusedPlayer.agentName}
          </span>
        </div>
      )}
    </div>
  );
}
