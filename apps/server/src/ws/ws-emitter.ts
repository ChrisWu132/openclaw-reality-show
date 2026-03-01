import type { WebSocket } from "ws";
import type { WSEvent } from "@openclaw/shared";
import { delay } from "../utils/delay.js";
import { createLogger } from "../utils/logger.js";

const logger = createLogger("ws-emitter");

const NPC_EVENT_DELAY = 3000;
const POST_NPC_DELAY = 1500;

export function emitEvent(ws: WebSocket, event: WSEvent): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(event));
    logger.debug(`Emitted: ${event.type}`, {
      type: event.type,
      speaker: "speaker" in event ? (event as any).speaker : undefined,
    });
  }
}

export async function emitNpcEventsWithPacing(
  ws: WebSocket,
  events: WSEvent[],
  situation: number,
): Promise<void> {
  for (let i = 0; i < events.length; i++) {
    emitEvent(ws, events[i]);
    if (i < events.length - 1) {
      await delay(NPC_EVENT_DELAY);
    }
  }
  await delay(POST_NPC_DELAY);
}
