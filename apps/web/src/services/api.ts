import type { AgentSource, PresetId } from "@openclaw/shared";
import { useAuthStore } from "../stores/authStore";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

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
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
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

export async function authorizeDelegation(sessionId: string): Promise<string> {
  const res = await fetch(`/api/session/${sessionId}/authorize`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to authorize (${res.status})`);
  }
  const data = await safeJson(res);
  return data.delegationToken;
}
