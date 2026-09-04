import { Link, useSearchParams } from "react-router-dom";
import { useWatchlists } from "../hooks/useWatchlists";
import { useDigest } from "../hooks/useDigest";
import { DigestGroup } from "../components/digest/DigestGroup";
import { AcknowledgeAllButton } from "../components/digest/AcknowledgeAllButton";
import { DigestPageSkeleton } from "../components/shared/Skeleton";
import { ErrorState } from "../components/shared/ErrorState";
import { EmptyState } from "../components/shared/EmptyState";
import { InboxIcon, PlusIcon } from "../components/shared/Icons";
import { SEVERITY_ORDER } from "../api/types";

export function DigestPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: watchlists, isLoading: watchlistsLoading, error: watchlistsError } = useWatchlists();

  const requestedId = searchParams.get("watchlist_id") ?? undefined;
  const activeId = requestedId ?? watchlists?.[0]?.id;
  const activeWatchlist = watchlists?.find((w) => w.id === activeId);

  const digestQuery = useDigest(activeId);

  if (watchlistsLoading) return <DigestPageSkeleton />;
  if (watchlistsError) return <ErrorState error={watchlistsError} />;

  if (!watchlists || watchlists.length === 0) {
    return (
      <EmptyState
        icon={<InboxIcon size={19} />}
        title="You don't have any watchlists yet"
        description="Create one to start seeing a digest of what's changed."
        action={
          <Link to="/watchlists" className="btn btn-primary">
            <PlusIcon size={14} /> Create your first watchlist
          </Link>
        }
      />
    );
  }

  const { data: digest, isLoading, error, refetch } = digestQuery;
  const totalEntries = digest ? SEVERITY_ORDER.reduce((n, sev) => n + (digest.groups[sev]?.length ?? 0), 0) : 0;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <div>
          <span className="eyebrow">Since your last visit</span>
          <h1 style={{ marginTop: 2 }}>Digest</h1>
        </div>
        {activeId && !isLoading && totalEntries > 0 && <AcknowledgeAllButton watchlistId={activeId} />}
      </div>

      {watchlists.length > 1 && (
        <div style={{ display: "flex", gap: 6, marginBottom: 18, marginTop: 14, flexWrap: "wrap" }}>
          {watchlists.map((wl) => (
            <button
              key={wl.id}
              className="btn btn-sm"
              style={{
                borderColor: wl.id === activeId ? "var(--brand-500)" : undefined,
                color: wl.id === activeId ? "var(--brand-700)" : undefined,
                background: wl.id === activeId ? "var(--brand-50)" : undefined,
                fontWeight: wl.id === activeId ? 650 : 500,
              }}
              onClick={() => setSearchParams({ watchlist_id: wl.id })}
            >
              {wl.name}
            </button>
          ))}
        </div>
      )}

      {watchlists.length === 1 && <div style={{ marginBottom: 18 }} />}

      {activeWatchlist?.item_count === 0 && (
        <EmptyState
          icon={<InboxIcon size={19} />}
          title="This watchlist is empty"
          description="Add a symbol to start seeing your digest."
          action={
            <Link to="/watchlists" className="btn btn-primary">
              <PlusIcon size={14} /> Add a symbol
            </Link>
          }
        />
      )}

      {activeWatchlist && activeWatchlist.item_count > 0 && (
        <>
          {isLoading && <DigestPageSkeleton />}
          {error && <ErrorState error={error} onRetry={refetch} />}
          {digest && activeId && totalEntries === 0 && (
            <EmptyState
              icon={<InboxIcon size={19} />}
              title="Nothing to report"
              description="No signals since your last visit — check back later."
            />
          )}
          {digest &&
            activeId &&
            SEVERITY_ORDER.map((severity) => (
              <DigestGroup
                key={severity}
                severity={severity}
                entries={digest.groups[severity] ?? []}
                watchlistId={activeId}
                defaultCollapsed={severity === "no_change"}
              />
            ))}
        </>
      )}
    </div>
  );
}
