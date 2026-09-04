import { ApiError, NetworkError } from "./errors";
import { getToken } from "../lib/tokenStorage";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000/api/v1";

/** Paths that must NOT get an Authorization header (they run before a
 * token exists). Matches backend/app/api/deps.py's get_current_user
 * exemptions exactly — everything else on the API requires a bearer token,
 * including /symbols/search and /symbols/{id}/validate. */
const UNAUTHENTICATED_PATHS = ["/auth/register", "/auth/login"];

/** Fired on any 401 response so AuthContext can clear the session and
 * redirect — covers both a genuine logout-elsewhere and the 60-minute
 * token expiry (app/config.py jwt_expire_minutes). Kept as a DOM event
 * rather than a direct import so this module has no dependency on React. */
export const AUTH_LOGOUT_EVENT = "smw:auth-logout";

export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const requestHeaders = new Headers(headers);
  requestHeaders.set("Content-Type", "application/json");

  if (!UNAUTHENTICATED_PATHS.includes(path)) {
    const token = getToken();
    if (token) requestHeaders.set("Authorization", `Bearer ${token}`);
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...rest,
      headers: requestHeaders,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (cause) {
    // fetch itself threw — network down, DNS failure, CORS block. Distinct
    // from a parsed HTTP error status (frontend plan §7).
    throw new NetworkError(cause);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const detail =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : response.statusText || "Request failed";

    if (response.status === 401) {
      window.dispatchEvent(new CustomEvent(AUTH_LOGOUT_EVENT));
    }
    throw new ApiError(response.status, detail);
  }

  return data as T;
}
