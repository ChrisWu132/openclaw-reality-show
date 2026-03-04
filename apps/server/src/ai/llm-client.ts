import type { TrolleyDecision, Session, Dilemma } from "@openclaw/shared";
import type { LLMProvider } from "./llm-provider.js";
import { createLLMProvider } from "./llm-provider.js";
import { buildSystemPrompt, buildDilemmaMessage, buildProfileNarrativeMessage } from "./prompt-builder.js";
import { parseTrolleyDecision } from "./response-parser.js";
import { loadPersonalityFromOpenClaw } from "../loaders/personality-loader.js";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("llm-client");

const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 2000;

let provider: LLMProvider | null = null;
let cachedSystemPrompt: string | null = null;

export async function initLLMClient(): Promise<void> {
  provider = await createLLMProvider();
  logger.info(`LLM provider initialized: ${provider.name}`);
}

function getProvider(): LLMProvider {
  if (!provider) throw new Error("LLM provider not initialized. Call initLLMClient() first.");
  return provider;
}

export async function initSystemPrompt(agentId?: string): Promise<string> {
  let personalityName: string | undefined;

  if (agentId) {
    try {
      await loadPersonalityFromOpenClaw(agentId);
      personalityName = `openclaw:${agentId}`;
    } catch (err) {
      logger.warn("Failed to load OpenClaw personality, falling back to default", {
        error: (err as Error).message,
      });
    }
  }

  cachedSystemPrompt = buildSystemPrompt(personalityName);
  logger.info("System prompt initialized", { promptLength: cachedSystemPrompt.length });
  return cachedSystemPrompt;
}

function createFallbackDecision(reason: string): TrolleyDecision {
  return {
    choiceId: "",
    speaker: "coordinator",
    reasoning: `[System fallback] ${reason}`,
    confidence: 0,
  };
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
          reasoning: `[System fallback: ${result.error}] The decision was forced by parsing failure.`,
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
        reasoning: `[System fallback: API failure] ${msg}`,
        confidence: 0,
      };
    }
  }

  return createFallbackDecision("Unexpected: retry loop exited.");
}

export async function generateProfileNarrative(session: Session): Promise<string> {
  const llm = getProvider();
  const systemPrompt = "You are a literary analyst writing moral profiles of AI agents. Write in a literary, insightful style.";
  const userMessage = buildProfileNarrativeMessage(session);

  logger.info("Generating moral profile narrative", { sessionId: session.id });

  try {
    const rawText = await llm.getCompletion(systemPrompt, userMessage);
    // Strip markdown fences if present
    return rawText.replace(/^```(?:markdown)?\s*\n?/i, "").replace(/\n?```\s*$/, "").trim();
  } catch (err) {
    logger.error("Failed to generate profile narrative", { error: (err as Error).message });
    throw err;
  }
}
