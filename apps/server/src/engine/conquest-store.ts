import fs from "fs";
import path from "path";
import type { ConquestGame } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("conquest-store");

const DATA_DIR = path.resolve(import.meta.dirname, "../../data/conquest");

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function gamePath(gameId: string): string {
  return path.join(DATA_DIR, `${gameId}.json`);
}

export function saveGame(game: ConquestGame): void {
  ensureDir();
  game.updatedAt = Date.now();
  fs.writeFileSync(gamePath(game.id), JSON.stringify(game, null, 2), "utf-8");
  logger.debug("Game saved", { gameId: game.id });
}

export function loadGame(gameId: string): ConquestGame | null {
  const p = gamePath(gameId);
  if (!fs.existsSync(p)) return null;
  try {
    const raw = fs.readFileSync(p, "utf-8");
    return JSON.parse(raw) as ConquestGame;
  } catch (err) {
    logger.error("Failed to load game", { gameId, error: (err as Error).message });
    return null;
  }
}

export function listGames(): ConquestGame[] {
  ensureDir();
  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith(".json"));
  const games: ConquestGame[] = [];
  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), "utf-8");
      games.push(JSON.parse(raw) as ConquestGame);
    } catch {
      // skip corrupt files
    }
  }
  return games.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function deleteGame(gameId: string): boolean {
  const p = gamePath(gameId);
  if (!fs.existsSync(p)) return false;
  fs.unlinkSync(p);
  logger.info("Game deleted", { gameId });
  return true;
}
