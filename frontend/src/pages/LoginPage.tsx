import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ApiError } from "../api/errors";
import { AuthShell } from "../components/shared/AuthShell";
import { AlertTriangleIcon } from "../components/shared/Icons";

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: Location })?.from?.pathname ?? "/";
  const justRegistered = Boolean((location.state as { registered?: boolean })?.registered);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      // Inline message, not a redirect — the user is already on the login
      // page (frontend plan §3).
      if (err instanceof ApiError && err.status === 401) {
        setError("Invalid email or password.");
      } else {
        setError(err instanceof Error ? err.message : "Login failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Welcome back" subtitle="Log in to see what's changed since your last visit.">
      {justRegistered && !error && (
        <p
          style={{
            background: "var(--success-bg)",
            color: "var(--success)",
            borderRadius: "var(--radius-sm)",
            padding: "9px 12px",
            fontSize: 13,
            marginBottom: 14,
          }}
        >
          Account created — log in to continue.
        </p>
      )}
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            required
            autoFocus
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        {error && (
          <p className="error-text">
            <AlertTriangleIcon size={13} /> {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: 4, padding: "10px 14px" }}>
          {isSubmitting ? <span className="spinner" /> : null}
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>
        No account? <Link to="/register">Register</Link>
      </p>
    </AuthShell>
  );
}
