import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ConsultationStatus } from "@/types/consultation";

export function StatCard({ label, count, icon: Icon, featured, demo = false }: { label: ConsultationStatus; count: number; icon: LucideIcon; featured?: boolean; demo?: boolean }) {
  return (
    <Link className={`stat-card${featured ? " stat-card--featured" : ""}`} href={demo ? "/login" : `/consultations?status=${encodeURIComponent(label)}`}>
      <div className="stat-card-label">
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p>
        <strong>{count}</strong><span>건</span>
      </p>
      <span className="stat-card-link-icon" aria-label={`${label} 내역 보기`}>
        <ArrowUpRight />
      </span>
    </Link>
  );
}
