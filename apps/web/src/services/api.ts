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
  remoteRelay?: boolean,
): Promise<{ sessionId: string; sseUrl: string; totalRounds: number; joinCode?: string }> {
  const res = await fetch("/api/session/create", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ scenario: "trolley-problem", agentSource, presetId, remoteRelay }),
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to create session (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}

export async function checkRelayStatus(code: string): Promise<{ claimed: boolean; exists: boolean }> {
  const res = await fetch(`/api/relay/status/${encodeURIComponent(code)}`);
  return res.json();
}

export async function startSession(sessionId: string): Promise<void> {
  const res = await fetch(`/api/session/${sessionId}/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to start session (${res.status})`);
  }
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
