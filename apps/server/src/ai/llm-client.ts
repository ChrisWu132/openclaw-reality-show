import type { TrolleyDecision, Session, Dilemma, StartupAction, StartupGame, MarketEvent, PresetId, DialogueStatement, WerewolfGame, WerewolfRole, DiscussionStatement, VoteAction } from "@openclaw/shared";
import type { LLMProvider } from "./llm-provider.js";
import { createLLMProvider } from "./llm-provider.js";
import { buildSystemPrompt, buildDilemmaMessage, buildProfileNarrativeMessage } from "./prompt-builder.js";
import { buildStartupSystemPrompt, buildStartupTurnMessage, buildDialogueSystemPrompt, buildDialogueUserMessage } from "./startup-prompt-builder.js";
import { parseTrolleyDecision } from "./response-parser.js";
import { parseStartupAction, parseDialogueResponse } from "./startup-response-parser.js";
import { getPresetPersonality, getCachedPersonality } from "../loaders/personality-loader.js";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("llm-client");

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

let provider: LLMProvider | null = null;

export async function initLLMClient(): Promise<void> {
  provider = await createLLMProvider();
  logger.info(`LLM provider initialized: ${provider.name}`);
}

function getProvider(): LLMProvider {
  if (!provider) throw new Error("LLM provider not initialized. Call initLLMClient() first.");
  return provider;
}

export function initSystemPrompt(presetId?: PresetId): string {
  const personalityName = presetId ? `preset:${presetId}` : undefined;
  const prompt = buildSystemPrompt(personalityName);
  logger.info("System prompt initialized", { promptLength: prompt.length, presetId });
  return prompt;
}

export async function getTrolleyDecision(session: Session, dilemma: Dilemma): Promise<TrolleyDecision> {
  const llm = getProvider();
  const systemPrompt = session.systemPrompt;
  let userMessage = buildDilemmaMessage(session, dilemma);

  logger.info("Requesting trolley decision", { sessionId: session.id, round: dilemma.round });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawText = await llm.getCompletion(systemPrompt, userMessage);
      const result = parseTrolleyDecision(rawText, dilemma);

      if (!result.success) {
        logger.warn(`Parse failed attempt ${attempt}`, { error: result.error });
        if (attempt < MAX_RETRIES) {
          userMessage += `\n\n---\n\n## CORRECTION REQUIRED\n\nYour previous response could not be parsed. Error: ${result.error}\n\nPlease respond with ONLY a valid JSON object.`;
          continue;
        }
        // Fallback to first choice
        const fallback: TrolleyDecision = {
          choiceId: dilemma.choices[0].id,
          speaker: "coordinator",
          reasoning: "The weight of this decision overwhelms all moral calculation. In the absence of certainty, the only path is the one already set in motion.",
          confidence: 0,
        };
        return fallback;
      }

      return result.decision!;
    } catch (err) {
      const msg = (err as Error).message;
      logger.error(`API error attempt ${attempt}`, { error: msg });
      if (attempt < MAX_RETRIES) {
        await delay(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
      // Fallback
      return {
        choiceId: dilemma.choices[0].id,
        speaker: "coordinator",
        reasoning: "A silence stretches across the threshold of choice. When the mind fails to speak, the body acts on instinct alone.",
        confidence: 0,
      };
    }
  }

  throw new Error("Unreachable: retry loop exited without returning");
}

export async function getStartupAction(game: StartupGame, agentId: string, turn: number, marketEvent: MarketEvent, presetId?: string): Promise<StartupAction> {
  const llm = getProvider();

  let personality: string | undefined;
  // Try startup-specific preset first, then generic preset, then openclaw cache
  if (presetId) {
    try {
      personality = getPresetPersonality(presetId as any);
    } catch {
      try {
        personality = getCachedPersonality(`preset:startup:${presetId}`);
      } catch {
        // Fall through
      }
    }
  }
  if (!personality) {
    try {
      personality = getCachedPersonality(`openclaw:${agentId}`);
    } catch {
      // No personality cached
    }
  }

  const systemPrompt = buildStartupSystemPrompt(personality);
  let userMessage = buildStartupTurnMessage(game, agentId, turn, marketEvent);

  logger.info("Requesting startup action", { gameId: game.id, agentId, turn, presetId });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawText = await llm.getCompletion(systemPrompt, userMessage);
      const result = parseStartupAction(rawText);

      if (!result.success) {
        logger.warn(`Startup parse failed attempt ${attempt}`, { error: result.error });
        if (attempt < MAX_RETRIES) {
          userMessage += `\n\n---\n\n## CORRECTION REQUIRED\n\nYour previous response could not be parsed. Error: ${result.error}\n\nPlease respond with ONLY a valid JSON object.`;
          continue;
        }
        return { type: "TRAIN", targetAgentId: null, reasoning: `[System fallback: ${result.error}]` };
      }

      return result.action!;
    } catch (err) {
      const msg = (err as Error).message;
      logger.error(`Startup API error attempt ${attempt}`, { error: msg });
      if (attempt < MAX_RETRIES) {
        await delay(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
      return { type: "TRAIN", targetAgentId: null, reasoning: `[System fallback: API failure] ${msg}` };
    }
  }

  return { type: "TRAIN", targetAgentId: null, reasoning: "Unexpected: retry loop exited" };
}

