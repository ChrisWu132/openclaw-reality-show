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
  agentId?: string,
): Promise<{ sessionId: string; wsUrl: string; totalRounds: number }> {
  const res = await fetch("/api/session/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: "trolley-problem", agentId }),
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to create session (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}

export async function createAgentFromMemory(
  name: string,
): Promise<{ agentId: string; name: string }> {
  const res = await fetch("/api/agent/from-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to create agent (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}
