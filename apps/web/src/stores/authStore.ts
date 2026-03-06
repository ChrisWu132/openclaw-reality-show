import { create } from "zustand";
import type { User } from "@openclaw/shared";
import { register as registerApi, login as loginApi, getMe } from "../services/auth-api";

const TOKEN_KEY = "openclaw_token";

interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => void;
  restoreSession: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  loading: false,
  error: null,

  login: async (email, password) => {
    set({ loading: true, error: null });
    try {
      const { user, token } = await loginApi(email, password);
      localStorage.setItem(TOKEN_KEY, token);
      set({ user, token, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Login failed" });
    }
  },

  register: async (email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const { user, token } = await registerApi(email, password, displayName);
      localStorage.setItem(TOKEN_KEY, token);
      set({ user, token, loading: false });
    } catch (err) {
      set({ loading: false, error: err instanceof Error ? err.message : "Registration failed" });
    }
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ user: null, token: null, error: null });
  },

  restoreSession: async () => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return;

    set({ loading: true });
    try {
      const { user } = await getMe(token);
      set({ user, token, loading: false });
    } catch {
      localStorage.removeItem(TOKEN_KEY);
      set({ loading: false });
    }
  },

  clearError: () => set({ error: null }),
}));
