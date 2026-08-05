import type { ConsultationStatus } from "@/types/consultation";

export function StatusBadge({ status }: { status: ConsultationStatus }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}
