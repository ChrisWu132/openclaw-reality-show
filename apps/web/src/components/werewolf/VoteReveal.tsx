import type { VoteAction, WerewolfPlayer } from "@openclaw/shared";
import { FONTS, STARTUP_SIZES, COLORS } from "../../styles/theme";

interface VoteRevealProps {
  votes: VoteAction[];
  players: WerewolfPlayer[];
  tally?: Record<string, number>;
  eliminated?: string | null;
}

export function VoteReveal({ votes, players, tally, eliminated }: VoteRevealProps) {
  const getPlayer = (id: string) => players.find((p) => p.agentId === id);

  return (
    <div style={{ padding: "16px" }}>
      <div style={{
        fontFamily: FONTS.pixel,
        fontSize: STARTUP_SIZES.headerSm,
        color: COLORS.textSecondary,
        marginBottom: "12px",
        letterSpacing: "0.1em",
      }}>
        VOTES
      </div>

      {votes.map((vote, idx) => {
        const voter = getPlayer(vote.voterId);
        const target = getPlayer(vote.targetId);
        return (
          <div
            key={idx}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              padding: "6px 10px",
              marginBottom: "4px",
              background: "rgba(0,0,0,0.3)",
              animation: "fadeIn 0.3s ease-in",
            }}
          >
            <span style={{
              fontFamily: FONTS.body,
              fontSize: STARTUP_SIZES.body,
              color: voter?.color || COLORS.textPrimary,
              fontWeight: "bold",
              minWidth: "80px",
            }}>
              {voter?.agentName || "?"}
            </span>
            <span style={{ color: COLORS.textSecondary, fontSize: STARTUP_SIZES.bodySm }}>votes</span>
            <span style={{
              fontFamily: FONTS.body,
              fontSize: STARTUP_SIZES.body,
              color: target?.color || COLORS.accentRed,
              fontWeight: "bold",
            }}>
              {target?.agentName || "?"}
            </span>
          </div>
        );
      })}

      {/* Tally */}
      {tally && Object.keys(tally).length > 0 && (
        <div style={{ marginTop: "16px", borderTop: `1px solid ${COLORS.textSecondary}20`, paddingTop: "12px" }}>
          <div style={{
            fontFamily: FONTS.pixel,
            fontSize: "7px",
            color: COLORS.textSecondary,
            marginBottom: "8px",
          }}>
            TALLY
          </div>
          {Object.entries(tally)
            .sort(([, a], [, b]) => b - a)
            .map(([targetId, count]) => {
              const target = getPlayer(targetId);
              const isEliminated = eliminated === targetId;
              return (
                <div
                  key={targetId}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "4px 8px",
                    marginBottom: "3px",
                    background: isEliminated ? `${COLORS.accentRed}15` : "transparent",
                    border: isEliminated ? `1px solid ${COLORS.accentRed}40` : "none",
                  }}
                >
                  <span style={{
                    fontFamily: FONTS.body,
                    fontSize: STARTUP_SIZES.body,
                    color: target?.color || COLORS.textPrimary,
                    fontWeight: "bold",
                    minWidth: "80px",
                  }}>
                    {target?.agentName || "?"}
                  </span>
                  <div
                    style={{
                      height: "8px",
                      background: isEliminated ? COLORS.accentRed : target?.color || COLORS.textSecondary,
                      width: `${(count / votes.length) * 100}%`,
                      maxWidth: "120px",
                    }}
                  />
                  <span style={{
                    fontFamily: FONTS.body,
                    fontSize: STARTUP_SIZES.bodySm,
                    color: COLORS.textPrimary,
                  }}>
                    {count}
                  </span>
                  {isEliminated && (
                    <span style={{
                      fontFamily: FONTS.pixel,
                      fontSize: "6px",
                      color: COLORS.accentRed,
                    }}>
                      ELIMINATED
                    </span>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
