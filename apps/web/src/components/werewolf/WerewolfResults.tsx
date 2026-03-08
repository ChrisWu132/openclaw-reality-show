import { useWerewolfStore } from "../../stores/werewolfStore";
import { useGameStore } from "../../stores/gameStore";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";

const ACCENT = "#f0a500";

const ROLE_COLORS: Record<string, string> = {
  werewolf: "#e74c3c",
  seer: "#9b59b6",
  doctor: "#2ecc71",
  villager: "#3498db",
};

export function WerewolfResults() {
  const activeGame = useWerewolfStore((s) => s.activeGame);
  const narrative = useWerewolfStore((s) => s.narrative);
  const werewolfReset = useWerewolfStore((s) => s.reset);
  const setMainPhase = useGameStore((s) => s.setPhase);

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        No game data
      </div>
    );
  }

  const gameNarrative = narrative || activeGame.narrative;
  const isVillageWin = activeGame.winner === "village";

  // Group players by role
  const werewolves = activeGame.players.filter((p) => p.role === "werewolf");
  const villageTeam = activeGame.players.filter((p) => p.role !== "werewolf");

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        height: "100%",
        width: "100%",
        background: "linear-gradient(180deg, #1a0a2e 0%, #0d1b2a 50%, #000 100%)",
        fontFamily: FONTS.body,
        overflow: "auto",
        padding: "40px",
      }}
    >
      <div style={{
        fontSize: STARTUP_SIZES.headerMd,
        color: COLORS.textSecondary,
        letterSpacing: "0.2em",
        marginBottom: "16px",
        fontFamily: FONTS.pixel,
      }}>
        GAME OVER - ROUND {activeGame.currentRound}
      </div>

      <div
        style={{
          fontSize: "22px",
          color: isVillageWin ? "#2ecc71" : "#e74c3c",
          letterSpacing: "0.1em",
          textShadow: `0 0 40px ${isVillageWin ? "#2ecc7160" : "#e74c3c60"}`,
          marginBottom: "8px",
          fontFamily: FONTS.pixel,
          animation: "fadeIn 1s ease-in",
        }}
      >
        {isVillageWin ? "THE VILLAGE WINS" : "THE WEREWOLVES WIN"}
      </div>

      <div style={{
        fontSize: STARTUP_SIZES.body,
        color: COLORS.textSecondary,
        marginBottom: "40px",
        fontFamily: FONTS.pixel,
      }}>
        {isVillageWin ? "All werewolves have been eliminated!" : "The werewolves have overtaken the village!"}
      </div>

      {/* AI Narrative */}
      {gameNarrative && (
        <div style={{
          width: "100%",
          maxWidth: "700px",
          marginBottom: "40px",
          padding: "24px",
          background: "rgba(0,0,0,0.4)",
          border: `1px solid ${COLORS.textSecondary}20`,
          borderLeft: `3px solid ${ACCENT}`,
        }}>
          <div style={{
            fontSize: STARTUP_SIZES.headerSm,
            color: COLORS.textSecondary,
            marginBottom: "12px",
            fontFamily: FONTS.pixel,
            letterSpacing: "0.1em",
          }}>
            THE TALE
          </div>
          <div style={{
            fontSize: STARTUP_SIZES.body,
            color: COLORS.textPrimary,
            lineHeight: "2",
            whiteSpace: "pre-wrap",
          }}>
            {gameNarrative}
          </div>
        </div>
      )}

      {/* Role Reveal */}
      <div style={{ width: "100%", maxWidth: "700px", marginBottom: "30px" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "12px", fontFamily: FONTS.pixel }}>
          ROLE REVEAL
        </div>

        {/* Werewolves */}
        <div style={{ marginBottom: "16px" }}>
          <div style={{ fontSize: STARTUP_SIZES.bodySm, color: "#e74c3c", marginBottom: "8px", fontFamily: FONTS.pixel }}>
            WEREWOLVES
          </div>
          {werewolves.map((p) => (
            <PlayerRevealCard key={p.agentId} player={p} />
          ))}
        </div>

        {/* Village Team */}
        <div>
          <div style={{ fontSize: STARTUP_SIZES.bodySm, color: "#3498db", marginBottom: "8px", fontFamily: FONTS.pixel }}>
            VILLAGE TEAM
          </div>
          {villageTeam.map((p) => (
            <PlayerRevealCard key={p.agentId} player={p} />
          ))}
        </div>
      </div>

      {/* Round Summary */}
      <div style={{ width: "100%", maxWidth: "700px", marginBottom: "30px" }}>
        <div style={{ fontSize: STARTUP_SIZES.headerSm, color: COLORS.textSecondary, marginBottom: "12px", fontFamily: FONTS.pixel }}>
          ROUND SUMMARY
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: STARTUP_SIZES.body }}>
          <thead>
            <tr style={{ color: COLORS.textSecondary, borderBottom: `1px solid ${COLORS.textSecondary}20` }}>
              <th style={{ textAlign: "left", padding: "6px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>ROUND</th>
              <th style={{ textAlign: "left", padding: "6px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>NIGHT KILL</th>
              <th style={{ textAlign: "left", padding: "6px", fontFamily: FONTS.pixel, fontSize: STARTUP_SIZES.bodySm }}>VOTED OUT</th>
            </tr>
          </thead>
          <tbody>
            {activeGame.rounds.map((r) => {
              const nightKill = r.nightResult?.killed
                ? activeGame.players.find((p) => p.agentId === r.nightResult!.killed)
                : null;
              const votedOut = r.eliminated
                ? activeGame.players.find((p) => p.agentId === r.eliminated)
                : null;
              return (
                <tr key={r.roundNumber} style={{ borderBottom: `1px solid ${COLORS.textSecondary}10` }}>
                  <td style={{ padding: "6px", color: COLORS.textSecondary }}>{r.roundNumber}</td>
                  <td style={{ padding: "6px" }}>
                    {nightKill ? (
                      <span style={{ color: nightKill.color }}>
                        {nightKill.agentName} ({nightKill.role})
                      </span>
                    ) : r.nightResult?.saved ? (
                      <span style={{ color: "#2ecc71" }}>Saved!</span>
                    ) : (
                      <span style={{ color: COLORS.textSecondary }}>-</span>
                    )}
                  </td>
                  <td style={{ padding: "6px" }}>
                    {votedOut ? (
                      <span style={{ color: votedOut.color }}>
                        {votedOut.agentName} ({r.eliminatedRole})
                      </span>
                    ) : (
                      <span style={{ color: COLORS.textSecondary }}>No elimination</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "16px" }}>
        <button
          onClick={() => werewolfReset()}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.body,
            color: ACCENT,
            background: "transparent",
            border: `1px solid ${ACCENT}40`,
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          NEW GAME
        </button>
        <button
          onClick={() => {
            werewolfReset();
            setMainPhase("mode-select");
          }}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.body,
            color: COLORS.textSecondary,
            background: "transparent",
            border: `1px solid ${COLORS.textSecondary}40`,
            padding: "12px 24px",
            cursor: "pointer",
          }}
        >
          MODE SELECT
        </button>
      </div>
    </div>
  );
}

function PlayerRevealCard({ player }: { player: { agentId: string; agentName: string; role: string; status: string; color: string; eliminatedOnRound?: number; eliminationCause?: string } }) {
  const roleColor = ROLE_COLORS[player.role] || COLORS.textSecondary;
  const survived = player.status === "alive";

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: "12px",
      padding: "8px 12px",
      marginBottom: "4px",
      background: "rgba(0,0,0,0.3)",
      border: `1px solid ${player.color}20`,
    }}>
      <div style={{
        width: "24px",
        height: "24px",
        borderRadius: "50%",
        background: `${player.color}20`,
        border: `2px solid ${player.color}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: FONTS.body,
        fontSize: "10px",
        fontWeight: "bold",
        color: player.color,
      }}>
        {player.agentName.charAt(0)}
      </div>
      <div style={{ flex: 1 }}>
        <span style={{
          fontFamily: FONTS.body,
          fontSize: STARTUP_SIZES.body,
          color: player.color,
          fontWeight: "bold",
        }}>
          {player.agentName}
        </span>
      </div>
      <span style={{
        fontFamily: FONTS.pixel,
        fontSize: "7px",
        color: roleColor,
        padding: "2px 6px",
        border: `1px solid ${roleColor}40`,
        background: `${roleColor}15`,
      }}>
        {player.role.toUpperCase()}
      </span>
      <span style={{
        fontFamily: FONTS.body,
        fontSize: STARTUP_SIZES.bodySm,
        color: survived ? "#2ecc71" : COLORS.textSecondary,
      }}>
        {survived
          ? "SURVIVED"
          : `${player.eliminationCause === "werewolf_kill" ? "Killed" : "Voted out"} R${player.eliminatedOnRound}`}
      </span>
    </div>
  );
}
