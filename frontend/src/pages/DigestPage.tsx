import { Link, useSearchParams } from "react-router-dom";
import { useWatchlists } from "../hooks/useWatchlists";
import { useDigest } from "../hooks/useDigest";
import { DigestHero } from "../components/digest/DigestHero";
import { DigestGroup } from "../components/digest/DigestGroup";
import { AcknowledgeAllButton } from "../components/digest/AcknowledgeAllButton";
import { MarketOverviewPanel } from "../components/digest/MarketOverviewPanel";
import { QuickActionsCard } from "../components/digest/QuickActionsCard";
import { InsightCard } from "../components/digest/InsightCard";
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

  const { data: digest, isLoading, isFetching, error, refetch } = digestQuery;
  const totalEntries = digest ? SEVERITY_ORDER.reduce((n, sev) => n + (digest.groups[sev]?.length ?? 0), 0) : 0;
  const firstNonEmptySeverity = digest
    ? SEVERITY_ORDER.find((s) => (digest.groups[s]?.length ?? 0) > 0)
    : undefined;
  const hasMajor = (digest?.groups.major?.length ?? 0) > 0;

  return (
    <div>
      <DigestHero groups={digest?.groups} watchlistName={activeWatchlist?.name} />

      {watchlists.length > 1 && (
        <div className="tab-row" style={{ marginBottom: 18, marginTop: 24 }}>
          {watchlists.map((wl) => (
            <button
              key={wl.id}
              className={`tab ${wl.id === activeId ? "tab-active" : ""}`}
              onClick={() => setSearchParams({ watchlist_id: wl.id })}
            >
              {wl.name}
            </button>
          ))}
        </div>
      )}

      {watchlists.length === 1 && <div style={{ marginTop: 24 }} />}

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
          {digest && activeId && totalEntries > 0 && (
            <div className="digest-layout">
              <div className="digest-main">
                {SEVERITY_ORDER.map((severity) => (
                  <DigestGroup
                    key={severity}
                    severity={severity}
                    entries={digest.groups[severity] ?? []}
                    watchlistId={activeId}
                    defaultCollapsed={severity === "no_change"}
                    action={severity === firstNonEmptySeverity ? <AcknowledgeAllButton watchlistId={activeId} /> : undefined}
                  />
                ))}
              </div>
              <aside className="digest-sidebar">
                <MarketOverviewPanel watchlistId={activeId} />
                <InsightCard hasMajor={hasMajor} />
                <QuickActionsCard onRefresh={() => refetch()} refreshing={isFetching} />
              </aside>
            </div>
          )}
        </>
      )}
    </div>
  );
}
