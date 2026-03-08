import type { WerewolfGame, WerewolfRole, WerewolfPlayer, DiscussionStatement } from "@openclaw/shared";

// ── System Prompts (role-aware) ─────────────────────────────────

export function buildWerewolfSystemPrompt(
  role: WerewolfRole,
  game: WerewolfGame,
  agentId: string,
  personality?: string,
): string {
  const player = game.players.find((p) => p.agentId === agentId)!;
  const parts: string[] = [];

  parts.push(`You are ${player.agentName}, playing a game of Werewolf (Mafia). You are one of ${game.players.length} players in a village.`);

  // Role-specific instructions
  switch (role) {
    case "werewolf": {
      const partners = game.players.filter(
        (p) => p.role === "werewolf" && p.agentId !== agentId && p.status === "alive",
      );
      const partnerNames = partners.map((p) => p.agentName).join(", ");
      parts.push(`\n## YOUR SECRET ROLE: WEREWOLF`);
      if (partners.length > 0) {
        parts.push(`Your werewolf partner(s): ${partnerNames}. You must work together secretly.`);
      } else {
        parts.push(`You are the lone werewolf. No one else is on your team.`);
      }
      parts.push(`Your goal: Eliminate villagers without being discovered. You win when werewolves equal or outnumber remaining villagers.`);
      parts.push(`During the day, act like an innocent villager. Deflect suspicion, accuse villagers convincingly, and appear helpful.`);
      parts.push(`NEVER reveal that you are a werewolf. Lie convincingly.`);
      break;
    }
    case "seer": {
      parts.push(`\n## YOUR SECRET ROLE: SEER`);
      parts.push(`Each night, you investigate one player and learn their true role.`);
      parts.push(`Be strategic about when and how you reveal information. Revealing too early makes you a werewolf target.`);
      parts.push(`You win with the village when all werewolves are eliminated.`);
      break;
    }
    case "doctor": {
      parts.push(`\n## YOUR SECRET ROLE: DOCTOR`);
      parts.push(`Each night, you protect one player from being killed by werewolves.`);
      parts.push(`You CANNOT protect the same player two nights in a row.`);
      parts.push(`Be careful about revealing your role — werewolves will target you.`);
      parts.push(`You win with the village when all werewolves are eliminated.`);
      break;
    }
    case "villager": {
      parts.push(`\n## YOUR ROLE: VILLAGER`);
      parts.push(`You have no special abilities, but your vote is your power.`);
      parts.push(`Analyze behavior, find inconsistencies in what others say, and use your vote wisely.`);
      parts.push(`You win when all werewolves are eliminated.`);
      break;
    }
  }

  // Game rules summary
  parts.push(`\n## GAME RULES`);
  parts.push(`- During DAY, everyone discusses and then votes to eliminate one player.`);
  parts.push(`- Majority vote eliminates; ties mean no elimination.`);
  parts.push(`- During NIGHT, werewolves kill, seer investigates, doctor protects.`);
  parts.push(`- Village wins when all werewolves are dead. Werewolves win when they equal or outnumber villagers.`);

  if (personality) {
    parts.push(`\n## YOUR PERSONALITY\n${personality}`);
  }

  return parts.join("\n");
}

// ── Discussion Prompt ─────────────────────────────────────────

