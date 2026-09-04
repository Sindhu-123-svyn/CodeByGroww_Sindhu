import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as authApi from "../api/auth";
import { ApiError } from "../api/errors";
import { AuthShell } from "../components/shared/AuthShell";
import { AlertTriangleIcon } from "../components/shared/Icons";

export function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      // Register does NOT return a token — only /login does. Navigate to
      // login rather than assuming an auto-login (frontend plan §3).
      await authApi.register(email, password);
      navigate("/login", { state: { registered: true } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("An account with that email already exists.");
      } else {
        setError(err instanceof Error ? err.message : "Registration failed.");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthShell title="Create an account" subtitle="Build a watchlist that tells you what actually matters.">
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
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <p className="muted" style={{ marginTop: 4 }}>
            At least 8 characters.
          </p>
        </div>
        {error && (
          <p className="error-text">
            <AlertTriangleIcon size={13} /> {error}
          </p>
        )}
        <button className="btn btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: 4, padding: "10px 14px" }}>
          {isSubmitting ? <span className="spinner" /> : null}
          {isSubmitting ? "Creating account…" : "Register"}
        </button>
      </form>
      <p className="muted" style={{ marginTop: 18, textAlign: "center" }}>
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </AuthShell>
  );
}
