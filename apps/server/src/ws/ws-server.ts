import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import { getSession } from "../engine/state-manager.js";
import { runSession, cancelSession } from "../engine/scene-engine.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ws-server");

const sessionConnections = new Map<string, WebSocket>();

export function getSessionWs(sessionId: string): WebSocket | undefined {
  return sessionConnections.get(sessionId);
}

export function setupWebSocketServer(server: Server): void {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const url = new URL(request.url || "", `http://${request.headers.host}`);
    const match = url.pathname.match(/^\/session\/(.+)$/);

    if (!match) {
      socket.destroy();
      return;
    }

    const sessionId = match[1];
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
      wss.emit("connection", ws, request, sessionId);
    });
  });

  wss.on("connection", (ws: WebSocket, _request: unknown, sessionId: string) => {
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
  });
}