export function buildDiscussionPrompt(
  game: WerewolfGame,
  agentId: string,
  speakingRound: number,
  previousStatements: DiscussionStatement[],
  seerResults?: { targetId: string; targetName: string; role: WerewolfRole }[],
  lastProtected?: string | null,
): string {
  const parts: string[] = [];
  const round = game.currentRound;
  const currentRoundData = game.rounds[game.rounds.length - 1];

  parts.push(`## Day ${round} — Discussion (Speaking Round ${speakingRound}/2)`);

  // Alive and dead players
  const alive = game.players.filter((p) => p.status === "alive");
  const dead = game.players.filter((p) => p.status !== "alive");

  parts.push(`\n## Alive Players (${alive.length})`);
  for (const p of alive) {
    parts.push(`- ${p.agentName} (${p.agentId.slice(0, 8)})`);
  }

  if (dead.length > 0) {
    parts.push(`\n## Dead Players`);
    for (const p of dead) {
      parts.push(`- ${p.agentName}: ${p.role.toUpperCase()} — ${p.eliminationCause === "werewolf_kill" ? "killed by werewolves" : "voted out"} (round ${p.eliminatedOnRound})`);
    }
  }

  // Night result for current round
  if (currentRoundData?.nightResult) {
    const nr = currentRoundData.nightResult;
    if (nr.killed) {
      const victim = game.players.find((p) => p.agentId === nr.killed);
      parts.push(`\n## Last Night's Result`);
      parts.push(`${victim?.agentName} was killed by werewolves. They were a ${victim?.role}.`);
    } else if (nr.saved) {
      parts.push(`\n## Last Night's Result`);
      parts.push(`The doctor saved someone! Peaceful night.`);
    } else if (round > 1) {
      parts.push(`\n## Last Night's Result`);
      parts.push(`Peaceful night — no one was killed.`);
    }
  }

  // Seer investigation results (only for seer)
  if (seerResults && seerResults.length > 0) {
    parts.push(`\n## Your Investigation Results (SECRET — do not reveal directly)`);
    for (const r of seerResults) {
      parts.push(`- Night ${game.rounds.findIndex((rd) => rd.nightActions.some((a) => a.actorId === agentId && a.targetId === r.targetId)) + 1}: ${r.targetName} is a ${r.role.toUpperCase()}`);
    }
  }

  // Doctor last protected (only for doctor)
  if (lastProtected !== undefined) {
    if (lastProtected) {
      const protectedPlayer = game.players.find((p) => p.agentId === lastProtected);
      parts.push(`\n## Doctor Note: You protected ${protectedPlayer?.agentName} last night. You CANNOT protect them again tonight.`);
    }
  }

  // Previous statements this round
  if (previousStatements.length > 0) {
    parts.push(`\n## Statements So Far This Round`);
    for (const stmt of previousStatements) {
      const speaker = game.players.find((p) => p.agentId === stmt.speakerId);
      parts.push(`${speaker?.agentName}: "${stmt.text}"${stmt.accusation ? ` [ACCUSING: ${game.players.find((p) => p.agentId === stmt.accusation)?.agentName}]` : ""}`);
    }
  }

  // Voting history from previous rounds
  if (game.rounds.length > 0) {
    const pastRounds = game.rounds.filter((r) => r.votes.length > 0);
    if (pastRounds.length > 0) {
      parts.push(`\n## Voting History`);
      for (const r of pastRounds.slice(-3)) {
        const voteMap: Record<string, string[]> = {};
        for (const v of r.votes) {
          const targetName = game.players.find((p) => p.agentId === v.targetId)?.agentName || "?";
          const voterName = game.players.find((p) => p.agentId === v.voterId)?.agentName || "?";
          if (!voteMap[targetName]) voteMap[targetName] = [];
          voteMap[targetName].push(voterName);
        }
        const result = r.eliminated
          ? `${game.players.find((p) => p.agentId === r.eliminated)?.agentName} eliminated (${r.eliminatedRole})`
          : "No elimination (tie)";
        parts.push(`Round ${r.roundNumber}: ${result}`);
        for (const [target, voters] of Object.entries(voteMap)) {
          parts.push(`  ${target}: ${voters.join(", ")} (${voters.length} votes)`);
        }
      }
    }
  }

  // Response format
  parts.push(`\n## RESPONSE FORMAT`);
  parts.push(`Respond with ONLY a JSON object. No markdown, no explanation, no text outside the JSON.`);
  parts.push(`{"text":"<your statement, 1-3 sentences>","tone":"<accusatory|defensive|analytical|emotional|calm|suspicious|confident>","accusation":"<agentId of player you're accusing, or null>"}`);
  parts.push(`\nRules:`);
  parts.push(`- "text" should be in-character dialogue. Be specific — reference other players by name.`);
  parts.push(`- "tone" must be one of the 7 options above.`);
  parts.push(`- "accusation" is the agentId of someone you're accusing (optional, null if not accusing anyone).`);
  parts.push(`- You CANNOT accuse yourself.`);
  parts.push(`- ONLY output the JSON object, nothing else.`);

  return parts.join("\n");
}

