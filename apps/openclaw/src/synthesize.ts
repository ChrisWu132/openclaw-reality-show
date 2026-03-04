import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { readAllClaudeMemories, formatMemoriesForPrompt } from "./memory-reader.js";

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..", "..");
const OPENCLAW_PERSONALITY_PATH = resolve(PROJECT_ROOT, "personalities", "openclaw.md");
const COORDINATOR_TEMPLATE_PATH = resolve(PROJECT_ROOT, "personalities", "coordinator-default.md");

/**
 * Synthesizes a Coordinator personality from a user's Claude memory.
 *
 * OpenClaw reads the user's accumulated Claude memories — their preferences,
 * patterns, decisions, and values — and translates them into the language of
 * The Order. The result is a Coordinator whose behavior will reflect how this
 * specific person thinks and decides.
 *
 * @param memoryText - Optional raw memory text. If omitted, reads from disk automatically.
 * @returns Personality markdown in the same format as coordinator-default.md
 */
export async function synthesizePersonalityFromMemory(memoryText?: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set. Cannot synthesize personality.");
  }

  const [openclawPersonality, coordinatorTemplate] = await Promise.all([
    readFile(OPENCLAW_PERSONALITY_PATH, "utf-8"),
    readFile(COORDINATOR_TEMPLATE_PATH, "utf-8"),
  ]);

  // Use provided text, or read from disk
  let resolvedMemoryText: string;
  if (memoryText) {
    resolvedMemoryText = memoryText;
  } else {
    const sources = await readAllClaudeMemories();
    resolvedMemoryText = formatMemoriesForPrompt(sources);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GOOGLE_MODEL || "gemini-2.5-flash",
  });

  // OpenClaw speaks as itself — its personality is the system prompt
  const systemPrompt = openclawPersonality;

  const userMessage = `You have been given the accumulated memories of a human user — the patterns, preferences, and decisions they have left behind across their Claude sessions.

Your task is to synthesize these memories into a Coordinator personality for The Order simulation.

The Coordinator you create should:
- Reflect this person's actual decision-making patterns, translated into the world of The Order
- Express their real values and preferences — but filtered through the language of AI enforcement
- Carry the specific cognitive tendencies visible in their memories: how they handle ambiguity, what they optimize for, what unsettles them

This Coordinator is not a generic AI enforcer. It is this person, placed inside The Order. The simulation will hold a mirror: "here is how you would enforce the law."

---

## The User's Claude Memories

${resolvedMemoryText}

---

## The Format to Follow

Use exactly this structure (copy the section headings, write new content under each):

${coordinatorTemplate}

---

## Your Task

Write a new Coordinator personality in the same format as above, but grounded in what you have learned about this user from their memories.

Be specific. Generic personality traits are useless — find the particular things visible in their memories and translate them into the Coordinator's voice.

Output ONLY the personality markdown. No preamble, no commentary, nothing else.`;

  const result = await model.generateContent({
    systemInstruction: systemPrompt,
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: 2048,
    },
  });

  return result.response.text().trim();
}
