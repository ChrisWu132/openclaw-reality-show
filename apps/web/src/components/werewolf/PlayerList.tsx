import type { WerewolfPlayer } from "@openclaw/shared";
import { FONTS, STARTUP_SIZES, COLORS } from "../../styles/theme";

interface PlayerListProps {
  players: WerewolfPlayer[];
  gameStatus: string;
}

export function PlayerList({ players, gameStatus }: PlayerListProps) {
  return (
    <div style={{ padding: "12px" }}>
      <div style={{
        fontFamily: FONTS.pixel,
        fontSize: STARTUP_SIZES.headerSm,
        color: COLORS.textSecondary,
        marginBottom: "12px",
        letterSpacing: "0.1em",
      }}>
        VILLAGERS ({players.filter((p) => p.status === "alive").length}/{players.length})
      </div>
      {players.map((player) => {
        const isAlive = player.status === "alive";
        const showRole = !isAlive || gameStatus === "finished";
        return (
          <div
            key={player.agentId}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 10px",
              marginBottom: "6px",
              background: isAlive ? "rgba(0,0,0,0.3)" : "rgba(0,0,0,0.15)",
              border: `1px solid ${isAlive ? player.color + "40" : COLORS.textSecondary + "15"}`,
              opacity: isAlive ? 1 : 0.5,
            }}
          >
            <div
              style={{
                width: "24px",
                height: "24px",
                borderRadius: "50%",
                background: isAlive ? `${player.color}20` : "transparent",
                border: `2px solid ${isAlive ? player.color : COLORS.textSecondary + "40"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FONTS.body,
                fontSize: "10px",
                fontWeight: "bold",
                color: isAlive ? player.color : COLORS.textSecondary,
              }}
            >
              {player.agentName.charAt(0)}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{
                fontFamily: FONTS.body,
                fontSize: STARTUP_SIZES.body,
                color: isAlive ? player.color : COLORS.textSecondary,
                fontWeight: "bold",
                textDecoration: isAlive ? "none" : "line-through",
              }}>
                {player.agentName}
              </div>
              {showRole && (
                <div style={{
                  fontFamily: FONTS.pixel,
                  fontSize: "6px",
                  color: player.role === "werewolf" ? "#e74c3c" : COLORS.textSecondary,
                  letterSpacing: "0.05em",
                }}>
                  {player.role.toUpperCase()}
                </div>
              )}
              {!isAlive && (
                <div style={{
                  fontFamily: FONTS.body,
                  fontSize: "7px",
                  color: COLORS.textSecondary,
                }}>
                  {player.eliminationCause === "werewolf_kill" ? "Killed night" : "Voted out"} R{player.eliminatedOnRound}
                </div>
              )}
            </div>
            {isAlive && (
              <div style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#2ecc71",
                boxShadow: "0 0 6px #2ecc7180",
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
