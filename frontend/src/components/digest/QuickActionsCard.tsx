import { Link } from "react-router-dom";
import { ChevronRightIcon, LayersIcon, PlusIcon, RefreshIcon, ZapIcon } from "../shared/Icons";

/** Every action here is real — no dead links. All three drive existing
 * routes/behaviour already in the app (Manage Watchlists, and the
 * digest's own refetch). */
export function QuickActionsCard({ onRefresh, refreshing }: { onRefresh: () => void; refreshing: boolean }) {
  return (
    <div className="card">
      <div className="section-head" style={{ marginBottom: 4 }}>
        <span className="section-head-icon" style={{ background: "var(--brand-50)", color: "var(--brand-700)" }}>
          <ZapIcon size={13} />
        </span>
        <h3>Quick Actions</h3>
      </div>

      <Link to="/watchlists" className="quick-action-row">
        <span className="quick-action-icon">
          <PlusIcon size={15} />
        </span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>Add a Symbol</span>
        <ChevronRightIcon size={15} style={{ color: "var(--text-muted)" }} />
      </Link>

      <Link to="/watchlists" className="quick-action-row">
        <span className="quick-action-icon">
          <LayersIcon size={15} />
        </span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>Manage Watchlist</span>
        <ChevronRightIcon size={15} style={{ color: "var(--text-muted)" }} />
      </Link>

      <button
        className="quick-action-row"
        onClick={onRefresh}
        disabled={refreshing}
        style={{ border: "none", background: "none", width: "100%", textAlign: "left" }}
      >
        <span className="quick-action-icon">
          {refreshing ? <span className="spinner" /> : <RefreshIcon size={15} />}
        </span>
        <span style={{ flex: 1, fontWeight: 600, fontSize: 13.5 }}>Refresh Digest</span>
        <ChevronRightIcon size={15} style={{ color: "var(--text-muted)" }} />
      </button>
    </div>
  );
}