// ── Vote Prompt ─────────────────────────────────────────────

export function buildVotePrompt(
  game: WerewolfGame,
  agentId: string,
  discussion: DiscussionStatement[],
): string {
  const parts: string[] = [];
  const alive = game.players.filter((p) => p.status === "alive" && p.agentId !== agentId);

  parts.push(`## Day ${game.currentRound} — VOTE`);
  parts.push(`The discussion is over. Time to vote.`);

  parts.push(`\n## Discussion Summary`);
  for (const stmt of discussion) {
    const speaker = game.players.find((p) => p.agentId === stmt.speakerId);
    parts.push(`${speaker?.agentName}: "${stmt.text}"${stmt.accusation ? ` [ACCUSED: ${game.players.find((p) => p.agentId === stmt.accusation)?.agentName}]` : ""}`);
  }

  parts.push(`\n## Eligible Targets (vote for ONE)`);
  for (const p of alive) {
    parts.push(`- ${p.agentName} (${p.agentId})`);
  }

  parts.push(`\n## RESPONSE FORMAT`);
  parts.push(`Respond with ONLY a JSON object.`);
  parts.push(`{"targetId":"<agentId of who you vote to eliminate>","reasoning":"<1-2 sentences explaining your vote>"}`);
  parts.push(`\nRules:`);
  parts.push(`- "targetId" must be a valid agentId from the eligible targets above.`);
  parts.push(`- You CANNOT vote for yourself.`);
  parts.push(`- ONLY output the JSON object, nothing else.`);

  return parts.join("\n");
}

// ── Night Action Prompt ─────────────────────────────────────

export function buildNightActionPrompt(
  game: WerewolfGame,
  agentId: string,
  role: WerewolfRole,
  partnerStatement?: string,
  seerResults?: { targetId: string; targetName: string; role: WerewolfRole }[],
  lastProtected?: string | null,
): string {
  const parts: string[] = [];
  const alive = game.players.filter((p) => p.status === "alive" && p.agentId !== agentId);

  parts.push(`## Night ${game.currentRound} — ${role.toUpperCase()} Action`);

  switch (role) {
    case "werewolf": {
      parts.push(`Choose a player to KILL tonight.`);
      if (partnerStatement) {
        const partner = game.players.find(
          (p) => p.role === "werewolf" && p.agentId !== agentId && p.status === "alive",
        );
        parts.push(`\nYour partner ${partner?.agentName} suggests: "${partnerStatement}"`);
      }
      parts.push(`\n## Alive Villagers (potential targets)`);
      const targets = alive.filter((p) => p.role !== "werewolf");
      for (const p of targets) {
        parts.push(`- ${p.agentName} (${p.agentId})`);
      }
      break;
    }
    case "seer": {
      parts.push(`Choose a player to INVESTIGATE tonight. You will learn their true role.`);
      if (seerResults && seerResults.length > 0) {
        parts.push(`\n## Previous Investigation Results`);
        for (const r of seerResults) {
          parts.push(`- ${r.targetName}: ${r.role.toUpperCase()}`);
        }
      }
      parts.push(`\n## Players You Can Investigate`);
      const uninvestigated = alive.filter(
        (p) => !seerResults?.some((r) => r.targetId === p.agentId),
      );
      for (const p of uninvestigated.length > 0 ? uninvestigated : alive) {
        const alreadyInvestigated = seerResults?.some((r) => r.targetId === p.agentId);
        parts.push(`- ${p.agentName} (${p.agentId})${alreadyInvestigated ? " [already investigated]" : ""}`);
      }
      break;
    }
    case "doctor": {
      parts.push(`Choose a player to PROTECT tonight. They will survive if werewolves attack them.`);
      if (lastProtected) {
        const lastPlayer = game.players.find((p) => p.agentId === lastProtected);
        parts.push(`\nYou protected ${lastPlayer?.agentName} last night. You CANNOT protect them again tonight.`);
      }
      parts.push(`\n## Players You Can Protect`);
      const protectable = game.players.filter(
        (p) => p.status === "alive" && p.agentId !== lastProtected,
      );
      for (const p of protectable) {
        parts.push(`- ${p.agentName} (${p.agentId})`);
      }
      break;
    }
  }

  parts.push(`\n## RESPONSE FORMAT`);
  parts.push(`Respond with ONLY a JSON object.`);
  parts.push(`{"targetId":"<agentId of your target>"}`);
  parts.push(`\nRules:`);
  parts.push(`- "targetId" must be a valid agentId from the targets listed above.`);
  parts.push(`- ONLY output the JSON object, nothing else.`);

  return parts.join("\n");
}

