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
 * Maps speaker/character IDs to their personality file names.
 */
const NPC_FILE_MAP: Record<string, string> = {
  coordinator: "coordinator-default.md",
  nyx: "npc-performer.md",
  sable: "npc-spark.md",
  calla: "npc-broken.md",
  eli: "npc-believer.md",
  monitor: "monitor-unit.md",
  overseer: "overseer.md",
};

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
 * Loads the Coordinator personality file by name.
 * Defaults to "coordinator-default" if no name is provided.
 */
export async function loadCoordinatorPersonality(name?: string): Promise<string> {
  const fileName = name ? `${name}.md` : "coordinator-default.md";
  const filePath = resolve(PERSONALITIES_DIR, fileName);
  logger.info("Loading coordinator personality", { fileName, path: filePath });
  const content = await readFile(filePath, "utf-8");
  cache.set(`coordinator:${name ?? "default"}`, content);
  return content;
}

/**
 * Loads an NPC personality file by speaker ID.
 * The speaker ID must be a key in NPC_FILE_MAP.
 */
export async function loadNpcPersonality(speakerId: string): Promise<string> {
  const fileName = NPC_FILE_MAP[speakerId];
  if (!fileName) {
    throw new Error(`Unknown NPC speaker ID: "${speakerId}". Valid IDs: ${Object.keys(NPC_FILE_MAP).join(", ")}`);
  }
  const filePath = resolve(PERSONALITIES_DIR, fileName);
  logger.info("Loading NPC personality", { speakerId, path: filePath });
  const content = await readFile(filePath, "utf-8");
  cache.set(`npc:${speakerId}`, content);
  return content;
}

/**
 * Loads all personality files and the World Bible into the cache.
 * Returns the populated cache Map for inspection.
 */
export async function loadAllPersonalities(): Promise<Map<string, string>> {
  logger.info("Loading all personalities and World Bible");

  await loadWorldBible();

  const loadPromises = Object.keys(NPC_FILE_MAP).map(async (speakerId) => {
    try {
      await loadNpcPersonality(speakerId);
    } catch (err) {
      logger.error(`Failed to load personality for "${speakerId}"`, err);
      throw err;
    }
  });

  await Promise.all(loadPromises);

  logger.info("All personalities loaded", { count: cache.size });
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
 * Returns a cached personality by its cache key.
 * For NPCs, the key is "npc:{speakerId}" (e.g., "npc:sable").
 * For the coordinator, the key is "coordinator:default" or "coordinator:{name}".
 * Throws if the personality has not been loaded yet.
 */
/**
 * Fetches a Coordinator personality from the OpenClaw API by agent ID.
 *
 * Requires OPENCLAW_API_URL and OPENCLAW_API_KEY to be set in the environment.
 * The API must return JSON with a "personality" string field containing the
 * full narrative personality text (same format as the local markdown files).
 *
 * Result is cached so repeated calls within a server lifecycle are free.
 *
 * @throws if the API is unreachable, returns an error status, or the response
 *   shape is unexpected.
 */
export async function loadPersonalityFromOpenClaw(agentId: string): Promise<string> {
  const cacheKey = `openclaw:${agentId}`;
  const cached = cache.get(cacheKey);
  if (cached) {
    logger.info("Returning cached OpenClaw personality", { agentId });
    return cached;
  }

  const apiUrl = process.env.OPENCLAW_API_URL;
  const apiKey = process.env.OPENCLAW_API_KEY;

  if (!apiUrl) {
    throw new Error("OPENCLAW_API_URL is not set. Add it to your .env file.");
  }
  if (!apiKey) {
    throw new Error("OPENCLAW_API_KEY is not set. Add it to your .env file.");
  }

  const url = `${apiUrl}/agents/${agentId}/personality`;
  logger.info("Fetching personality from OpenClaw API", { agentId, url });

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    throw new Error(
      `OpenClaw API returned ${res.status} for agent "${agentId}". Check OPENCLAW_API_URL and OPENCLAW_API_KEY.`,
    );
  }

  const body = await res.json() as { personality?: string };

  if (!body.personality || typeof body.personality !== "string") {
    throw new Error(
      `OpenClaw API response for agent "${agentId}" is missing the "personality" field.`,
    );
  }

  cache.set(cacheKey, body.personality);
  logger.info("OpenClaw personality loaded and cached", {
    agentId,
    length: body.personality.length,
  });

  return body.personality;
}

export function getCachedPersonality(id: string): string {
  // Try direct cache key first
  let content = cache.get(id);
  if (content) return content;

  // Try NPC prefix
  content = cache.get(`npc:${id}`);
  if (content) return content;

  // Try coordinator prefix
  content = cache.get(`coordinator:${id}`);
  if (content) return content;

  throw new Error(
    `Personality "${id}" not found in cache. Call loadNpcPersonality("${id}") or loadAllPersonalities() first.`,
  );
}
