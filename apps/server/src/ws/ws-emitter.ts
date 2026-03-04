import type { WebSocket } from "ws";
import type { WSEvent } from "@openclaw/shared";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ws-emitter");

export function emitEvent(ws: WebSocket, event: WSEvent): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
    logger.debug(`Emitted: ${event.type}`, { type: event.type });
  }
}
