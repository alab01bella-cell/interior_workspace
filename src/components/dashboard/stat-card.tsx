import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ConsultationStatus } from "@/types/consultation";

export function StatCard({ label, count, icon: Icon, featured }: { label: ConsultationStatus; count: number | null; icon: LucideIcon; featured?: boolean }) {
  return (
    <Link className={`stat-card${featured ? " stat-card--featured" : ""}`} href={`/consultations?status=${encodeURIComponent(label)}`}>
      <div className="stat-card-label">
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p>
        <strong>{count === null ? <span className="stat-skeleton" aria-label="불러오는 중" /> : count}</strong>
        {count !== null && <span>건</span>}
      </p>
      <span className="stat-card-link-icon" aria-label={`${label} 내역 보기`}>
        <ArrowUpRight />
      </span>
    </Link>
  );
}
