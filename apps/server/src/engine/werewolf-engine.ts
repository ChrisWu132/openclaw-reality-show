import type {
  WerewolfGame,
  WerewolfPlayer,
  WerewolfRound,
  WerewolfRole,
  WerewolfAgentConfig,
  DiscussionStatement,
  VoteAction,
  NightAction,
  WerewolfWSEvent,
} from "@openclaw/shared";
import {
  WEREWOLF_MAX_ROUNDS,
  WEREWOLF_PLAYER_COLORS,
  ROLE_DISTRIBUTION,
  DISCUSSION_DELAY_MS,
  VOTE_REVEAL_DELAY_MS,
  NIGHT_PHASE_DELAY_MS,
  DAWN_DISPLAY_MS,
} from "@openclaw/shared";
import { saveWerewolfGame, loadWerewolfGame } from "./werewolf-store.js";
import {
  getWerewolfDiscussion,
  getWerewolfVote,
  getWerewolfNightAction,
  generateWerewolfNarrative,
  getWerewolfNightSuggestion,
} from "../ai/llm-client.js";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("werewolf-engine");

const runningGames = new Set<string>();

export function isWerewolfGameRunning(gameId: string): boolean {
  return runningGames.has(gameId);
}

export function cancelWerewolfGame(gameId: string): void {
  runningGames.delete(gameId);
}

// ── Shuffle utility ─────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// ── Game creation ───────────────────────────────────────────────

