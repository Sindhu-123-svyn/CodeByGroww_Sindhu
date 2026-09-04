import { useAcknowledgeItem } from "../../hooks/useAcknowledge";
import { CheckCircleIcon } from "../shared/Icons";

/** Only ever wired to an onClick — never to a mount/view effect. That is
 * the entire point of design §1.4: viewing the digest must never itself
 * mark it seen. */
export function AcknowledgeButton({ watchlistId, itemId }: { watchlistId: string; itemId: string }) {
  const acknowledge = useAcknowledgeItem();

  return (
    <button
      className="btn btn-sm"
      disabled={acknowledge.isPending}
      onClick={() => acknowledge.mutate({ watchlistId, itemId })}
    >
      {acknowledge.isPending ? <span className="spinner" /> : <CheckCircleIcon size={13} />}
      {acknowledge.isPending ? "Marking…" : "Mark as read"}
    </button>
  );
}
