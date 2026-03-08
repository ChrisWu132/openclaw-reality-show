import { useWerewolfStore } from "../../stores/werewolfStore";
import { useWerewolfSSE } from "../../hooks/useWerewolfSSE";
import { startWerewolfGameApi } from "../../services/werewolf-api";
import { PlayerList } from "./PlayerList";
import { DiscussionBubble } from "./DiscussionBubble";
import { VoteReveal } from "./VoteReveal";
import { NightOverlay } from "./NightOverlay";
import { COLORS, FONTS, STARTUP_SIZES } from "../../styles/theme";
import { useState } from "react";

const ACCENT = "#f0a500";
const BG_DARK = "#1a0a2e";
const BG_MID = "#0d1b2a";

function getClickHint(phaseLabel: string, gameStatus: string | undefined): string | null {
  if (gameStatus === "finished") return "CLICK TO SEE RESULTS";
  if (phaseLabel.includes("DISCUSSION")) return "CLICK TO CONTINUE";
  if (phaseLabel === "VOTING") return "CLICK TO CONTINUE";
  if (phaseLabel === "DAWN") return "CLICK TO CONTINUE";
  if (phaseLabel === "EXECUTION" || phaseLabel === "NO ELIMINATION") return "CLICK TO CONTINUE";
  return null;
}

