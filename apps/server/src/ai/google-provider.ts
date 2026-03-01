import { GoogleGenerativeAI } from "@google/generative-ai";

/**
 * Interface for LLM providers. The rest of the codebase is provider-agnostic.
 */
export interface LLMProvider {
  /** Human-readable provider name (e.g., "google"). */
  name: string;

  /**
   * Sends a system prompt and user message to the LLM and returns
   * the raw text completion.
   */
  getCompletion(systemPrompt: string, userMessage: string): Promise<string>;
}

/**
 * Google Gemini LLM provider. Uses the @google/generative-ai SDK.
 *
 * Requires the GOOGLE_API_KEY environment variable to be set.
 */
export class GoogleProvider implements LLMProvider {
  readonly name = "google";
  private model: any = null;

  constructor() {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      // Defer error to runtime — server can start without API key for dev/frontend work
      return;
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    this.model = genAI.getGenerativeModel({
      model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
    });
  }

  async getCompletion(systemPrompt: string, userMessage: string): Promise<string> {
    if (!this.model) {
      throw new Error(
        "GOOGLE_API_KEY environment variable is required. Set it in .env to enable LLM calls.",
      );
    }

    const result = await this.model.generateContent({
      systemInstruction: systemPrompt,
      contents: [{ role: "user", parts: [{ text: userMessage }] }],
      generationConfig: {
        temperature: 0.8,
        maxOutputTokens: 8192,
        topP: 0.9,
        responseMimeType: "application/json",
      },
    });

    return result.response.text();
  }
}
