import { MessageCircleMore } from "lucide-react";
import { todayConsultations } from "@/lib/mock/dashboard-data";
import { Card } from "@/components/ui/card";

export function ScheduleCard() {
  return (
    <Card className="schedule-card">
      <div className="panel-title">
        <MessageCircleMore aria-hidden="true" />
        <h2>오늘 상담 일정</h2>
      </div>
      <div className="schedule-list">
        {todayConsultations.map((consultation) => (
          <article className="schedule-item" key={consultation.id}>
            <time>{consultation.time}</time>
            <span className="schedule-dot" aria-hidden="true" />
            <div>
              <strong>{consultation.customerName} 고객님</strong>
              <p>{consultation.summary}</p>
            </div>
          </article>
        ))}
      </div>
      <button className="text-link" type="button">전체보기 <span>›</span></button>
    </Card>
  );
}
