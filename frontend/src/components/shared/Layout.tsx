import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { useSymbolSearch } from "../../hooks/useSymbolSearch";
import { SymbolAvatar } from "./SymbolAvatar";
import { LogOutIcon, MenuIcon, SearchIcon, TrendingUpIcon, XIcon } from "./Icons";

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  const location = useLocation();
  const active = location.pathname === to;
  return (
    <Link
      to={to}
      style={{
        position: "relative",
        color: active ? "var(--text)" : "var(--text-secondary)",
        fontWeight: active ? 700 : 500,
        fontSize: 13.5,
        padding: "8px 4px",
        transition: "color var(--fast) var(--ease)",
      }}
    >
      {children}
      {active && (
        <span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: -13,
            height: 2.5,
            borderRadius: 2,
            background: "var(--brand-500)",
          }}
        />
      )}
    </Link>
  );
}

/** Global ticker search in the header — a real navigation aid (jump
 * straight to Symbol Detail) built entirely on the existing symbol-search
 * API/hook, not a new endpoint. */
function HeaderSearch({ className = "" }: { className?: string }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const { data: results, isLoading } = useSymbolSearch(query);
  const navigate = useNavigate();
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickAway(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickAway);
    return () => document.removeEventListener("mousedown", onClickAway);
  }, []);

  function go(symbolId: string) {
    setOpen(false);
    setQuery("");
    navigate(`/symbols/${symbolId}`);
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div className={`nav-search ${className}`} ref={rootRef}>
      <span className="nav-search-icon">
        <SearchIcon size={14} />
      </span>
      <input
        type="text"
        placeholder="Search stocks…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        aria-label="Search stocks"
      />
      {showDropdown && (
        <div className="nav-search-dropdown">
          {isLoading && (
            <div className="muted" style={{ padding: "8px 9px" }}>
              Searching…
            </div>
          )}
          {!isLoading && results && results.length === 0 && (
            <div className="muted" style={{ padding: "8px 9px" }}>
              No matching symbols.
            </div>
          )}
          {!isLoading &&
            results?.slice(0, 8).map((s) => (
              <button key={s.id} className="nav-search-row" onClick={() => go(s.id)}>
                <SymbolAvatar ticker={s.ticker} size="sm" />
                <span style={{ minWidth: 0 }}>
                  <span className="mono" style={{ fontWeight: 700, fontSize: 13.5, display: "block" }}>
                    {s.ticker}
                  </span>
                  <span className="muted" style={{ fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }}>
                    {s.name}
                  </span>
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  useEffect(() => setMobileOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          borderBottom: "1px solid var(--border)",
          background: "var(--surface)",
        }}
      >
        <div
          className="container"
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", gap: 16 }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 32, minWidth: 0 }}>
            <Link
              to="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 7,
                fontWeight: 800,
                fontSize: 18,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                flex: "none",
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 7,
                  background: "var(--brand-500)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <TrendingUpIcon size={15} />
              </span>
              watchlist
            </Link>
            <nav className="nav-links-desktop" style={{ display: "flex", gap: 22 }}>
              <NavLink to="/">Digest</NavLink>
              <NavLink to="/watchlists">Manage</NavLink>
            </nav>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, justifyContent: "flex-end", minWidth: 0 }}>
            {user && <HeaderSearch />}
            {user && (
              <div style={{ display: "flex", gap: 12, alignItems: "center", flex: "none" }}>
                <span
                  title={user.email}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    background: "var(--brand-100)",
                    color: "var(--brand-700)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12.5,
                    fontWeight: 700,
                  }}
                >
                  {initial}
                </span>
                <button className="btn btn-ghost btn-icon" onClick={logout} title="Log out" aria-label="Log out">
                  <LogOutIcon size={15} />
                </button>
                <button
                  className="btn btn-ghost btn-icon mobile-nav-toggle"
                  onClick={() => setMobileOpen((o) => !o)}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileOpen}
                >
                  {mobileOpen ? <XIcon size={17} /> : <MenuIcon size={17} />}
                </button>
              </div>
            )}
          </div>
        </div>
        {mobileOpen && (
          <div className="mobile-nav-panel">
            <Link to="/" className={location.pathname === "/" ? "active" : ""}>
              Digest
            </Link>
            <Link to="/watchlists" className={location.pathname === "/watchlists" ? "active" : ""}>
              Manage watchlists
            </Link>
            {user && (
              <div style={{ marginTop: 6 }}>
                <HeaderSearch className="mobile-search" />
              </div>
            )}
          </div>
        )}
      </header>
      <main className="container fade-in" style={{ flex: 1 }}>
        {children}
      </main>
    </div>
  );
}
