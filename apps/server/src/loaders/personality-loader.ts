import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PERSONALITY_PRESETS, STARTUP_PRESETS } from "@openclaw/shared";
import type { PresetId } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("personality-loader");

const PROJECT_ROOT = resolve(import.meta.dirname, "..", "..", "..", "..");
const PERSONALITIES_DIR = resolve(PROJECT_ROOT, "personalities");
const PRESETS_DIR = resolve(PERSONALITIES_DIR, "presets");
const STARTUP_PRESETS_DIR = resolve(PRESETS_DIR, "startup");
const WORLD_BIBLE_PATH = resolve(PROJECT_ROOT, "docs", "WORLD_BIBLE.md");

const cache = new Map<string, string>();
const WORLD_BIBLE_CACHE_KEY = "__world_bible__";

export async function loadWorldBible(): Promise<string> {
  logger.info("Loading World Bible", { path: WORLD_BIBLE_PATH });
  const content = await readFile(WORLD_BIBLE_PATH, "utf-8");
  cache.set(WORLD_BIBLE_CACHE_KEY, content);
  return content;
}

export async function loadCoordinatorPersonality(): Promise<string> {
  const filePath = resolve(PERSONALITIES_DIR, "coordinator-default.md");
  logger.info("Loading coordinator personality", { path: filePath });
  const content = await readFile(filePath, "utf-8");
  cache.set("coordinator:default", content);
  return content;
}

export async function loadPresetPersonalities(): Promise<void> {
  for (const preset of PERSONALITY_PRESETS) {
    const filePath = resolve(PRESETS_DIR, `${preset.id}.md`);
    try {
      const content = await readFile(filePath, "utf-8");
      cache.set(`preset:${preset.id}`, content);
      logger.info(`Loaded preset personality: ${preset.id}`);
    } catch (err) {
      logger.warn(`Failed to load preset personality: ${preset.id}`, { error: (err as Error).message });
    }
  }
}

export async function loadStartupPresetPersonalities(): Promise<void> {
  for (const preset of STARTUP_PRESETS) {
    const filePath = resolve(STARTUP_PRESETS_DIR, `${preset.id}.md`);
    try {
      const content = await readFile(filePath, "utf-8");
      cache.set(`preset:startup:${preset.id}`, content);
      logger.info(`Loaded startup preset personality: ${preset.id}`);
    } catch (err) {
      logger.warn(`Failed to load startup preset personality: ${preset.id}`, { error: (err as Error).message });
    }
  }
}

export async function loadAllPersonalities(): Promise<Map<string, string>> {
  logger.info("Loading personalities and World Bible");
  await loadWorldBible();
  await loadCoordinatorPersonality();
  await loadPresetPersonalities();
  await loadStartupPresetPersonalities();
  logger.info("Personalities loaded", { count: cache.size });
  return cache;
}

export function getCachedWorldBible(): string {
  const content = cache.get(WORLD_BIBLE_CACHE_KEY);
  if (!content) {
    throw new Error("World Bible not loaded. Call loadAllPersonalities() first.");
  }
  return content;
}

export function getPresetPersonality(presetId: PresetId): string {
  const content = cache.get(`preset:${presetId}`);
  if (!content) {
    throw new Error(`Preset personality "${presetId}" not found in cache.`);
  }
  return content;
}

export function getCachedPersonality(id: string): string {
  let content = cache.get(id);
  if (content) return content;

  content = cache.get(`coordinator:${id}`);
  if (content) return content;

  throw new Error(
    `Personality "${id}" not found in cache. Call loadAllPersonalities() first.`,
  );
}
