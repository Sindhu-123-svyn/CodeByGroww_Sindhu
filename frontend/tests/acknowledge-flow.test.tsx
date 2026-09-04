import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./test-utils";
import { DigestEntryCard } from "../src/components/digest/DigestEntryCard";
import type { DigestEntry } from "../src/api/types";

const acknowledgeItemMock = vi.fn().mockResolvedValue({});

vi.mock("../src/api/watchlists", () => ({
  acknowledgeItem: (...args: unknown[]) => acknowledgeItemMock(...args),
}));

const entry: DigestEntry = {
  watchlist_item_id: "item-1",
  symbol: { id: "sym-1", ticker: "AAPL", exchange_code: "NASDAQ", name: "Apple Inc.", status: "active" },
  last_viewed_at: "2026-09-01T00:00:00Z",
  latest_quote: { price: 188.5, volume: 142_000_000, tick_time: "2026-09-03T09:58:29Z", source: "yfinance", is_stale: false },
  baseline_status: "ready",
  events_since_last_view: [
    { event_type: "price_shock", severity: "major", score: 9.8, event_time: "2026-09-03T09:58:29Z", why: "price moved 5.4 std-devs", details: {} },
  ],
  attention_score: 9.8,
};

describe("Acknowledge is never automatic (design §1.4)", () => {
  it("does NOT call the acknowledge endpoint just from mounting/rendering the digest entry", async () => {
    renderWithProviders(<DigestEntryCard entry={entry} watchlistId="wl-1" />);

    // Give any stray effect a chance to fire before asserting it didn't.
    await new Promise((r) => setTimeout(r, 50));

    expect(acknowledgeItemMock).not.toHaveBeenCalled();
  });

  it("DOES call acknowledge only after the user explicitly clicks Mark as read", async () => {
    const user = userEvent.setup();
    renderWithProviders(<DigestEntryCard entry={entry} watchlistId="wl-1" />);

    expect(acknowledgeItemMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /mark as read/i }));

    await waitFor(() => {
      expect(acknowledgeItemMock).toHaveBeenCalledTimes(1);
      expect(acknowledgeItemMock).toHaveBeenCalledWith("wl-1", "item-1", undefined);
    });
  });
});