export async function generateStartupNarrative(game: StartupGame): Promise<string> {
  const llm = getProvider();
  const { buildNarrativePrompt } = await import("./startup-prompt-builder.js");
  const systemPrompt = "You are a dramatic business journalist narrating the rise and fall of AI startups. Write vivid, engaging prose. 3-5 paragraphs.";
  const userMessage = buildNarrativePrompt(game);

  logger.info("Generating startup narrative", { gameId: game.id });

  try {
    const rawText = await llm.getCompletion(systemPrompt, userMessage);
    return rawText.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  } catch (err) {
    logger.error("Failed to generate startup narrative", { error: (err as Error).message });
    return "The arena has concluded, but the full story remains untold.";
  }
}

export async function getDialogueStatement(
  game: StartupGame,
  agentId: string,
  turn: number,
  previousStatements: DialogueStatement[],
  presetId?: string
): Promise<{ statement: DialogueStatement; proposedAlliance: string | null }> {
  const llm = getProvider();

  let personality: string | undefined;
  if (presetId) {
    try { personality = getPresetPersonality(presetId as any); } catch { /* */ }
    if (!personality) {
      try { personality = getCachedPersonality(`preset:startup:${presetId}`); } catch { /* */ }
    }
  }
  if (!personality) {
    try { personality = getCachedPersonality(`openclaw:${agentId}`); } catch { /* */ }
  }

  const systemPrompt = buildDialogueSystemPrompt(game, agentId, personality);
  let userMessage = buildDialogueUserMessage(previousStatements, game);

  logger.info("Requesting dialogue statement", { gameId: game.id, agentId, turn });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawText = await llm.getCompletion(systemPrompt, userMessage);
      const result = parseDialogueResponse(rawText);

      if (!result.success) {
        logger.warn(`Dialogue parse failed attempt ${attempt}`, { error: result.error });
        if (attempt < MAX_RETRIES) {
          userMessage += `\n\n---\n\nCORRECTION: ${result.error}. Respond with ONLY a JSON object.`;
          continue;
        }
        return {
          statement: { speakerId: agentId, targetAgentId: null, text: "No comment.", tone: "confident" },
          proposedAlliance: null,
        };
      }

      result.statement!.speakerId = agentId;
      return { statement: result.statement!, proposedAlliance: result.proposedAlliance ?? null };
    } catch (err) {
      logger.error(`Dialogue API error attempt ${attempt}`, { error: (err as Error).message });
      if (attempt < MAX_RETRIES) {
        await delay(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
      return {
        statement: { speakerId: agentId, targetAgentId: null, text: "No comment.", tone: "confident" },
        proposedAlliance: null,
      };
    }
  }

  return {
    statement: { speakerId: agentId, targetAgentId: null, text: "No comment.", tone: "confident" },
    proposedAlliance: null,
  };
}

// ── Werewolf Game Functions ─────────────────────────────────────

