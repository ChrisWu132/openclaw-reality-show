import type { WerewolfGame, WerewolfAgentConfig } from "@openclaw/shared";
import { useAuthStore } from "../stores/authStore";

const API_BASE = "/api/werewolf";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function createWerewolfGame(
  agentConfigs: WerewolfAgentConfig[],
): Promise<WerewolfGame> {
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

export async function listWerewolfGames(): Promise<WerewolfGame[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to list games");
  return res.json();
}

export async function getWerewolfGame(gameId: string): Promise<WerewolfGame> {
  const res = await fetch(`${API_BASE}/games/${gameId}`);
  if (!res.ok) throw new Error("Failed to get game");
  return res.json();
}

export async function startWerewolfGameApi(gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}/start`, {
    method: "POST",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to start game");
  }
}

export async function deleteWerewolfGameApi(gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}`, {
    method: "DELETE",
    headers: { ...getAuthHeaders() },
  });
  if (!res.ok) throw new Error("Failed to delete game");
}
