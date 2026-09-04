import { apiFetch } from "./client";
import type { TokenOut, UserMeOut, UserOut } from "./types";

export function register(email: string, password: string): Promise<UserOut> {
  return apiFetch<UserOut>("/auth/register", { method: "POST", body: { email, password } });
}

export function login(email: string, password: string): Promise<TokenOut> {
  return apiFetch<TokenOut>("/auth/login", { method: "POST", body: { email, password } });
}

export function getMe(): Promise<UserMeOut> {
  return apiFetch<UserMeOut>("/auth/me");
}
