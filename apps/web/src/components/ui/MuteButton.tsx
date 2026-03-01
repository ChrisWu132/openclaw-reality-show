import React, { useState } from "react";

interface MuteButtonProps {
  isMuted: boolean;
  onToggle: () => void;
}

export function MuteButton({ isMuted, onToggle }: MuteButtonProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      onClick={onToggle}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      title={isMuted ? "Unmute music" : "Mute music"}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 200,
        background: "transparent",
        border: `1px solid ${hovered ? "rgba(74, 144, 217, 0.5)" : "rgba(74, 144, 217, 0.2)"}`,
        color: isMuted ? "#383850" : hovered ? "#4A90D9" : "#506070",
        fontFamily: "'Press Start 2P', monospace",
        fontSize: "7px",
        letterSpacing: "0.1em",
        padding: "7px 10px",
        cursor: "pointer",
        transition: "border-color 0.2s, color 0.2s",
        lineHeight: 1,
        userSelect: "none",
      }}
    >
      {isMuted ? "♪ OFF" : "♪ ON"}
    </button>
  );
}
