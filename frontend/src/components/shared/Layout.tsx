import type { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { LogOutIcon, TrendingUpIcon } from "./Icons";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        color: active ? "var(--text)" : "var(--text-secondary)",
        fontWeight: active ? 650 : 500,
        fontSize: 13.5,
        padding: "6px 10px",
        borderRadius: 7,
        background: active ? "var(--gray-100)" : "transparent",
        transition: "background var(--fast) var(--ease), color var(--fast) var(--ease)",
      }}
    >
      {children}
    </Link>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <div className="app-shell">
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--border)",
          background: "rgba(255,255,255,0.85)",
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 20px" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 750,
                fontSize: 15.5,
                color: "var(--text)",
                letterSpacing: "-0.01em",
              }}
            >
              <span
                style={{
                  width: 27,
                  height: 27,
                  borderRadius: 8,
                  background: "var(--brand-500)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 5px rgba(0,169,126,0.32)",
                }}
              >
                <TrendingUpIcon size={15} />
              </span>
              Watchlist
            </Link>
            <nav style={{ display: "flex", gap: 4 }}>
              <NavLink to="/">Digest</NavLink>
              <NavLink to="/watchlists">Manage</NavLink>
            </nav>
          </div>
          {user && (
            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span
                title={user.email}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "var(--brand-100)",
                  color: "var(--brand-700)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                  fontWeight: 700,
                }}
              >
                {initial}
              </span>
              <button className="btn btn-ghost btn-icon" onClick={logout} title="Log out" aria-label="Log out">
                <LogOutIcon size={15} />
              </button>
            </div>
          )}
        </div>
      </header>
      <main className="container fade-in" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