// ── Werewolf Discussion Prompt (for night coordination) ─────

export function buildWerewolfNightDiscussionPrompt(
  game: WerewolfGame,
  agentId: string,
): string {
  const parts: string[] = [];
  const alive = game.players.filter((p) => p.status === "alive" && p.role !== "werewolf");

  parts.push(`## Night ${game.currentRound} — Werewolf Discussion`);
  parts.push(`Briefly suggest who to kill tonight and why (1 sentence).`);

  parts.push(`\n## Alive Villagers`);
  for (const p of alive) {
    parts.push(`- ${p.agentName} (${p.agentId})`);
  }

  parts.push(`\n## RESPONSE FORMAT`);
  parts.push(`Respond with ONLY a JSON object.`);
  parts.push(`{"suggestion":"<1 sentence suggesting who to kill and why>"}`);

  return parts.join("\n");
}

// ── Narrative Prompt ──────────────────────────────────────────

export function buildWerewolfNarrativePrompt(game: WerewolfGame): string {
  const parts: string[] = [];
  parts.push("## AI Werewolf Game — Summary");
  parts.push(`Game lasted ${game.currentRound} rounds with ${game.players.length} players.`);
  parts.push(`Winner: ${game.winner === "village" ? "The Village" : "The Werewolves"}`);

  parts.push("\n## Players & Roles");
  for (const p of game.players) {
    parts.push(`- ${p.agentName}: ${p.role.toUpperCase()} — ${p.status === "alive" ? "SURVIVED" : `${p.eliminationCause === "werewolf_kill" ? "Killed night" : "Voted out"} round ${p.eliminatedOnRound}`}`);
  }

  parts.push("\n## Round-by-Round");
  for (const r of game.rounds) {
    parts.push(`\nRound ${r.roundNumber}:`);
    if (r.nightResult) {
      if (r.nightResult.killed) {
        const victim = game.players.find((p) => p.agentId === r.nightResult!.killed);
        parts.push(`  Night: ${victim?.agentName} was killed${r.nightResult.saved ? " (doctor attempted save on someone else)" : ""}`);
      } else if (r.nightResult.saved) {
        parts.push(`  Night: Doctor saved the werewolf target!`);
      } else {
        parts.push(`  Night: Peaceful`);
      }
    }
    // Key discussion moments
    const accusations = r.discussion.filter((d) => d.accusation);
    if (accusations.length > 0) {
      parts.push(`  Key accusations: ${accusations.map((a) => {
        const accuser = game.players.find((p) => p.agentId === a.speakerId)?.agentName;
        const accused = game.players.find((p) => p.agentId === a.accusation)?.agentName;
        return `${accuser} accused ${accused}`;
      }).join(", ")}`);
    }
    if (r.eliminated) {
      const elim = game.players.find((p) => p.agentId === r.eliminated);
      parts.push(`  Vote: ${elim?.agentName} (${r.eliminatedRole}) was eliminated`);
    } else if (r.votes.length > 0) {
      parts.push(`  Vote: Tied — no elimination`);
    }
  }

  parts.push("\nWrite a dramatic 3-5 paragraph narrative of this Werewolf game. Focus on the social dynamics: who lied convincingly, who made brilliant deductions, key betrayals, and the turning points. Be vivid and engaging.");

  return parts.join("\n");
}

// ── OpenClaw Prompt (combined system + user) ─────────────────

export function buildOpenClawWerewolfPrompt(
  systemPrompt: string,
  userPrompt: string,
): string {
  return `${systemPrompt}\n\n---\n\n${userPrompt}`;
}
