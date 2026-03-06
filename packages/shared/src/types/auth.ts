export interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface DelegationTokenPayload {
  sub: string;
  jti: string;
  session_id: string;
  scopes: string[];
  aud: string;
  exp: number;
  type: "delegation";
}
