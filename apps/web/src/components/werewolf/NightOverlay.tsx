import { FONTS, STARTUP_SIZES } from "../../styles/theme";

interface NightOverlayProps {
  round: number;
}

export function NightOverlay({ round }: NightOverlayProps) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at center, rgba(13,27,42,0.85) 0%, rgba(0,0,0,0.95) 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 20,
        animation: "fadeIn 0.5s ease-in",
      }}
    >
      <div style={{
        fontFamily: FONTS.pixel,
        fontSize: "16px",
        color: "#4a6fa5",
        letterSpacing: "0.2em",
        marginBottom: "16px",
        textShadow: "0 0 30px rgba(74,111,165,0.5)",
      }}>
        NIGHT {round}
      </div>
      <div style={{
        fontFamily: FONTS.body,
        fontSize: STARTUP_SIZES.body,
        color: "#6a8ab5",
        textAlign: "center",
        lineHeight: "2",
      }}>
        The village sleeps...<br />
        Werewolves hunt. The seer investigates. The doctor protects.
      </div>
      <div style={{
        marginTop: "24px",
        width: "40px",
        height: "40px",
        border: "3px solid #4a6fa530",
        borderTop: "3px solid #4a6fa5",
        borderRadius: "50%",
        animation: "spin 1s linear infinite",
      }} />
    </div>
  );
}
