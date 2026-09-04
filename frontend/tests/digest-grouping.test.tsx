import { describe, it, expect, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "./test-utils";
import { DigestGroup } from "../src/components/digest/DigestGroup";
import { SEVERITY_ORDER } from "../src/api/types";
import type { DigestEntry, Severity, SymbolOut } from "../src/api/types";

vi.mock("../src/api/watchlists", () => ({
  acknowledgeItem: vi.fn().mockResolvedValue({}),
  acknowledgeAll: vi.fn().mockResolvedValue([]),
}));

function makeSymbol(ticker: string): SymbolOut {
  return { id: `sym-${ticker}`, ticker, exchange_code: "NASDAQ", name: `${ticker} Inc.`, status: "active" };
}

function makeEntry(ticker: string, overrides: Partial<DigestEntry> = {}): DigestEntry {
  return {
    watchlist_item_id: `item-${ticker}`,
    symbol: makeSymbol(ticker),
    last_viewed_at: null,
    latest_quote: null,
    baseline_status: "ready",
    events_since_last_view: [],
    attention_score: 0,
    ...overrides,
  };
}

describe("DigestGroup rendering (design §1.3/§1.4 grouping contract)", () => {
  it("renders severity groups in the backend's fixed order: major -> notable -> minor -> no_change", () => {
    const groups: Record<Severity, DigestEntry[]> = {
      major: [makeEntry("AAAA")],
      notable: [makeEntry("BBBB")],
      minor: [makeEntry("CCCC")],
      no_change: [makeEntry("DDDD")],
    };

    const { container } = renderWithProviders(
      <>
        {SEVERITY_ORDER.map((sev) => (
          <DigestGroup
            key={sev}
            severity={sev}
            entries={groups[sev]}
            watchlistId="wl-1"
            defaultCollapsed={sev === "no_change"}
          />
        ))}
      </>,
    );

    const html = container.innerHTML;
    const posA = html.indexOf("AAAA");
    const posB = html.indexOf("BBBB");
    const posC = html.indexOf("CCCC");
    expect(posA).toBeGreaterThan(-1);
    expect(posB).toBeGreaterThan(posA);
    expect(posC).toBeGreaterThan(posB);
  });

  it("no_change group is collapsed by default — its entries are not rendered", () => {
    renderWithProviders(
      <DigestGroup severity="no_change" entries={[makeEntry("ZZZZ")]} watchlistId="wl-1" defaultCollapsed />,
    );
    expect(screen.queryByText("ZZZZ")).not.toBeInTheDocument();
  });

  it("a non-collapsed group renders its entries", () => {
    renderWithProviders(<DigestGroup severity="major" entries={[makeEntry("QQQQ")]} watchlistId="wl-1" />);
    expect(screen.getByText("QQQQ")).toBeInTheDocument();
  });

  it('shows the "building baseline" banner even when there are zero events (never a false no-change)', () => {
    const entry = makeEntry("BLDG", { baseline_status: "building", events_since_last_view: [] });
    renderWithProviders(<DigestGroup severity="minor" entries={[entry]} watchlistId="wl-1" />);
    expect(screen.getByText(/Building baseline/i)).toBeInTheDocument();
  });

  it("does not show the building banner for a ready baseline", () => {
    const entry = makeEntry("RDY", { baseline_status: "ready" });
    renderWithProviders(<DigestGroup severity="minor" entries={[entry]} watchlistId="wl-1" />);
    expect(screen.queryByText(/Building baseline/i)).not.toBeInTheDocument();
  });
});
