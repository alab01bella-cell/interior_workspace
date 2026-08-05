"use client";

import { useEffect, useState } from "react";
import { CalendarClock, CircleCheckBig, FilePenLine, Handshake } from "lucide-react";
import {
  getAllConsultations,
  getConsultationStatusCounts,
  getRecentConsultations,
  getTodayConsultations,
  type ConsultationStatusCounts,
} from "@/lib/consultations/consultation-selectors";
import type { Consultation } from "@/types/consultation";
import { CalendarCard } from "./calendar-card";
import { RecentConsultationsCard } from "./recent-consultations-card";
import { ScheduleCard } from "./schedule-card";
import { StatCard } from "./stat-card";

interface DashboardData {
  counts: ConsultationStatusCounts;
  today: Consultation[];
  recent: Consultation[];
}

const statMeta = [
  { label: "접수" as const, icon: FilePenLine, featured: true },
  { label: "예약" as const, icon: CalendarClock },
  { label: "완료" as const, icon: CircleCheckBig },
  { label: "계약" as const, icon: Handshake },
];

export function DashboardDataSection() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const consultations = getAllConsultations();
      setData({
        counts: getConsultationStatusCounts(consultations),
        today: getTodayConsultations(consultations),
        recent: getRecentConsultations(consultations),
      });
    });
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <>
      <section className="stats-grid" aria-label="상담 현황">
        {statMeta.map((stat) => <StatCard {...stat} count={data?.counts[stat.label] ?? null} key={stat.label} />)}
      </section>
      <section className="dashboard-grid">
        <div className="dashboard-column">
          <ScheduleCard consultations={data?.today ?? null} />
          <RecentConsultationsCard consultations={data?.recent ?? null} />
        </div>
        <CalendarCard />
      </section>
    </>
  );
}
