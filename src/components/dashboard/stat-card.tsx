import { ArrowUpRight } from "lucide-react";
import type { DashboardStat } from "@/types/dashboard";

export function StatCard({ label, count, icon: Icon, featured }: DashboardStat) {
  return (
    <article className={`stat-card${featured ? " stat-card--featured" : ""}`}>
      <div className="stat-card-label">
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </div>
      <p>
        <strong>{count}</strong>
        <span>건</span>
      </p>
      <button aria-label={`${label} 내역 보기`} type="button">
        <ArrowUpRight />
      </button>
    </article>
  );
}