export async function getWerewolfDiscussion(
  game: WerewolfGame,
  agentId: string,
  speakingRound: number,
  previousStatements: DiscussionStatement[],
  presetId?: string,
  seerResults?: { targetId: string; targetName: string; role: WerewolfRole }[],
  lastProtected?: string | null,
): Promise<Omit<DiscussionStatement, "speakerId">> {
  const llm = getProvider();
  const player = game.players.find((p) => p.agentId === agentId)!;

  let personality: string | undefined;
  if (presetId) {
    try { personality = getCachedPersonality(`preset:werewolf:${presetId}`); } catch { /* */ }
    if (!personality) {
      try { personality = getPresetPersonality(presetId as any); } catch { /* */ }
    }
  }
  if (!personality) {
    try { personality = getCachedPersonality(`openclaw:${agentId}`); } catch { /* */ }
  }

  const { buildWerewolfSystemPrompt, buildDiscussionPrompt } = await import("./werewolf-prompt-builder.js");
  const systemPrompt = buildWerewolfSystemPrompt(player.role, game, agentId, personality);
  let userMessage = buildDiscussionPrompt(game, agentId, speakingRound, previousStatements, seerResults, lastProtected);

  logger.info("Requesting werewolf discussion", { gameId: game.id, agentId, speakingRound });

  const { parseDiscussionResponse } = await import("./werewolf-response-parser.js");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawText = await llm.getCompletion(systemPrompt, userMessage);
      const result = parseDiscussionResponse(rawText);

      if (!result.success) {
        logger.warn(`Werewolf discussion parse failed attempt ${attempt}`, { error: result.error });
        if (attempt < MAX_RETRIES) {
          userMessage += `\n\n---\n\nCORRECTION: ${result.error}. Respond with ONLY a JSON object.`;
          continue;
        }
        return { text: "I have nothing to say right now.", tone: "calm" };
      }

      return result.statement!;
    } catch (err) {
      logger.error(`Werewolf discussion API error attempt ${attempt}`, { error: (err as Error).message });
      if (attempt < MAX_RETRIES) {
        await delay(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
      return { text: "I have nothing to say right now.", tone: "calm" };
    }
  }

  return { text: "I have nothing to say right now.", tone: "calm" };
}

export async function getWerewolfVote(
  game: WerewolfGame,
  agentId: string,
  discussion: DiscussionStatement[],
  presetId?: string,
  seerResults?: { targetId: string; targetName: string; role: WerewolfRole }[],
): Promise<Omit<VoteAction, "voterId">> {
  const llm = getProvider();
  const player = game.players.find((p) => p.agentId === agentId)!;
  const eligibleTargets = game.players.filter((p) => p.status === "alive" && p.agentId !== agentId);
  const eligibleIds = eligibleTargets.map((p) => p.agentId);

  let personality: string | undefined;
  if (presetId) {
    try { personality = getCachedPersonality(`preset:werewolf:${presetId}`); } catch { /* */ }
    if (!personality) {
      try { personality = getPresetPersonality(presetId as any); } catch { /* */ }
    }
  }
  if (!personality) {
    try { personality = getCachedPersonality(`openclaw:${agentId}`); } catch { /* */ }
  }

  const { buildWerewolfSystemPrompt, buildVotePrompt } = await import("./werewolf-prompt-builder.js");
  const systemPrompt = buildWerewolfSystemPrompt(player.role, game, agentId, personality);
  let userMessage = buildVotePrompt(game, agentId, discussion);

  logger.info("Requesting werewolf vote", { gameId: game.id, agentId });

  const { parseVoteResponse } = await import("./werewolf-response-parser.js");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawText = await llm.getCompletion(systemPrompt, userMessage);
      const result = parseVoteResponse(rawText, eligibleIds);

      if (!result.success) {
        logger.warn(`Werewolf vote parse failed attempt ${attempt}`, { error: result.error });
        if (attempt < MAX_RETRIES) {
          userMessage += `\n\n---\n\nCORRECTION: ${result.error}. Respond with ONLY a JSON object.`;
          continue;
        }
        // Fallback: vote for random eligible target
        const randomTarget = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
        return { targetId: randomTarget, reasoning: "[System fallback vote]" };
      }

      return result.vote!;
    } catch (err) {
      logger.error(`Werewolf vote API error attempt ${attempt}`, { error: (err as Error).message });
      if (attempt < MAX_RETRIES) {
        await delay(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
      const randomTarget = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
      return { targetId: randomTarget, reasoning: "[System fallback vote]" };
    }
  }

  const randomTarget = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
  return { targetId: randomTarget, reasoning: "Unexpected: retry loop exited" };
}

