import type { Response } from "express";
import type { WSEvent, StartupWSEvent, WerewolfWSEvent } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("sse");

// -- Trolley session connections (1:1) --
const sessionConnections = new Map<string, Response>();

// -- Startup game connections (1:N) --
const startupConnections = new Map<string, Set<Response>>();

// -- Relay connections (for remote OpenClaw) --
// Key: sessionId (trolley) or gameId:agentId (startup)
const relayConnections = new Map<string, Response>();

// -- Heartbeat --
const HEARTBEAT_INTERVAL = 15_000;
const heartbeatTimers = new Map<Response, ReturnType<typeof setInterval>>();

function startHeartbeat(res: Response): void {
  const timer = setInterval(() => {
    try {
      res.write(":heartbeat\n\n");
    } catch {
      clearInterval(timer);
      heartbeatTimers.delete(res);
    }
  }, HEARTBEAT_INTERVAL);
  heartbeatTimers.set(res, timer);
}

function stopHeartbeat(res: Response): void {
  const timer = heartbeatTimers.get(res);
  if (timer) {
    clearInterval(timer);
    heartbeatTimers.delete(res);
  }
}

// -- Trolley session --

export function getSessionSSE(sessionId: string): Response | undefined {
  return sessionConnections.get(sessionId);
}

export function hasSessionSSE(sessionId: string): boolean {
  return sessionConnections.has(sessionId);
}

export function setSessionSSE(sessionId: string, res: Response): void {
  sessionConnections.set(sessionId, res);
  startHeartbeat(res);
  logger.info(`SSE connected for session ${sessionId}`);
}

export function removeSessionSSE(sessionId: string): void {
  const res = sessionConnections.get(sessionId);
  if (res) {
    stopHeartbeat(res);
    sessionConnections.delete(sessionId);
    logger.info(`SSE disconnected for session ${sessionId}`);
  }
}

export function emitSessionEvent(sessionId: string, event: WSEvent): void {
  // Route openclaw_request to relay connection if available
  if (event.type === "openclaw_request") {
    const relay = relayConnections.get(sessionId);
    if (relay) {
      try {
        relay.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
        logger.debug(`Emitted openclaw_request to relay`, { sessionId });
        return;
      } catch {
        removeRelaySSE(sessionId);
        // Fall through to send to owner
      }
    }
  }

  const res = sessionConnections.get(sessionId);
  if (!res) return;
  try {
    res.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    logger.debug(`Emitted: ${event.type}`, { type: event.type });
  } catch {
    removeSessionSSE(sessionId);
  }
}

export function endSessionSSE(sessionId: string): void {
  const res = sessionConnections.get(sessionId);
  if (res) {
    try { res.end(); } catch { /* already closed */ }
    removeSessionSSE(sessionId);
  }
}

// -- Startup game --

export function addStartupSSE(gameId: string, res: Response): void {
  if (!startupConnections.has(gameId)) {
    startupConnections.set(gameId, new Set());
  }
  startupConnections.get(gameId)!.add(res);
  startHeartbeat(res);
  logger.info(`Startup SSE spectator connected for game ${gameId}`);
}

export function removeStartupSSE(gameId: string, res: Response): void {
  const clients = startupConnections.get(gameId);
  if (clients) {
    stopHeartbeat(res);
    clients.delete(res);
    if (clients.size === 0) startupConnections.delete(gameId);
  }
}

export function broadcastStartupEvent(gameId: string, event: StartupWSEvent): void {
  // Route startup_openclaw_request to the relay connection for the specific agent
  if (event.type === "startup_openclaw_request" && "agentId" in event) {
    const relayKey = `${gameId}:${event.agentId}`;
    if (emitStartupRelayEvent(relayKey, event)) {
      return; // Sent to relay, don't broadcast to spectators
    }
  }

  const clients = startupConnections.get(gameId);
  if (!clients) return;
  const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  const dead: Response[] = [];
  for (const res of clients) {
    try {
      res.write(data);
    } catch {
      dead.push(res);
    }
  }
  for (const res of dead) {
    removeStartupSSE(gameId, res);
  }
}

