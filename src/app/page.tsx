import { CloudSun } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { CalendarCard } from "@/components/dashboard/calendar-card";
import { ScheduleCard } from "@/components/dashboard/schedule-card";
import { StatCard } from "@/components/dashboard/stat-card";
import { TodoCard } from "@/components/dashboard/todo-card";
import { dashboardStats, mockUser } from "@/lib/mock/dashboard-data";

function getKoreanDate() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="welcome-section">
        <div>
          <p className="eyebrow">INTERIOR WORKSPACE</p>
          <h1>{mockUser.name}님, 좋은 아침입니다.</h1>
          <p className="today">오늘은 {getKoreanDate()}</p>
        </div>
        <div className="weather-card" aria-label="부산광역시 재송동 날씨 28도, 강수확률 20퍼센트">
          <CloudSun aria-hidden="true" />
          <strong>28°</strong>
          <div>
            <p>{mockUser.location}</p>
            <span>강수확률 20%</span>
          </div>
        </div>
      </section>

      <section className="stats-grid" aria-label="상담 현황">
        {dashboardStats.map((stat) => <StatCard {...stat} key={stat.label} />)}
      </section>

      <section className="dashboard-grid">
        <div className="dashboard-column">
          <ScheduleCard />
          <TodoCard />
        </div>
        <CalendarCard />
      </section>
    </AppShell>
  );
}
