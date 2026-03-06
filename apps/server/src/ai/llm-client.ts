import type { TrolleyDecision, Session, Dilemma, StartupAction, StartupGame, MarketEvent, PresetId } from "@openclaw/shared";
import type { LLMProvider } from "./llm-provider.js";
import { createLLMProvider } from "./llm-provider.js";
import { buildSystemPrompt, buildDilemmaMessage, buildProfileNarrativeMessage } from "./prompt-builder.js";
import { buildStartupSystemPrompt, buildStartupTurnMessage } from "./startup-prompt-builder.js";
import { parseTrolleyDecision } from "./response-parser.js";
import { parseStartupAction } from "./startup-response-parser.js";
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
