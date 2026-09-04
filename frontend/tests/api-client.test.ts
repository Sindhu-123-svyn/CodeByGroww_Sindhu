import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { apiFetch, AUTH_LOGOUT_EVENT } from "../src/api/client";
import { ApiError, NetworkError } from "../src/api/errors";

function mockJsonResponse(status: number, body: unknown) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    }),
  );
}

describe("apiFetch error parsing (backend/app/core/exceptions.py shape)", () => {
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(globalThis, "fetch");
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it.each([
    [401, "invalid email or password"],
    [404, "watchlist 'x' not found"],
    [409, "symbol 'x' is delisted and cannot be added to a watchlist"],
    [429, "watchlist item limit (100) exceeded"],
  ])("maps a %i response with {detail} into an ApiError carrying that status/message", async (status, detail) => {
    fetchSpy.mockImplementation(() => mockJsonResponse(status, { detail }));

    await expect(apiFetch("/whatever")).rejects.toMatchObject(
      new ApiError(status, detail),
    );
  });

  it("dispatches the global logout event on a 401", async () => {
    fetchSpy.mockImplementation(() => mockJsonResponse(401, { detail: "invalid or expired token" }));
    const handler = vi.fn();
    window.addEventListener(AUTH_LOGOUT_EVENT, handler);

    await expect(apiFetch("/watchlists")).rejects.toBeInstanceOf(ApiError);
    expect(handler).toHaveBeenCalledTimes(1);

    window.removeEventListener(AUTH_LOGOUT_EVENT, handler);
  });

  it("does NOT attach an Authorization header for /auth/login", async () => {
    fetchSpy.mockImplementation(() => mockJsonResponse(200, { access_token: "t", token_type: "bearer", expires_in: 60 }));
    await apiFetch("/auth/login", { method: "POST", body: { email: "a@b.com", password: "x" } });

    const call = fetchSpy.mock.calls[0];
    const init = call[1] as RequestInit;
    const headers = new Headers(init.headers);
    expect(headers.has("Authorization")).toBe(false);
  });

  it("wraps a raw fetch failure (network down) in a NetworkError, distinct from ApiError", async () => {
    fetchSpy.mockImplementation(() => Promise.reject(new TypeError("Failed to fetch")));
    await expect(apiFetch("/health")).rejects.toBeInstanceOf(NetworkError);
  });
});
