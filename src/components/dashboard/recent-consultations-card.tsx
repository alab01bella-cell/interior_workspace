import Link from "next/link";
import { History } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/consultations/status-badge";

const formatReceivedAt = (value: string) => new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit", day: "2-digit",
}).format(new Date(value));

export function RecentConsultationsCard({ consultations, detailLinksEnabled }: { consultations: Consultation[]; detailLinksEnabled: boolean }) {
  return (
    <Card className="recent-card">
      <div className="panel-title"><History aria-hidden="true" /><h2>최근 접수 상담</h2></div>
      <div className="recent-list">
        {consultations.map((consultation) => {
          const content = <>
            <div><strong>{consultation.customerName}</strong><p>{consultation.region} · {consultation.areaSize}</p></div>
            <div><StatusBadge status={consultation.status} /><time>{formatReceivedAt(consultation.receivedAt)}</time></div>
          </>;
          return detailLinksEnabled
            ? <Link className="recent-item" href={`/consultations/${encodeURIComponent(consultation.id)}`} key={consultation.id}>{content}</Link>
            : <div className="recent-item" key={consultation.id}>{content}</div>;
        })}
        {consultations.length === 0 && <p className="dashboard-empty">아직 등록된 상담이 없습니다.</p>}
      </div>
      <Link className="text-link" href="/consultations">전체보기 <span>›</span></Link>
    </Card>
  );
}
