import Link from "next/link";
import { History } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/consultations/status-badge";

const formatReceivedAt = (value: string) => new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit", day: "2-digit",
}).format(new Date(value));

export function RecentConsultationsCard({ consultations }: { consultations: Consultation[] | null }) {
  return (
    <Card className="recent-card">
      <div className="panel-title"><History aria-hidden="true" /><h2>최근 접수 상담</h2></div>
      <div className="recent-list">
        {consultations === null && Array.from({ length: 5 }, (_, index) => <span className="dashboard-row-skeleton" key={index} />)}
        {consultations?.map((consultation) => (
          <Link className="recent-item" href={`/consultations/${encodeURIComponent(consultation.id)}`} key={consultation.id}>
            <div><strong>{consultation.customerName}</strong><p>{consultation.region} · {consultation.areaSize}</p></div>
            <div><StatusBadge status={consultation.status} /><time>{formatReceivedAt(consultation.receivedAt)}</time></div>
          </Link>
        ))}
        {consultations?.length === 0 && <p className="dashboard-empty">최근 접수된 상담이 없습니다.</p>}
      </div>
      <Link className="text-link" href="/consultations">전체보기 <span>›</span></Link>
    </Card>
  );
}
