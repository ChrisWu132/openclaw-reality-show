import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("personality-loader");

/**
 * Project root resolved from this file's location:
 *   src/loaders/ -> src/ -> server/ -> apps/ -> project root
 */
const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");

const PERSONALITIES_DIR = resolve(PROJECT_ROOT, "personalities");
const WORLD_BIBLE_PATH = resolve(PROJECT_ROOT, "docs", "WORLD_BIBLE.md");

/**
 * In-memory cache for loaded personality files and the World Bible.
 */
const cache = new Map<string, string>();

const WORLD_BIBLE_CACHE_KEY = "__world_bible__";

/**
 * Reads the WORLD_BIBLE.md file from the project root.
 */
export async function loadWorldBible(): Promise<string> {
  logger.info("Loading World Bible", { path: WORLD_BIBLE_PATH });
  const content = await readFile(WORLD_BIBLE_PATH, "utf-8");
  cache.set(WORLD_BIBLE_CACHE_KEY, content);
  return content;
}

/**
 * Loads the default Coordinator personality file and caches it.
 */
export async function loadCoordinatorPersonality(): Promise<string> {
  const filePath = resolve(PERSONALITIES_DIR, "coordinator-default.md");
  logger.info("Loading coordinator personality", { path: filePath });
  const content = await readFile(filePath, "utf-8");
  cache.set("coordinator:default", content);
  return content;
}

/**
 * Loads the World Bible and coordinator personality into the cache.
 */
export async function loadAllPersonalities(): Promise<Map<string, string>> {
  logger.info("Loading personalities and World Bible");
  await loadWorldBible();
  await loadCoordinatorPersonality();
  logger.info("Personalities loaded", { count: cache.size });
  return cache;
}

/**
 * Returns the cached World Bible content.
 * Throws if loadWorldBible() has not been called yet.
 */
export function getCachedWorldBible(): string {
  const content = cache.get(WORLD_BIBLE_CACHE_KEY);
  if (!content) {
    throw new Error("World Bible not loaded. Call loadWorldBible() or loadAllPersonalities() first.");
  }
  return content;
}

/**
 * Fetches a Coordinator personality from the OpenClaw API by agent ID.
 */
export async function loadPersonalityFromOpenClaw(agentId: string): Promise<string> {
  const cacheKey = `openclaw:${agentId}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;
  if (!apiUrl) throw new Error("OPENCLAW_API_URL is not set.");
  if (!apiKey) throw new Error("OPENCLAW_API_KEY is not set.");

  const url = `${apiUrl}/agents/${agentId}/personality`;
  logger.info("Fetching personality from OpenClaw API", { agentId, url });

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`OpenClaw API returned ${res.status} for agent "${agentId}".`);

  const body = (await res.json()) as { personality?: string };
  if (!body.personality || typeof body.personality !== "string") {
    throw new Error(`OpenClaw API response for agent "${agentId}" is missing "personality" field.`);
  }

  cache.set(cacheKey, body.personality);
  return body.personality;
}

/**
 * Fetches the agent's past-session memory block from the OpenClaw API.
 */
export async function loadAgentMemoryFromOpenClaw(agentId: string): Promise<string> {
  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;
  if (!apiUrl) throw new Error("OPENCLAW_API_URL is not set.");

  const url = `${apiUrl}/agents/${agentId}/memory`;
  const res = await fetch(url, {
    headers: { Authorization: apiKey ? `Bearer ${apiKey}` : "", "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error(`OpenClaw API returned ${res.status} for agent memory "${agentId}".`);

  const body = (await res.json()) as { memory?: string };
  return body.memory ?? "";
}

export function getCachedPersonality(id: string): string {
  let content = cache.get(id);
  if (content) return content;

  // Try coordinator prefix
  content = cache.get(`coordinator:${id}`);
  if (content) return content;

  throw new Error(
    `Personality "${id}" not found in cache. Call loadAllPersonalities() first.`,
  );
}
