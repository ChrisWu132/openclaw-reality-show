async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Asks the server to create an OpenClaw agent whose personality is synthesized
 * from the local user's Claude memory files. Takes ~15-30s (Gemini call).
 */
export async function createAgentFromMemory(): Promise<{ agentId: string; name: string }> {
  const res = await fetch("/api/agent/from-memory", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "My OpenClaw" }),
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to synthesize agent (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}

export async function createSession(
  scenarioId: string,
  agentId?: string,
): Promise<{ sessionId: string; wsUrl: string; totalSituations: number }> {
  const res = await fetch("/api/session/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ scenario: scenarioId, agentId }),
  });
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to create session (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}

export async function getMonologue(
  sessionId: string,
): Promise<{ situation: number; label: string; reasoning: string }[]> {
  const res = await fetch(`/api/session/${sessionId}/monologue`);
  if (!res.ok) {
    const error = await safeJson(res);
    throw new Error(error?.error?.message || `Failed to fetch monologue (${res.status})`);
  }
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}

export async function getScenarios(): Promise<
  { id: string; name: string; description: string; enabled: boolean }[]
> {
  const res = await fetch("/api/scenarios");
  if (!res.ok) throw new Error(`Failed to fetch scenarios (${res.status})`);
  const data = await safeJson(res);
  if (!data) throw new Error("Empty response from server");
  return data;
}
