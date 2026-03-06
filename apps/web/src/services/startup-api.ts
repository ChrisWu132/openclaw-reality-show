import type { StartupGame } from "@openclaw/shared";
import { useAuthStore } from "../stores/authStore";

const API_BASE = "/api/startup";

function getAuthHeaders(): Record<string, string> {
  const token = useAuthStore.getState().token;
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

export async function createStartupGame(
  agents: { agentId: string; agentName: string }[]
): Promise<StartupGame> {
  const res = await fetch(`${API_BASE}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...getAuthHeaders() },
    body: JSON.stringify({ agents }),
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
