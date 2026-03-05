import type { ConquestGame, MapTemplate } from "@openclaw/shared";

const API_BASE = "/api/conquest";

export async function createConquestGame(
  mapTemplate: MapTemplate,
  agents: { agentId: string; agentName: string }[]
): Promise<ConquestGame> {
  const res = await fetch(`${API_BASE}/games`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mapTemplate, agents }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to create game");
  }
  return res.json();
}

export async function listConquestGames(): Promise<ConquestGame[]> {
  const res = await fetch(`${API_BASE}/games`);
  if (!res.ok) throw new Error("Failed to list games");
  return res.json();
}

export async function getConquestGame(gameId: string): Promise<ConquestGame> {
  const res = await fetch(`${API_BASE}/games/${gameId}`);
  if (!res.ok) throw new Error("Failed to get game");
  return res.json();
}

export async function startConquestGame(gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}/start`, { method: "POST" });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to start game");
  }
}

export async function deleteConquestGame(gameId: string): Promise<void> {
  const res = await fetch(`${API_BASE}/games/${gameId}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete game");
}