export function createWerewolfGame(
  configs: WerewolfAgentConfig[],
  creatorId?: string,
): WerewolfGame {
  const count = configs.length;
  if (count < 5 || count > 7) {
    throw new Error("Werewolf requires 5-7 players");
  }

  const roles = shuffle(ROLE_DISTRIBUTION[count]);
  const id = crypto.randomUUID();

  const players: WerewolfPlayer[] = configs.map((c, i) => ({
    agentId: c.agentId,
    agentName: c.agentName,
    role: roles[i],
    status: "alive",
    color: WEREWOLF_PLAYER_COLORS[i % WEREWOLF_PLAYER_COLORS.length],
  }));

  const game: WerewolfGame = {
    id,
    status: "lobby",
    creatorId,
    players,
    agentConfigs: configs,
    currentRound: 0,
    maxRounds: WEREWOLF_MAX_ROUNDS,
    rounds: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  saveWerewolfGame(game);
  logger.info("Werewolf game created", { gameId: id, players: count, creatorId });
  return game;
}

// ── Seer result tracking ────────────────────────────────────────

interface SeerResult {
  targetId: string;
  targetName: string;
  role: WerewolfRole;
}

function getSeerResults(game: WerewolfGame, seerAgentId: string): SeerResult[] {
  const results: SeerResult[] = [];
  for (const round of game.rounds) {
    for (const action of round.nightActions) {
      if (action.actorId === seerAgentId && action.role === "seer") {
        const target = game.players.find((p) => p.agentId === action.targetId);
        if (target) {
          results.push({ targetId: target.agentId, targetName: target.agentName, role: target.role });
        }
      }
    }
  }
  return results;
}

function getLastDoctorProtection(game: WerewolfGame, doctorAgentId: string): string | null {
  for (let i = game.rounds.length - 1; i >= 0; i--) {
    for (const action of game.rounds[i].nightActions) {
      if (action.actorId === doctorAgentId && action.role === "doctor") {
        return action.targetId;
      }
    }
  }
  return null;
}

// ── Win condition checks ────────────────────────────────────────

function checkVillageWin(game: WerewolfGame): boolean {
  const aliveWerewolves = game.players.filter((p) => p.status === "alive" && p.role === "werewolf");
  return aliveWerewolves.length === 0;
}

function checkWerewolfWin(game: WerewolfGame): boolean {
  const aliveWerewolves = game.players.filter((p) => p.status === "alive" && p.role === "werewolf").length;
  const aliveVillagers = game.players.filter((p) => p.status === "alive" && p.role !== "werewolf").length;
  return aliveWerewolves >= aliveVillagers;
}

// ── Main game loop ──────────────────────────────────────────────

export type WerewolfEventCallback = (event: WerewolfWSEvent) => void;

export async function startWerewolfGame(
  gameId: string,
  emit: WerewolfEventCallback,
): Promise<void> {
  let game = loadWerewolfGame(gameId);
  if (!game) throw new Error(`Werewolf game not found: ${gameId}`);
  if (game.status !== "lobby") throw new Error(`Game ${gameId} is not in lobby state`);

  game.status = "running";
  saveWerewolfGame(game);
  runningGames.add(gameId);

  logger.info("Werewolf game started", { gameId });

  try {
    while (game.currentRound < WEREWOLF_MAX_ROUNDS && runningGames.has(gameId)) {
      game.currentRound++;
      const roundNumber = game.currentRound;

      const currentRound: WerewolfRound = {
        roundNumber,
        discussion: [],
        votes: [],
        nightActions: [],
      };
      game.rounds.push(currentRound);

      const alivePlayers = game.players.filter((p) => p.status === "alive");
      const aliveIds = alivePlayers.map((p) => p.agentId);

      // ── DAWN ──────────────────────────────────────────
      emit({
        type: "werewolf_round_start",
        gameId,
        round: roundNumber,
        phase: "dawn",
        alivePlayers: aliveIds,
      });

      if (roundNumber > 1) {
        // Previous round's night result is already set
        const nightResult = currentRound.nightResult;
        if (nightResult) {
          const killedPlayer = nightResult.killed
            ? game.players.find((p) => p.agentId === nightResult.killed)
            : null;
          emit({
            type: "werewolf_dawn",
            gameId,
            round: roundNumber,
            killed: nightResult.killed,
            saved: nightResult.saved,
            killedName: killedPlayer?.agentName,
            killedRole: killedPlayer?.role,
          });
        } else {
          emit({
            type: "werewolf_dawn",
            gameId,
            round: roundNumber,
            killed: null,
            saved: false,
          });
        }
        await delay(DAWN_DISPLAY_MS);

        // Check win after night kill
        if (checkVillageWin(game)) {
          game.winner = "village";
          break;
        }
        if (checkWerewolfWin(game)) {
          game.winner = "werewolves";
          break;
        }
      } else {
        // Round 1: no night happened, just announce start
        emit({
          type: "werewolf_dawn",
          gameId,
          round: roundNumber,
          killed: null,
          saved: false,
        });
        await delay(DAWN_DISPLAY_MS);
      }

      if (!runningGames.has(gameId)) break;

      // ── DAY DISCUSSION ────────────────────────────────
      const alivePlayers2 = game.players.filter((p) => p.status === "alive");

      for (let speakingRound = 1; speakingRound <= 2; speakingRound++) {
        const speakingOrder = shuffle(alivePlayers2);

        for (const player of speakingOrder) {
          if (!runningGames.has(gameId)) break;

          const config = game.agentConfigs.find((c) => c.agentId === player.agentId);
          const presetId = config?.presetId;

          // Gather role-specific info
          const seerResults = player.role === "seer" ? getSeerResults(game, player.agentId) : undefined;
          const lastProtected = player.role === "doctor" ? getLastDoctorProtection(game, player.agentId) : undefined;

          let statement: Omit<DiscussionStatement, "speakerId">;
          try {
            statement = await getWerewolfDiscussion(
              game,
              player.agentId,
              speakingRound,
              currentRound.discussion,
              presetId,
              seerResults,
              lastProtected,
            );
          } catch (err) {
            logger.error("Discussion failed, using fallback", {
              agentId: player.agentId,
              error: (err as Error).message,
            });
            statement = { text: "I have nothing to add.", tone: "calm" };
          }

          const fullStatement: DiscussionStatement = {
            speakerId: player.agentId,
            ...statement,
          };
          currentRound.discussion.push(fullStatement);

          emit({
            type: "werewolf_discussion",
            gameId,
            round: roundNumber,
            speakingRound,
            statement: fullStatement,
          });

          await delay(DISCUSSION_DELAY_MS);
        }
      }

      if (!runningGames.has(gameId)) break;

      // ── DAY VOTE ──────────────────────────────────────
      const voterOrder = shuffle(alivePlayers2);
      const tally: Record<string, number> = {};

      for (const player of voterOrder) {
        if (!runningGames.has(gameId)) break;

        const config = game.agentConfigs.find((c) => c.agentId === player.agentId);
        const presetId = config?.presetId;

        const seerResults = player.role === "seer" ? getSeerResults(game, player.agentId) : undefined;

        let vote: Omit<VoteAction, "voterId">;
        try {
          vote = await getWerewolfVote(
            game,
            player.agentId,
            currentRound.discussion,
            presetId,
            seerResults,
          );
        } catch (err) {
          logger.error("Vote failed, using random vote", {
            agentId: player.agentId,
            error: (err as Error).message,
          });
          const eligible = alivePlayers2.filter((p) => p.agentId !== player.agentId);
          const randomTarget = eligible[Math.floor(Math.random() * eligible.length)];
          vote = { targetId: randomTarget.agentId, reasoning: "[System fallback vote]" };
        }

        const fullVote: VoteAction = { voterId: player.agentId, ...vote };
        currentRound.votes.push(fullVote);
        tally[vote.targetId] = (tally[vote.targetId] || 0) + 1;

        emit({
          type: "werewolf_vote",
          gameId,
          round: roundNumber,
          vote: fullVote,
        });

        await delay(VOTE_REVEAL_DELAY_MS);
      }

      // ── EXECUTION ─────────────────────────────────────
      // Find majority
      const maxVotes = Math.max(...Object.values(tally));
      const topTargets = Object.entries(tally)
        .filter(([, count]) => count === maxVotes)
        .map(([id]) => id);

      let eliminated: string | null = null;
      let eliminatedRole: WerewolfRole | undefined;

      if (topTargets.length === 1 && maxVotes > alivePlayers2.length / 2) {
        // Majority vote — eliminate
        eliminated = topTargets[0];
        const player = game.players.find((p) => p.agentId === eliminated);
        if (player) {
          player.status = "executed";
          player.eliminatedOnRound = roundNumber;
          player.eliminationCause = "village_vote";
          eliminatedRole = player.role;
        }
        currentRound.eliminated = eliminated;
        currentRound.eliminatedRole = eliminatedRole;
      }
      // If tie or no majority, no elimination

      emit({
        type: "werewolf_vote_result",
        gameId,
        round: roundNumber,
        eliminated,
        eliminatedRole,
        tally,
      });

      await delay(DAWN_DISPLAY_MS);
      saveWerewolfGame(game);

      // Check village win after execution
      if (checkVillageWin(game)) {
        game.winner = "village";
        break;
      }
      if (checkWerewolfWin(game)) {
        game.winner = "werewolves";
        break;
      }

      if (!runningGames.has(gameId)) break;

      // ── NIGHT ─────────────────────────────────────────
      emit({
        type: "werewolf_night_start",
        gameId,
        round: roundNumber,
      });

      await delay(NIGHT_PHASE_DELAY_MS);

      const nightActions: NightAction[] = [];
      const aliveAfterVote = game.players.filter((p) => p.status === "alive");

      // Werewolves choose kill target
      const aliveWerewolves = aliveAfterVote.filter((p) => p.role === "werewolf");
      const aliveNonWerewolves = aliveAfterVote.filter((p) => p.role !== "werewolf");
      const wolfTargetIds = aliveNonWerewolves.map((p) => p.agentId);

      let werewolfTarget: string;
      if (aliveWerewolves.length === 0) {
        // No werewolves alive — shouldn't happen, but safety
        werewolfTarget = wolfTargetIds[0];
      } else if (aliveWerewolves.length === 1) {
        // Solo werewolf chooses
        const wolf = aliveWerewolves[0];
        const config = game.agentConfigs.find((c) => c.agentId === wolf.agentId);
        werewolfTarget = await getWerewolfNightAction(
          game, wolf.agentId, "werewolf", wolfTargetIds,
          config?.presetId,
        );
      } else {
        // 2 werewolves discuss then the first one picks
        let partnerSuggestion: string | undefined;

        // Wolf 1 suggests
        const wolf1 = aliveWerewolves[0];
        const wolf1Config = game.agentConfigs.find((c) => c.agentId === wolf1.agentId);
        try {
          partnerSuggestion = await getWerewolfNightSuggestion(game, wolf1.agentId, wolf1Config?.presetId);
        } catch {
          partnerSuggestion = "Let's eliminate someone.";
        }

        // Wolf 2 picks the final target (sees wolf 1's suggestion)
        const wolf2 = aliveWerewolves[1];
        const wolf2Config = game.agentConfigs.find((c) => c.agentId === wolf2.agentId);
        werewolfTarget = await getWerewolfNightAction(
          game, wolf2.agentId, "werewolf", wolfTargetIds,
          wolf2Config?.presetId, partnerSuggestion,
        );
      }

      for (const wolf of aliveWerewolves) {
        nightActions.push({ actorId: wolf.agentId, role: "werewolf", targetId: werewolfTarget });
      }

      // Seer investigates
      const aliveSeer = aliveAfterVote.find((p) => p.role === "seer");
      if (aliveSeer) {
        const seerResults = getSeerResults(game, aliveSeer.agentId);
        const seerConfig = game.agentConfigs.find((c) => c.agentId === aliveSeer.agentId);
        const investigateTargets = aliveAfterVote
          .filter((p) => p.agentId !== aliveSeer.agentId)
          .map((p) => p.agentId);

        const seerTarget = await getWerewolfNightAction(
          game, aliveSeer.agentId, "seer", investigateTargets,
          seerConfig?.presetId, undefined, seerResults,
        );
        nightActions.push({ actorId: aliveSeer.agentId, role: "seer", targetId: seerTarget });
      }

      // Doctor protects
      const aliveDoctor = aliveAfterVote.find((p) => p.role === "doctor");
      let doctorProtectedId: string | null = null;
      if (aliveDoctor) {
        const lastProtected = getLastDoctorProtection(game, aliveDoctor.agentId);
        const doctorConfig = game.agentConfigs.find((c) => c.agentId === aliveDoctor.agentId);
        const protectableTargets = aliveAfterVote
          .filter((p) => p.agentId !== lastProtected)
          .map((p) => p.agentId);

        doctorProtectedId = await getWerewolfNightAction(
          game, aliveDoctor.agentId, "doctor", protectableTargets,
          doctorConfig?.presetId, undefined, undefined, lastProtected,
        );
        nightActions.push({ actorId: aliveDoctor.agentId, role: "doctor", targetId: doctorProtectedId });
      }

      currentRound.nightActions = nightActions;

      // Resolve night
      const saved = doctorProtectedId === werewolfTarget;
      if (saved) {
        currentRound.nightResult = { killed: null, saved: true };
      } else {
        const victim = game.players.find((p) => p.agentId === werewolfTarget);
        if (victim && victim.status === "alive") {
          victim.status = "killed";
          victim.eliminatedOnRound = roundNumber;
          victim.eliminationCause = "werewolf_kill";
          currentRound.nightResult = { killed: werewolfTarget, saved: false };
        } else {
          currentRound.nightResult = { killed: null, saved: false };
        }
      }

      // The night result will be announced at the start of next round's dawn
      // But we need to put it on the NEXT round's data, not the current one.
      // Actually, we store it on the current round and display it next dawn.

      saveWerewolfGame(game);

      // Check win after night
      if (checkVillageWin(game)) {
        game.winner = "village";
        break;
      }
      if (checkWerewolfWin(game)) {
        game.winner = "werewolves";
        break;
      }
    }

    // If max rounds hit without winner, village wins by default
    if (!game.winner && game.currentRound >= WEREWOLF_MAX_ROUNDS) {
      game.winner = "village";
    }

    // Game over
    game.status = "finished";

    // Generate narrative
    try {
      game.narrative = await generateWerewolfNarrative(game);
    } catch (err) {
      logger.error("Failed to generate werewolf narrative", { error: (err as Error).message });
    }

    saveWerewolfGame(game);

    emit({
      type: "werewolf_game_over",
      gameId,
      winner: game.winner!,
      game,
    });

    if (game.narrative) {
      emit({
        type: "werewolf_narrative",
        gameId,
        narrative: game.narrative,
      });
    }

    logger.info("Werewolf game finished", { gameId, winner: game.winner });
  } finally {
    runningGames.delete(gameId);
  }
}
