import type { StartupGame, StartupAgentConfig } from "@openclaw/shared";
import { useAuthStore } from "../stores/authStore";

const API_BASE = "/api/startup";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function createStartupGame(
  agentConfigs: StartupAgentConfig[]
): Promise<StartupGame> {
  const res = await fetch(`${API_BASE}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ agentConfigs }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create game");
  }
  return res.json();
}

export async function listStartupGames(): Promise<StartupGame[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to list games");
  return res.json();
}

export async function getStartupGame(gameId: string): Promise<StartupGame> {
  const res = await fetch(`${API_BASE}/games/${gameId}`);
  if (!res.ok) throw new Error("Failed to get game");
  return res.json();
}

export async function startStartupGame(gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}/start`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to start game");
  }
}

export async function deleteStartupGame(gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete game");
}

export async function postStartupOpenClawResponse(
  gameId: string,
  requestId: string,
  text?: string,
  error?: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}/openclaw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ requestId, text, error }),
  });
  if (!res.ok) throw new Error("Failed to post OpenClaw response");
}
