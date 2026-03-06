import type { AgentSource, PresetId } from "@openclaw/shared";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function createSession(
  agentSource: AgentSource,
  presetId?: PresetId,
): Promise<{ sessionId: string; sseUrl: string; totalRounds: number }> {
  const res = await fetch("/api/session/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: "trolley-problem", agentSource, presetId }),
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to create session (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}