export function endAllStartupSSE(gameId: string): void {
  const clients = startupConnections.get(gameId);
  if (!clients) return;
  for (const res of clients) {
    stopHeartbeat(res);
    try { res.end(); } catch { /* already closed */ }
  }
  startupConnections.delete(gameId);
}

// -- Relay connections --

export function setRelaySSE(key: string, res: Response): void {
  relayConnections.set(key, res);
  startHeartbeat(res);
  logger.info(`Relay SSE connected for ${key}`);
}

export function hasRelaySSE(key: string): boolean {
  return relayConnections.has(key);
}

export function removeRelaySSE(key: string): void {
  const res = relayConnections.get(key);
  if (res) {
    stopHeartbeat(res);
    relayConnections.delete(key);
    logger.info(`Relay SSE disconnected for ${key}`);
  }
}

export function endRelaySSE(key: string): void {
  const res = relayConnections.get(key);
  if (res) {
    try { res.end(); } catch { /* already closed */ }
    removeRelaySSE(key);
  }
}

// -- Werewolf game connections (1:N) --
const werewolfConnections = new Map<string, Set<Response>>();

export function addWerewolfSSE(gameId: string, res: Response): void {
  if (!werewolfConnections.has(gameId)) {
    werewolfConnections.set(gameId, new Set());
  }
  werewolfConnections.get(gameId)!.add(res);
  startHeartbeat(res);
  logger.info(`Werewolf SSE spectator connected for game ${gameId}`);
}

export function removeWerewolfSSE(gameId: string, res: Response): void {
  const clients = werewolfConnections.get(gameId);
  if (clients) {
    stopHeartbeat(res);
    clients.delete(res);
    if (clients.size === 0) werewolfConnections.delete(gameId);
  }
}

export function broadcastWerewolfEvent(gameId: string, event: WerewolfWSEvent): void {
  // Route werewolf_openclaw_request to the relay connection for the specific agent
  if (event.type === "werewolf_openclaw_request" && "agentId" in event) {
    const relayKey = `werewolf:${gameId}:${event.agentId}`;
    if (emitWerewolfRelayEvent(relayKey, event)) {
      return; // Sent to relay, don't broadcast to spectators
    }
  }

  const clients = werewolfConnections.get(gameId);
  if (!clients) return;
  const data = `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
  const dead: Response[] = [];
  for (const res of clients) {
    try {
      res.write(data);
    } catch {
      dead.push(res);
    }
  }
  for (const res of dead) {
    removeWerewolfSSE(gameId, res);
  }
}

export function endAllWerewolfSSE(gameId: string): void {
  const clients = werewolfConnections.get(gameId);
  if (!clients) return;
  for (const res of clients) {
    stopHeartbeat(res);
    try { res.end(); } catch { /* already closed */ }
  }
  werewolfConnections.delete(gameId);
}

export function emitWerewolfRelayEvent(key: string, event: WerewolfWSEvent): boolean {
  const relay = relayConnections.get(key);
  if (!relay) return false;
  try {
    relay.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    logger.debug(`Emitted to werewolf relay: ${event.type}`, { key });
    return true;
  } catch {
    removeRelaySSE(key);
    return false;
  }
}

/**
 * Emit an event to a startup relay connection.
 * Key format: gameId:agentId
 * Returns true if sent to relay, false if no relay found.
 */
export function emitStartupRelayEvent(key: string, event: StartupWSEvent): boolean {
  const relay = relayConnections.get(key);
  if (!relay) return false;
  try {
    relay.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    logger.debug(`Emitted to startup relay: ${event.type}`, { key });
    return true;
  } catch {
    removeRelaySSE(key);
    return false;
  }
}
