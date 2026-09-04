/**
 * JWT storage: localStorage, not in-memory-only. The product's premise is
 * "come back later, across sessions/devices" (design §3.3) — an in-memory
 * token would log the user out on every refresh. Tradeoff acknowledged:
 * readable by an injected script under XSS; same documented-shortcut
 * posture as the backend's own "minimal auth" stance (backend/README.md).
 * An httpOnly-cookie flow was considered and rejected as out of scope — it
 * would require backend changes (cookie issuance + CSRF handling).
 */
const TOKEN_KEY = "smw_token";
const EXPIRES_AT_KEY = "smw_token_expires_at";

export function setToken(accessToken: string, expiresInSeconds: number): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(EXPIRES_AT_KEY, String(Date.now() + expiresInSeconds * 1000));
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRES_AT_KEY);
}

/** Client-side check only — a convenience to avoid firing a request we
 * already know will 401. The server's own 401 response remains the real
 * authority (tokens can also be invalidated server-side). */
export function hasValidToken(): boolean {
  const token = getToken();
  const expiresAt = localStorage.getItem(EXPIRES_AT_KEY);
  if (!token || !expiresAt) return false;
  return Date.now() < Number(expiresAt);
}
