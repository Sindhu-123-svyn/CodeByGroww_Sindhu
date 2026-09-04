import { useState } from "react";
import { useSymbolSearch } from "../../hooks/useSymbolSearch";
import * as symbolsApi from "../../api/symbols";
import { ApiError } from "../../api/errors";
import { AlertTriangleIcon, PlusIcon, SearchIcon } from "../shared/Icons";
import { SymbolAvatar } from "../shared/SymbolAvatar";
import type { SymbolOut } from "../../api/types";

interface ValidatedSymbol {
  symbol: SymbolOut;
  valid: boolean;
  reason?: string;
}

/**
 * Typeahead + delisted pre-check (design §3.8: "reject unknown/delisted
 * tickers early with a clear error, not a silent empty state later").
 * Each result is validated via GET /symbols/{id}/validate as soon as it's
 * shown, so a delisted symbol renders disabled with its reason inline
 * instead of only failing after the user clicks Add.
 */
export function SymbolSearchTypeahead({
  onAdd,
  addError,
}: {
  onAdd: (symbolId: string) => void;
  addError?: string | null;
}) {
  const [query, setQuery] = useState("");
  const { data: results, isLoading } = useSymbolSearch(query);
  const [validated, setValidated] = useState<Record<string, ValidatedSymbol>>({});

  async function ensureValidated(symbol: SymbolOut) {
    if (validated[symbol.id]) return;
    try {
      await symbolsApi.validateSymbol(symbol.id);
      setValidated((prev) => ({ ...prev, [symbol.id]: { symbol, valid: true } }));
    } catch (err) {
      const reason = err instanceof ApiError ? err.message : "Unavailable";
      setValidated((prev) => ({ ...prev, [symbol.id]: { symbol, valid: false, reason } }));
    }
  }

  return (
    <div>
      <div style={{ position: "relative" }}>
        <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)" }}>
          <SearchIcon size={15} />
        </span>
        <input
          type="text"
          placeholder="Search ticker or company name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{ paddingLeft: 34 }}
        />
      </div>
      {isLoading && query.trim() && (
        <p className="muted" style={{ marginTop: 8 }}>
          Searching…
        </p>
      )}
      {addError && (
        <p className="error-text" style={{ marginTop: 8 }}>
          <AlertTriangleIcon size={13} /> {addError}
        </p>
      )}
      {results && results.length > 0 && (
        <ul style={{ listStyle: "none", padding: 0, marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
          {results.map((symbol) => {
            const v = validated[symbol.id];
            if (!v) {
              // Fire-and-forget validation as soon as the row renders.
              ensureValidated(symbol);
            }
            const isInvalid = v && !v.valid;
            return (
              <li
                key={symbol.id}
                className="card card-interactive"
                style={{
                  padding: "10px 12px",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 10,
                  opacity: isInvalid ? 0.65 : 1,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <SymbolAvatar ticker={symbol.ticker} size="sm" />
                  <div style={{ minWidth: 0 }}>
                    <span className="mono" style={{ fontWeight: 700 }}>
                      {symbol.ticker}
                    </span>{" "}
                    <span className="muted">{symbol.name}</span>
                    {isInvalid && (
                      <div className="error-text" style={{ marginTop: 2 }}>
                        <AlertTriangleIcon size={12} /> {v.reason}
                      </div>
                    )}
                  </div>
                </div>
                <button className="btn btn-primary btn-sm" disabled={isInvalid} onClick={() => onAdd(symbol.id)} style={{ flex: "none" }}>
                  <PlusIcon size={13} /> Add
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {results && results.length === 0 && query.trim() && (
        <p className="muted" style={{ marginTop: 8 }}>
          No matching symbols.
        </p>
      )}
    </div>
  );
}