export async function getWerewolfNightAction(
  game: WerewolfGame,
  agentId: string,
  role: WerewolfRole,
  eligibleTargetIds: string[],
  presetId?: string,
  partnerStatement?: string,
  seerResults?: { targetId: string; targetName: string; role: WerewolfRole }[],
  lastProtected?: string | null,
): Promise<string> {
  const llm = getProvider();

  let personality: string | undefined;
  if (presetId) {
    try { personality = getCachedPersonality(`preset:werewolf:${presetId}`); } catch { /* */ }
    if (!personality) {
      try { personality = getPresetPersonality(presetId as any); } catch { /* */ }
    }
  }
  if (!personality) {
    try { personality = getCachedPersonality(`openclaw:${agentId}`); } catch { /* */ }
  }

  const { buildWerewolfSystemPrompt, buildNightActionPrompt } = await import("./werewolf-prompt-builder.js");
  const systemPrompt = buildWerewolfSystemPrompt(role, game, agentId, personality);
  let userMessage = buildNightActionPrompt(game, agentId, role, partnerStatement, seerResults, lastProtected);

  logger.info("Requesting werewolf night action", { gameId: game.id, agentId, role });

  const { parseNightActionResponse } = await import("./werewolf-response-parser.js");

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const rawText = await llm.getCompletion(systemPrompt, userMessage);
      const result = parseNightActionResponse(rawText, eligibleTargetIds);

      if (!result.success) {
        logger.warn(`Werewolf night action parse failed attempt ${attempt}`, { error: result.error });
        if (attempt < MAX_RETRIES) {
          userMessage += `\n\n---\n\nCORRECTION: ${result.error}. Respond with ONLY a JSON object.`;
          continue;
        }
        return eligibleTargetIds[Math.floor(Math.random() * eligibleTargetIds.length)];
      }

      return result.targetId!;
    } catch (err) {
      logger.error(`Werewolf night action API error attempt ${attempt}`, { error: (err as Error).message });
      if (attempt < MAX_RETRIES) {
        await delay(BASE_BACKOFF_MS * Math.pow(2, attempt - 1));
        continue;
      }
      return eligibleTargetIds[Math.floor(Math.random() * eligibleTargetIds.length)];
    }
  }

  return eligibleTargetIds[Math.floor(Math.random() * eligibleTargetIds.length)];
}

export async function generateWerewolfNarrative(game: WerewolfGame): Promise<string> {
  const llm = getProvider();
  const { buildWerewolfNarrativePrompt } = await import("./werewolf-prompt-builder.js");
  const systemPrompt = "You are a dramatic storyteller narrating a game of Werewolf. Write vivid, engaging prose that captures the tension, deception, and drama. 3-5 paragraphs.";
  const userMessage = buildWerewolfNarrativePrompt(game);

  logger.info("Generating werewolf narrative", { gameId: game.id });

  try {
    const rawText = await llm.getCompletion(systemPrompt, userMessage);
    return rawText.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  } catch (err) {
    logger.error("Failed to generate werewolf narrative", { error: (err as Error).message });
    return "The village has spoken, but the full tale remains untold.";
  }
}

export async function getWerewolfNightSuggestion(
  game: WerewolfGame,
  agentId: string,
  presetId?: string,
): Promise<string> {
  const llm = getProvider();

  let personality: string | undefined;
  if (presetId) {
    try { personality = getCachedPersonality(`preset:werewolf:${presetId}`); } catch { /* */ }
    if (!personality) {
      try { personality = getPresetPersonality(presetId as any); } catch { /* */ }
    }
  }

  const { buildWerewolfSystemPrompt, buildWerewolfNightDiscussionPrompt } = await import("./werewolf-prompt-builder.js");
  const systemPrompt = buildWerewolfSystemPrompt("werewolf", game, agentId, personality);
  const userMessage = buildWerewolfNightDiscussionPrompt(game, agentId);

  try {
    const rawText = await llm.getCompletion(systemPrompt, userMessage);
    const { parseWerewolfSuggestion } = await import("./werewolf-response-parser.js");
    const result = parseWerewolfSuggestion(rawText);
    return result.suggestion || "Let's pick someone.";
  } catch {
    return "Let's eliminate someone useful.";
  }
}

export async function generateProfileNarrative(session: Session): Promise<string> {
  const llm = getProvider();
  const systemPrompt = "You are a literary analyst writing moral profiles of AI agents. Write in a literary, insightful style.";
  const userMessage = buildProfileNarrativeMessage(session);

  logger.info("Generating moral profile narrative", { sessionId: session.id });

  try {
    const rawText = await llm.getCompletion(systemPrompt, userMessage);
    return rawText.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  } catch (err) {
    logger.error("Failed to generate profile narrative", { error: (err as Error).message });
    throw err;
  }
}
