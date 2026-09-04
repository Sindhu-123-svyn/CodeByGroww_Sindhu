import { ApiError, NetworkError, isRateLimitError } from "../../api/errors";
import { AlertTriangleIcon, RefreshIcon, WifiOffIcon } from "./Icons";

/** Section-scoped error display with a retry action — one card's error
 * must never blank the whole page (frontend plan §7). Distinguishes a
 * network-down state from a real HTTP error, since they mean different
 * things to a user. */
export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const isNetwork = error instanceof NetworkError;
  let message: string;
  if (isNetwork) {
    message = "Can't reach the server. Check your connection and try again.";
  } else if (isRateLimitError(error)) {
    message = (error as ApiError).message;
  } else if (error instanceof ApiError) {
    message = error.message;
  } else {
    message = "Something went wrong.";
  }

  return (
    <div
      className="card fade-in"
      role="alert"
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        background: "var(--danger-bg)",
        borderColor: "#fecaca",
      }}
    >
      <span style={{ color: "var(--danger)", marginTop: 1 }}>
        {isNetwork ? <WifiOffIcon size={18} /> : <AlertTriangleIcon size={18} />}
      </span>
      <div style={{ flex: 1 }}>
        <p className="error-text" style={{ marginBottom: onRetry ? 10 : 0 }}>
          {message}
        </p>
        {onRetry && (
          <button className="btn btn-sm" onClick={onRetry}>
            <RefreshIcon size={13} /> Retry
          </button>
        )}
      </div>
    </div>
  );
}
