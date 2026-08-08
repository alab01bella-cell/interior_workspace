import { CalendarClock, CircleCheckBig, FilePenLine, Handshake } from "lucide-react";
import type { Consultation, ConsultationStatus } from "@/types/consultation";
import type { TodoItem } from "@/types/dashboard";
import { CalendarCard } from "./calendar-card";
import { ScheduleCard } from "./schedule-card";
import { StatCard } from "./stat-card";
import { TodoCard } from "./todo-card";

const statMeta = [
  { label: "접수" as const, icon: FilePenLine, featured: true },
  { label: "예약" as const, icon: CalendarClock },
  { label: "완료" as const, icon: CircleCheckBig },
  { label: "계약" as const, icon: Handshake },
];

function statusCounts(consultations: Consultation[]): Record<ConsultationStatus, number> {
  return consultations.reduce<Record<ConsultationStatus, number>>((counts, consultation) => {
    counts[consultation.status] += 1;
    return counts;
  }, { 접수: 0, 예약: 0, 완료: 0, 계약: 0 });
}

export function DashboardDataSection({
  consultations,
  todos,
  demo = false,
}: {
  consultations: Consultation[];
  todos: TodoItem[];
  demo?: boolean;
}) {
  const counts = statusCounts(consultations);
  const todayKey = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date());
  const scheduled=consultations.filter((consultation)=>Boolean(consultation.scheduledAt));
  const today = consultations.filter((consultation) => demo?consultation.visitDate==="2026-08-04":consultation.scheduledAt&&new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(consultation.scheduledAt))===todayKey).sort((a,b)=>(a.scheduledAt??a.visitTime).localeCompare(b.scheduledAt??b.visitTime));

  return (
    <>
      <section className="stats-grid" aria-label="상담 현황">
        {statMeta.map((stat) => <StatCard {...stat} count={counts[stat.label]} demo={demo} key={stat.label} />)}
      </section>
      <section className="dashboard-grid">
        <div className="dashboard-left-column">
          <ScheduleCard consultations={today} detailLinksEnabled={!demo} />
          <TodoCard initialItems={todos} demo={demo}/>
        </div>
        <CalendarCard consultations={demo?consultations:scheduled} demo={demo} />
      </section>
    </>
  );
}
