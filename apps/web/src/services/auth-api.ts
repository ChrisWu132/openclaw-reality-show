import type { User, AuthResponse } from "@openclaw/shared";

const API_BASE = "/api";

async function safeJson(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function register(
  email: string,
  password: string,
  displayName: string,
): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, displayName }),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.error?.message || `Registration failed (${res.status})`);
  }
  return (await safeJson(res)) as AuthResponse;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) {
    const data = await safeJson(res);
    throw new Error(data?.error?.message || `Login failed (${res.status})`);
  }
  return (await safeJson(res)) as AuthResponse;
}

export async function getMe(token: string): Promise<{ user: User }> {
  const res = await fetch(`${API_BASE}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Session expired");
  return (await safeJson(res)) as { user: User };
}
