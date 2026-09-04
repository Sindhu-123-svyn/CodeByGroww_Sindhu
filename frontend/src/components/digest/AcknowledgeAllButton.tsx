import { useAcknowledgeAll } from "../../hooks/useAcknowledge";
import { CheckCircleIcon } from "../shared/Icons";

export function AcknowledgeAllButton({ watchlistId }: { watchlistId: string }) {
  const acknowledgeAll = useAcknowledgeAll();

  return (
    <button
      className="btn"
      disabled={acknowledgeAll.isPending}
      onClick={() => acknowledgeAll.mutate({ watchlistId })}
    >
      {acknowledgeAll.isPending ? <span className="spinner" /> : <CheckCircleIcon size={14} />}
      {acknowledgeAll.isPending ? "Marking…" : "Mark all as read"}
    </button>
  );
}
