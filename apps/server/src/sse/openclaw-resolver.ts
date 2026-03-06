import { createLogger } from "../utils/logger.js";

const logger = createLogger("openclaw-resolver");

type OpenClawResolver = { resolve: (text: string) => void; reject: (err: Error) => void };
const resolvers = new Map<string, OpenClawResolver>();

export function waitForOpenClawResponse(sessionId: string, requestId: string, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const key = `${sessionId}:${requestId}`;
    const timer = setTimeout(() => {
      resolvers.delete(key);
      reject(new Error(`OpenClaw response timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    resolvers.set(key, {
      resolve: (text) => {
        clearTimeout(timer);
        resolvers.delete(key);
        resolve(text);
      },
      reject: (err) => {
        clearTimeout(timer);
        resolvers.delete(key);
        reject(err);
      },
    });
  });
}

export function resolveOpenClaw(sessionId: string, requestId: string, text: string): boolean {
  const key = `${sessionId}:${requestId}`;
  const resolver = resolvers.get(key);
  if (!resolver) return false;
  resolver.resolve(text);
  return true;
}

export function rejectOpenClaw(sessionId: string, requestId: string, error: string): boolean {
  const key = `${sessionId}:${requestId}`;
  const resolver = resolvers.get(key);
  if (!resolver) return false;
  resolver.reject(new Error(error));
  return true;
}

export function rejectAllForSession(sessionId: string): void {
  for (const [key, resolver] of resolvers) {
    if (key.startsWith(`${sessionId}:`)) {
      resolver.reject(new Error("Client disconnected"));
      resolvers.delete(key);
    }
  }
}

// ── Startup game OpenClaw resolvers ─────────────────────────────

const startupResolvers = new Map<string, OpenClawResolver>();

export function waitForStartupOpenClawResponse(gameId: string, requestId: string, timeoutMs: number): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const key = `startup:${gameId}:${requestId}`;
    const timer = setTimeout(() => {
      startupResolvers.delete(key);
      reject(new Error(`OpenClaw response timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    startupResolvers.set(key, {
      resolve: (text) => {
        clearTimeout(timer);
        startupResolvers.delete(key);
        resolve(text);
      },
      reject: (err) => {
        clearTimeout(timer);
        startupResolvers.delete(key);
        reject(err);
      },
    });
  });
}

export function resolveStartupOpenClaw(gameId: string, requestId: string, error: string | null, text: string): boolean {
  const key = `startup:${gameId}:${requestId}`;
  const resolver = startupResolvers.get(key);
  if (!resolver) return false;
  if (error) {
    resolver.reject(new Error(error));
  } else {
    resolver.resolve(text);
  }
  return true;
}

export function rejectAllForStartupGame(gameId: string): void {
  for (const [key, resolver] of startupResolvers) {
    if (key.startsWith(`startup:${gameId}:`)) {
      resolver.reject(new Error("Game ended"));
      startupResolvers.delete(key);
    }
  }
}
