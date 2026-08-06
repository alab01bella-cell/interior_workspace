import { CalendarClock, CircleCheckBig, FilePenLine, Handshake } from "lucide-react";
import type { Consultation, ConsultationStatus } from "@/types/consultation";
import type { TodoItem } from "@/types/dashboard";
import { CalendarCard } from "./calendar-card";
import { RecentConsultationsCard } from "./recent-consultations-card";
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
  const recent = [...consultations]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, 5);
  const today = demo
    ? consultations.filter((consultation) => consultation.visitDate === "2026-08-04")
    : [];

  return (
    <>
      <section className="stats-grid" aria-label="상담 현황">
        {statMeta.map((stat) => <StatCard {...stat} count={counts[stat.label]} demo={demo} key={stat.label} />)}
      </section>
      <section className="dashboard-grid">
        <div className="dashboard-column">
          <ScheduleCard consultations={today} detailLinksEnabled={!demo} />
          <RecentConsultationsCard consultations={recent} detailLinksEnabled={!demo} />
        </div>
        <div className="dashboard-column">
          <CalendarCard consultations={consultations} demo={demo} />
          <TodoCard initialItems={todos} />
        </div>
      </section>
    </>
  );
}
