import type { LLMProvider } from "./google-provider.js";

export type { LLMProvider };

/**
 * Creates the Google Gemini LLM provider.
 *
 * Requires GOOGLE_API_KEY to be set in the environment.
 * Model defaults to gemini-2.5-flash (configurable via GOOGLE_MODEL).
 */
export async function createLLMProvider(): Promise<LLMProvider> {
  const { GoogleProvider } = await import("./google-provider.js");
  return new GoogleProvider();
}