export function WerewolfGameView() {
  const activeGame = useWerewolfStore((s) => s.activeGame);
  const setPhase = useWerewolfStore((s) => s.setPhase);
  const currentRound = useWerewolfStore((s) => s.currentRound);
  const currentPhaseLabel = useWerewolfStore((s) => s.currentPhaseLabel);
  const latestStatement = useWerewolfStore((s) => s.latestStatement);
  const latestDawn = useWerewolfStore((s) => s.latestDawn);
  const latestVoteResult = useWerewolfStore((s) => s.latestVoteResult);
  const isNight = useWerewolfStore((s) => s.isNight);
  const roundDiscussion = useWerewolfStore((s) => s.roundDiscussion);
  const roundVotes = useWerewolfStore((s) => s.roundVotes);
  const waitingForClick = useWerewolfStore((s) => s.waitingForClick);
  const advanceClick = useWerewolfStore((s) => s.advanceClick);
  const [hasStarted, setHasStarted] = useState(false);

  useWerewolfSSE(activeGame?.id ?? null);

  if (!activeGame) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: COLORS.textSecondary }}>
        Loading game...
      </div>
    );
  }

  // If still in lobby, show start button
  if (activeGame.status === "lobby" && !hasStarted) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          background: `linear-gradient(180deg, ${BG_DARK} 0%, ${BG_MID} 100%)`,
        }}
      >
        <div style={{
          fontFamily: FONTS.pixel,
          fontSize: "14px",
          color: ACCENT,
          marginBottom: "24px",
        }}>
          READY TO BEGIN
        </div>
        <div style={{
          fontFamily: FONTS.body,
          fontSize: STARTUP_SIZES.body,
          color: COLORS.textSecondary,
          marginBottom: "24px",
          textAlign: "center",
        }}>
          {activeGame.players.length} players assembled.<br />
          Roles will be secretly assigned.
        </div>
        <button
          onClick={async () => {
            setHasStarted(true);
            try {
              await startWerewolfGameApi(activeGame.id);
            } catch (err) {
              alert((err as Error).message);
              setHasStarted(false);
            }
          }}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.headerMd,
            color: ACCENT,
            background: "transparent",
            border: `1px solid ${ACCENT}60`,
            padding: "14px 32px",
            cursor: "pointer",
            letterSpacing: "0.15em",
          }}
        >
          START GAME
        </button>
        <button
          onClick={() => setPhase("lobby")}
          style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.bodySm,
            color: COLORS.textSecondary,
            background: "transparent",
            border: "none",
            cursor: "pointer",
            marginTop: "16px",
          }}
        >
          {"<"} BACK
        </button>
      </div>
    );
  }

  const clickHint = waitingForClick ? getClickHint(currentPhaseLabel, activeGame.status) : null;

  return (
    <div
      onClick={() => { if (waitingForClick) advanceClick(); }}
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "100%",
        background: `linear-gradient(180deg, ${BG_DARK} 0%, ${BG_MID} 50%, #000 100%)`,
        fontFamily: FONTS.body,
        overflow: "hidden",
        cursor: waitingForClick ? "pointer" : "default",
        position: "relative",
      }}
    >
      {/* Top bar */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        borderBottom: `1px solid ${COLORS.textSecondary}15`,
        background: "rgba(0,0,0,0.3)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.headerMd,
            color: ACCENT,
          }}>
            AI WEREWOLF
          </span>
          <span style={{
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.bodySm,
            color: COLORS.textSecondary,
          }}>
            ROUND {currentRound}/{activeGame.maxRounds}
          </span>
        </div>
        <span style={{
          fontFamily: FONTS.pixel,
          fontSize: STARTUP_SIZES.bodySm,
          color: currentPhaseLabel === "NIGHT" ? "#4a6fa5" : ACCENT,
          padding: "3px 8px",
          border: `1px solid ${currentPhaseLabel === "NIGHT" ? "#4a6fa540" : ACCENT + "40"}`,
        }}>
          {currentPhaseLabel || "WAITING"}
        </span>
      </div>

      {/* Main content */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left sidebar: Player list */}
        <div style={{
          width: "220px",
          minWidth: "220px",
          borderRight: `1px solid ${COLORS.textSecondary}15`,
          overflowY: "auto",
        }}>
          <button
            onClick={(e) => { e.stopPropagation(); setPhase("lobby"); }}
            style={{
              fontFamily: FONTS.pixel,
              fontSize: STARTUP_SIZES.bodySm,
              color: COLORS.textSecondary,
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: "8px 12px",
            }}
          >
            {"<"} BACK
          </button>
          <PlayerList players={activeGame.players} gameStatus={activeGame.status} />
        </div>

        {/* Center: Discussion / Vote content */}
        <div style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}>
          {/* Dawn announcement */}
          {currentPhaseLabel === "DAWN" && latestDawn && (
            <div style={{
              padding: "20px",
              textAlign: "center",
              borderBottom: `1px solid ${COLORS.textSecondary}15`,
            }}>
              {latestDawn.killed ? (
                <>
                  <div style={{
                    fontFamily: FONTS.pixel,
                    fontSize: STARTUP_SIZES.headerMd,
                    color: COLORS.accentRed,
                    marginBottom: "8px",
                  }}>
                    {latestDawn.killedName} WAS KILLED IN THE NIGHT
                  </div>
                  {latestDawn.killedRole && (
                    <div style={{
                      fontFamily: FONTS.body,
                      fontSize: STARTUP_SIZES.body,
                      color: COLORS.textSecondary,
                    }}>
                      They were a {latestDawn.killedRole.toUpperCase()}
                    </div>
                  )}
                </>
              ) : latestDawn.saved ? (
                <div style={{
                  fontFamily: FONTS.pixel,
                  fontSize: STARTUP_SIZES.headerMd,
                  color: "#2ecc71",
                }}>
                  THE DOCTOR SAVED SOMEONE! PEACEFUL NIGHT
                </div>
              ) : (
                <div style={{
                  fontFamily: FONTS.pixel,
                  fontSize: STARTUP_SIZES.headerMd,
                  color: COLORS.textSecondary,
                }}>
                  PEACEFUL NIGHT
                </div>
              )}
            </div>
          )}

          {/* Discussion area */}
          {currentPhaseLabel.includes("DISCUSSION") && (
            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              {roundDiscussion.map((stmt, idx) => (
                <div key={idx} style={{ marginBottom: "8px" }}>
                  <DiscussionBubble statement={stmt} players={activeGame.players} />
                </div>
              ))}
              {roundDiscussion.length === 0 && (
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: COLORS.textSecondary,
                  fontSize: STARTUP_SIZES.body,
                }}>
                  Waiting for discussion...
                </div>
              )}
            </div>
          )}

          {/* Voting area */}
          {(currentPhaseLabel === "VOTING" || currentPhaseLabel === "EXECUTION" || currentPhaseLabel === "NO ELIMINATION") && (
            <div style={{ flex: 1, overflow: "auto" }}>
              <VoteReveal
                votes={roundVotes}
                players={activeGame.players}
                tally={latestVoteResult?.tally}
                eliminated={latestVoteResult?.eliminated}
              />
              {latestVoteResult && (
                <div style={{
                  padding: "16px",
                  textAlign: "center",
                }}>
                  {latestVoteResult.eliminated ? (
                    <div>
                      <div style={{
                        fontFamily: FONTS.pixel,
                        fontSize: STARTUP_SIZES.headerMd,
                        color: COLORS.accentRed,
                        marginBottom: "4px",
                      }}>
                        {activeGame.players.find((p) => p.agentId === latestVoteResult.eliminated)?.agentName} HAS BEEN ELIMINATED
                      </div>
                      {latestVoteResult.eliminatedRole && (
                        <div style={{
                          fontFamily: FONTS.body,
                          fontSize: STARTUP_SIZES.body,
                          color: COLORS.textSecondary,
                        }}>
                          They were a {latestVoteResult.eliminatedRole.toUpperCase()}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{
                      fontFamily: FONTS.pixel,
                      fontSize: STARTUP_SIZES.headerMd,
                      color: COLORS.textSecondary,
                    }}>
                      NO CONSENSUS - NO ONE ELIMINATED
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Latest discussion bubble when in dawn or voting */}
          {latestStatement && currentPhaseLabel === "DAWN" && (
            <div style={{ flex: 1, overflow: "auto", padding: "16px" }}>
              <DiscussionBubble statement={latestStatement} players={activeGame.players} />
            </div>
          )}

          {/* Idle state */}
          {!currentPhaseLabel && (
            <div style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: COLORS.textSecondary,
              fontSize: STARTUP_SIZES.body,
            }}>
              Waiting for game to begin...
            </div>
          )}
        </div>
      </div>

      {/* Night overlay */}
      {isNight && <NightOverlay round={currentRound} />}

      {/* Click hint */}
      {clickHint && (
        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "50%",
            transform: "translateX(-50%)",
            fontFamily: FONTS.pixel,
            fontSize: STARTUP_SIZES.bodySm,
            color: COLORS.textPrimary,
            background: "rgba(0,0,0,0.7)",
            border: `1px solid ${COLORS.textSecondary}30`,
            padding: "10px 24px",
            letterSpacing: "0.1em",
            animation: "pulse 2s ease-in-out infinite",
            pointerEvents: "none",
            zIndex: 30,
          }}
        >
          {clickHint}
        </div>
      )}
    </div>
  );
}
