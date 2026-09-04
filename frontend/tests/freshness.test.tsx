import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FreshnessBadge } from "../src/components/shared/FreshnessBadge";
import type { LatestQuoteOut } from "../src/api/types";

describe("FreshnessBadge (design §3.1 / §3.5)", () => {
  it("shows a distinct waiting state when there is no quote yet — never blank/zero", () => {
    render(<FreshnessBadge quote={null} />);
    expect(screen.getByText(/waiting for first price update/i)).toBeInTheDocument();
  });

  it("shows a stale badge for a stale quote, never presented as live", () => {
    const quote: LatestQuoteOut = {
      price: 100,
      volume: 1000,
      tick_time: new Date(Date.now() - 10 * 60_000).toISOString(),
      source: "yfinance",
      is_stale: true,
    };
    render(<FreshnessBadge quote={quote} />);
    expect(screen.getByText(/stale/i)).toBeInTheDocument();
  });

  it("shows a plain freshness label for a live quote, with no 'stale' text", () => {
    const quote: LatestQuoteOut = {
      price: 100,
      volume: 1000,
      tick_time: new Date().toISOString(),
      source: "yfinance",
      is_stale: false,
    };
    render(<FreshnessBadge quote={quote} />);
    expect(screen.queryByText(/stale/i)).not.toBeInTheDocument();
    expect(screen.getByText(/ago|just now/i)).toBeInTheDocument();
  });
});
