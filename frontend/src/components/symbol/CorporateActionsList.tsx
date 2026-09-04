import { formatDate } from "../../lib/formatters";
import type { CorporateActionOut } from "../../api/types";

/** Explains a large historical price jump isn't a false alarm — e.g. a
 * stock split (design §3.6). */
export function CorporateActionsList({ actions }: { actions: CorporateActionOut[] }) {
  if (actions.length === 0) {
    return <p className="muted">No corporate actions on record.</p>;
  }

  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <div style={{ overflowX: "auto" }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Detail</th>
              <th>Effective</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((action, i) => (
              <tr key={i}>
                <td style={{ textTransform: "capitalize", fontWeight: 550 }}>{action.action_type}</td>
                <td className="mono">{action.ratio ? `${action.ratio}-for-1 split` : action.amount ? `$${action.amount}` : "—"}</td>
                <td style={{ color: "var(--text-secondary)" }}>{formatDate(action.effective_date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
