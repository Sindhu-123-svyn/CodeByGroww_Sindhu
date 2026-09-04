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
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13.5 }}>
        <thead>
          <tr style={{ textAlign: "left", background: "var(--gray-50)" }}>
            <th style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: 12 }}>Type</th>
            <th style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: 12 }}>Detail</th>
            <th style={{ padding: "9px 14px", fontWeight: 600, color: "var(--text-muted)", fontSize: 12 }}>Effective</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((action, i) => (
            <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
              <td style={{ padding: "9px 14px", textTransform: "capitalize", fontWeight: 550 }}>{action.action_type}</td>
              <td className="mono" style={{ padding: "9px 14px" }}>
                {action.ratio ? `${action.ratio}-for-1 split` : action.amount ? `$${action.amount}` : "—"}
              </td>
              <td style={{ padding: "9px 14px", color: "var(--text-secondary)" }}>{formatDate(action.effective_date)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
