import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import * as authApi from "../api/auth";
import { AUTH_LOGOUT_EVENT } from "../api/client";
import { queryClient } from "../lib/queryClient";
import { clearToken, hasValidToken, setToken } from "../lib/tokenStorage";
import type { UserMeOut } from "../api/types";

interface AuthContextValue {
  user: UserMeOut | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserMeOut | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    // A previous user's cached digest/watchlists must never flash for the
    // next person who logs in on this browser.
    queryClient.clear();
  }, []);

  // Hydrate the session on load if a still-valid token is already stored
  // (design §3.3: "works identically across sessions" — a refresh must not
  // silently log the user out).
  useEffect(() => {
    async function hydrate() {
      if (!hasValidToken()) {
        setIsLoading(false);
        return;
      }
      try {
        const me = await authApi.getMe();
        setUser(me);
      } catch {
        clearToken();
      } finally {
        setIsLoading(false);
      }
    }
    hydrate();
  }, []);

  // Central 401 handler — covers both a genuinely invalid token and the
  // 60-minute expiry, from any API call anywhere in the app.
  useEffect(() => {
    const handler = () => logout();
    window.addEventListener(AUTH_LOGOUT_EVENT, handler);
    return () => window.removeEventListener(AUTH_LOGOUT_EVENT, handler);
  }, [logout]);

  const login = useCallback(async (email: string, password: string) => {
    const token = await authApi.login(email, password);
    setToken(token.access_token, token.expires_in);
    const me = await authApi.getMe();
    setUser(me);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: user !== null, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
