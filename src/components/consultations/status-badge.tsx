import type { ConsultationStatus } from "@/types/consultation";

export function StatusBadge({ status }: { status: ConsultationStatus | "불성사" }) {
  return <span className={`status-badge status-${status}`}>{status}</span>;
}
