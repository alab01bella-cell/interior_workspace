import Link from "next/link";
import { MessageCircleMore } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/consultations/status-badge";

export function ScheduleCard({ consultations, detailLinksEnabled }: { consultations: Consultation[]; detailLinksEnabled: boolean }) {
  return (
    <Card className="schedule-card">
      <div className="panel-title">
        <MessageCircleMore aria-hidden="true" />
        <h2>오늘 상담 일정</h2>
      </div>
      <div className="schedule-list">
        {consultations.map((consultation) => {
          const content = <>
            <time>{consultation.visitTime || "시간 미정"}</time>
            <span className="schedule-dot" aria-hidden="true" />
            <div>
              <strong>{consultation.customerName} 고객님 <StatusBadge status={consultation.status} /></strong>
              <p>{consultation.region} · {consultation.areaSize}</p>
            </div>
          </>;
          return detailLinksEnabled
            ? <Link className="schedule-item" href={`/consultations/${encodeURIComponent(consultation.id)}`} key={consultation.id}>{content}</Link>
            : <div className="schedule-item" key={consultation.id}>{content}</div>;
        })}
        {consultations.length === 0 && <p className="dashboard-empty">오늘 예정된 상담이 없습니다.</p>}
      </div>
      <Link className="text-link" href="/consultations">전체보기 <span>›</span></Link>
    </Card>
  );
}
