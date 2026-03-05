import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import type { ConquestWSEvent } from "@openclaw/shared";
import { getSession } from "../engine/state-manager.js";
import { runSession, cancelSession } from "../engine/scene-engine.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ws-server");

// ── Trolley session connections (1:1) ───────────────────────────
const sessionConnections = new Map<string, WebSocket>();

export function getSessionWs(sessionId: string): WebSocket | undefined {
  return sessionConnections.get(sessionId);
}

// ── Conquest game connections (1:many) ──────────────────────────
const conquestConnections = new Map<string, Set<WebSocket>>();

export function broadcastConquestEvent(gameId: string, event: ConquestWSEvent): void {
  const clients = conquestConnections.get(gameId);
  if (!clients) return;
  const data = JSON.stringify(event);
  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(data);
    }
  }
}

// ── Setup ───────────────────────────────────────────────────────

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);

    // Trolley session: /session/:sessionId
    const sessionMatch = url.pathname.match(/^\/session\/(.+)$/);
    if (sessionMatch) {
      const sessionId = sessionMatch[1];
      const session = getSession(sessionId);

      if (!session) {
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      if (sessionConnections.has(sessionId)) {
        socket.write("HTTP/1.1 409 Conflict\r\n\r\n");
        socket.destroy();
        return;
      }

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, { type: "session", id: sessionId });
      });
      return;
    }

    // Conquest game: /conquest/:gameId
    const conquestMatch = url.pathname.match(/^\/conquest\/(.+)$/);
    if (conquestMatch) {
      const gameId = conquestMatch[1];
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request, { type: "conquest", id: gameId });
      });
      return;
    }

    socket.destroy();
  });

  wss.on("connection", (ws: WebSocket, _request: unknown, ctx: { type: string; id: string }) => {
    if (ctx.type === "session") {
      // Trolley session — 1:1
      const sessionId = ctx.id;
      sessionConnections.set(sessionId, ws);
      logger.info(`Client connected for session ${sessionId}`);

      ws.on("close", () => {
        sessionConnections.delete(sessionId);
        cancelSession(sessionId);
        logger.info(`Client disconnected from session ${sessionId}`);
      });

      ws.on("error", (err) => {
        logger.error(`WebSocket error for session ${sessionId}`, { error: err.message });
        sessionConnections.delete(sessionId);
      });

      // Auto-start the session after a 2-second delay
      setTimeout(() => {
        runSession(sessionId).catch((err) => {
          logger.error(`Session ${sessionId} failed`, { error: err.message });
          ws.close(4500, "Session failed");
        });
      }, 2000);

    } else if (ctx.type === "conquest") {
      // Conquest game — 1:many
      const gameId = ctx.id;
      if (!conquestConnections.has(gameId)) {
        conquestConnections.set(gameId, new Set());
      }
      conquestConnections.get(gameId)!.add(ws);
      logger.info(`Conquest spectator connected for game ${gameId}`);

      ws.on("close", () => {
        const clients = conquestConnections.get(gameId);
        if (clients) {
          clients.delete(ws);
          if (clients.size === 0) conquestConnections.delete(gameId);
        }
        logger.info(`Conquest spectator disconnected from game ${gameId}`);
      });

      ws.on("error", (err) => {
        logger.error(`Conquest WS error for game ${gameId}`, { error: err.message });
        conquestConnections.get(gameId)?.delete(ws);
      });
    }
  });
}
