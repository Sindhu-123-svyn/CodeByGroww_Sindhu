/**
 * The backend has exactly one error shape (app/core/exceptions.py):
 * `{"detail": "<message>"}` with the correct status code already set
 * (401/404/409/429/400). One parser covers every endpoint.
 */
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = "ApiError";
    this.status = status;
  }
}

/** Thrown when `fetch` itself fails (network down, DNS, CORS block) —
 * distinct from ApiError, which means "the server responded, but with an
 * error status." The UI must tell these apart (frontend plan §7). */
export class NetworkError extends Error {
  constructor(cause: unknown) {
    super("Could not reach the server");
    this.name = "NetworkError";
    this.cause = cause;
  }
}

export function isRateLimitError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 429;
}

export function isNotFoundError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 404;
}

export function isConflictError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 409;
}

export function isUnauthorizedError(err: unknown): boolean {
  return err instanceof ApiError && err.status === 401;
}
