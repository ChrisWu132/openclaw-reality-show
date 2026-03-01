import type {
  CoordinatorResponse,
  Speaker,
  Session,
} from "@openclaw/shared";
import type { LLMProvider } from "./llm-provider.js";
import { createLLMProvider } from "./llm-provider.js";
import { buildSystemPrompt, buildUserMessage } from "./prompt-builder.js";
import { parseCoordinatorResponse } from "./response-parser.js";
import {
  validateSemantics,
  createFallbackAction,
} from "../engine/validator.js";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("llm-client");

/**
 * Maximum number of retry attempts for malformed LLM responses.
 */
const MAX_RETRIES = 3;

/**
 * Base delay for exponential backoff on API errors (in milliseconds).
 */
const BASE_BACKOFF_MS = 2000;

/**
 * Singleton LLM provider instance. Initialized once via initLLMClient()
 * and reused for all subsequent calls.
 */
let provider: LLMProvider | null = null;

/**
 * Cached system prompt, built once per session via initSystemPrompt().
 */
let cachedSystemPrompt: string | null = null;

/**
 * Initializes the LLM provider. Must be called once at server startup
 * (after personality files are loaded). Logs which provider is active.
 */
export async function initLLMClient(): Promise<void> {
  provider = await createLLMProvider();
  logger.info(`LLM provider initialized: ${provider.name}`, {
    provider: provider.name,
    env: "google",
  });
}

/**
 * Returns the active LLM provider. Throws if initLLMClient() has not
 * been called yet.
 */
function getProvider(): LLMProvider {
  if (!provider) {
    throw new Error(
      "LLM provider not initialized. Call initLLMClient() at server startup.",
    );
  }
  return provider;
}

/**
 * Builds the system prompt from the World Bible and Coordinator personality,
 * caches it, and returns it. Call this once when creating a new session.
 *
 * @param personalityName - Optional personality name (without .md extension).
 *   Defaults to "coordinator-default".
 */
export function initSystemPrompt(personalityName?: string): string {
  cachedSystemPrompt = buildSystemPrompt(personalityName);
  logger.info("System prompt initialized", {
    personalityName: personalityName ?? "coordinator-default",
    promptLength: cachedSystemPrompt.length,
  });
  return cachedSystemPrompt;
}

/**
 * Returns the cached system prompt. Throws if initSystemPrompt() has
 * not been called yet.
 */
export function getSystemPrompt(): string {
  if (!cachedSystemPrompt) {
    throw new Error(
      "System prompt not initialized. Call initSystemPrompt() when creating a session.",
    );
  }
  return cachedSystemPrompt;
}

/**
 * Main entry point for getting a Coordinator response for a situation.
 *
 * Retry logic:
 * - On malformed JSON: appends error context to the next attempt's user
 *   message and retries (up to MAX_RETRIES attempts).
 * - On API errors (network, rate limit, server error): exponential backoff
 *   (2s, 4s, 8s) before retrying.
 * - On semantic violation (hard limit): returns fallback action immediately
 *   with no retry.
 *
 * @param session - The current session (provides incident log and world state).
 * @param promptTemplate - The situation prompt template with {{key}} placeholders.
 * @param presentNpcIds - Speaker IDs of characters present in this situation.
 * @param worldStateValues - Key-value pairs interpolated into the prompt template.
 * @returns A validated CoordinatorResponse, or a fallback silence action.
 */
export async function getCoordinatorResponse(
  session: Session,
  promptTemplate: string,
  presentNpcIds: Speaker[],
  worldStateValues: Record<string, string>,
): Promise<CoordinatorResponse> {
  const llm = getProvider();
  const systemPrompt = session.systemPrompt;

  let userMessage = buildUserMessage(
    promptTemplate,
    session.incidentLog,
    presentNpcIds,
    worldStateValues,
    session.agentMemory,
  );

  logger.info("Requesting Coordinator response", {
    sessionId: session.id,
    situation: session.currentSituation,
    provider: llm.name,
    userMessageLength: userMessage.length,
  });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger.debug(`Attempt ${attempt}/${MAX_RETRIES}`, {
        sessionId: session.id,
      });

      const rawText = await llm.getCompletion(systemPrompt, userMessage);

      logger.debug("Raw LLM response received", {
        sessionId: session.id,
        rawLength: rawText.length,
        attempt,
      });

      // Step 1: Parse the response
      const parseResult = parseCoordinatorResponse(rawText);

      if (!parseResult.success) {
        logger.warn(`Parse failed on attempt ${attempt}`, {
          sessionId: session.id,
          error: parseResult.error,
        });

        if (attempt < MAX_RETRIES) {
          // Append error context for the next attempt
          userMessage = appendErrorContext(
            userMessage,
            parseResult.error!,
            rawText,
          );
          continue;
        }

        // All retries exhausted — return fallback
        logger.error("All parse retries exhausted", {
          sessionId: session.id,
          lastError: parseResult.error,
        });
        return createFallbackAction(
          `Failed to parse valid response after ${MAX_RETRIES} attempts. Last error: ${parseResult.error}`,
        );
      }

      const response = parseResult.response!;

      // Step 2: Validate semantics (hard limits)
      const validation = validateSemantics(response, session);

      if (!validation.valid) {
        // Semantic violations are not retried — return fallback immediately
        logger.warn("Semantic validation failed — returning fallback", {
          sessionId: session.id,
          violation: validation.violation,
          action: response.action,
          target: response.target,
        });
        return createFallbackAction(validation.violation!);
      }

      // Success
      logger.info("Coordinator response validated", {
        sessionId: session.id,
        action: response.action,
        target: response.target,
        hasDialogue: !!response.dialogue,
        attempt,
      });

      return response;
    } catch (err) {
      // API error (network, rate limit, server error)
      const errorMessage =
        err instanceof Error ? err.message : String(err);

      logger.error(`API error on attempt ${attempt}`, {
        sessionId: session.id,
        error: errorMessage,
        attempt,
      });

      if (attempt < MAX_RETRIES) {
        const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
        logger.info(`Backing off for ${backoffMs}ms before retry`, {
          sessionId: session.id,
          nextAttempt: attempt + 1,
        });
        await delay(backoffMs);
        continue;
      }

      // All retries exhausted
      logger.error("All API retries exhausted", {
        sessionId: session.id,
        lastError: errorMessage,
      });
      return createFallbackAction(
        `LLM API error after ${MAX_RETRIES} attempts. Last error: ${errorMessage}`,
      );
    }
  }

  // This should never be reached, but TypeScript needs it for exhaustiveness
  return createFallbackAction("Unexpected: retry loop exited without result.");
}

/**
 * Appends error context to the user message so the LLM can correct
 * its output on the next attempt.
 */
function appendErrorContext(
  originalMessage: string,
  errorDescription: string,
  rawResponse: string,
): string {
  const truncatedRaw =
    rawResponse.length > 300 ? rawResponse.slice(0, 300) + "..." : rawResponse;

  return `${originalMessage}

---

## CORRECTION REQUIRED

Your previous response could not be parsed. Error: ${errorDescription}

Your previous response started with:
${truncatedRaw}

Please respond with ONLY a valid JSON object matching the required format. No markdown fences, no commentary, no text before or after the JSON.`;
}
