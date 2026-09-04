import { describe, it, expect, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "./test-utils";
import { SymbolSearchTypeahead } from "../src/components/watchlist/SymbolSearchTypeahead";
import { ApiError } from "../src/api/errors";
import type { SymbolOut } from "../src/api/types";

const activeSymbol: SymbolOut = {
  id: "sym-aapl",
  ticker: "AAPL",
  exchange_code: "NASDAQ",
  name: "Apple Inc.",
  status: "active",
};
const delistedSymbol: SymbolOut = {
  id: "sym-sivb",
  ticker: "SIVB",
  exchange_code: "NASDAQ",
  name: "SVB Financial Group",
  status: "delisted",
};

const searchSymbolsMock = vi.fn().mockResolvedValue([activeSymbol, delistedSymbol]);
const validateSymbolMock = vi.fn(async (id: string) => {
  if (id === delistedSymbol.id) {
    throw new ApiError(409, "symbol is delisted and cannot be added to a watchlist");
  }
  return { valid: true as const };
});

vi.mock("../src/api/symbols", () => ({
  searchSymbols: (...args: unknown[]) => searchSymbolsMock(...args),
  validateSymbol: (...args: unknown[]) => validateSymbolMock(...args),
}));

describe("Symbol search + delisted pre-check (design §3.8)", () => {
  it("renders an active result as addable, and a delisted result disabled with its reason", async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();
    renderWithProviders(<SymbolSearchTypeahead onAdd={onAdd} />);

    await user.type(screen.getByPlaceholderText(/search ticker/i), "A");

    await waitFor(() => expect(screen.getByText("AAPL")).toBeInTheDocument(), { timeout: 1000 });
    await waitFor(() => expect(validateSymbolMock).toHaveBeenCalledTimes(2), { timeout: 1000 });

    const addButtons = await screen.findAllByRole("button", { name: /add/i });
    expect(addButtons).toHaveLength(2);

    // Active symbol's Add button is enabled.
    expect(addButtons[0]).toBeEnabled();

    // Delisted symbol's Add button is disabled, with the reason shown.
    await waitFor(() => expect(addButtons[1]).toBeDisabled());
    expect(screen.getByText(/delisted/i)).toBeInTheDocument();

    await user.click(addButtons[0]);
    expect(onAdd).toHaveBeenCalledWith(activeSymbol.id);
  });
});
