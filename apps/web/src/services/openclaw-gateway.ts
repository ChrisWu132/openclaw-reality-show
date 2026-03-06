export const DEFAULT_OPENCLAW_URL = "ws://localhost:18789";
const PROBE_TIMEOUT = 3000;
const REQUEST_TIMEOUT = 45000;

export async function probeOpenClaw(url: string = DEFAULT_OPENCLAW_URL): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    try {
      const ws = new WebSocket(url);
      const timer = setTimeout(() => {
        ws.close();
        resolve(false);
      }, PROBE_TIMEOUT);

      ws.onopen = () => {
        clearTimeout(timer);
        ws.close();
        resolve(true);
      };
      ws.onerror = () => {
        clearTimeout(timer);
        resolve(false);
      };
    } catch {
      resolve(false);
    }
  });
}

export class OpenClawRelay {
  private ws: WebSocket | null = null;
  private pendingRequests = new Map<string, { resolve: (text: string) => void; reject: (err: Error) => void }>();
  private messageId = 0;

  private url: string = DEFAULT_OPENCLAW_URL;

  setUrl(url: string): void {
    this.url = url;
  }

  async connect(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);
        const timer = setTimeout(() => {
          reject(new Error("OpenClaw connection timed out"));
        }, PROBE_TIMEOUT);

        this.ws.onopen = () => {
          clearTimeout(timer);
          resolve();
        };
        this.ws.onerror = () => {
          clearTimeout(timer);
          reject(new Error("Failed to connect to OpenClaw"));
        };
        this.ws.onclose = () => {
          // Reject all pending requests
          for (const [, pending] of this.pendingRequests) {
            pending.reject(new Error("OpenClaw disconnected"));
          }
          this.pendingRequests.clear();
          this.ws = null;
        };
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data as string);
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  private handleMessage(data: string) {
    try {
      const msg = JSON.parse(data);
      // OpenClaw gateway returns responses keyed by message id
      const id = msg.id?.toString();
      if (id && this.pendingRequests.has(id)) {
        const pending = this.pendingRequests.get(id)!;
        this.pendingRequests.delete(id);
        if (msg.error) {
          pending.reject(new Error(msg.error.message || "OpenClaw error"));
        } else {
          // Extract text from response — handle various response shapes
          const text = msg.result?.text || msg.result?.content || msg.result || "";
          pending.resolve(typeof text === "string" ? text : JSON.stringify(text));
        }
      }
    } catch {
      // Ignore unparseable messages
    }
  }

  async sendPrompt(prompt: string): Promise<string> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error("OpenClaw not connected");
    }

    const id = String(++this.messageId);

    return new Promise<string>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error("OpenClaw request timed out"));
      }, REQUEST_TIMEOUT);

      this.pendingRequests.set(id, {
        resolve: (text) => {
          clearTimeout(timer);
          resolve(text);
        },
        reject: (err) => {
          clearTimeout(timer);
          reject(err);
        },
      });

      this.ws!.send(JSON.stringify({
        id,
        type: "req",
        method: "agent.message",
        params: { text: prompt },
      }));
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  get connected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }
}

// Singleton relay instance
export const openClawRelay = new OpenClawRelay();
