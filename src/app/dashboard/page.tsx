import { AppShell } from "@/components/layout/app-shell";
import { DashboardDataSection } from "@/components/dashboard/dashboard-data-section";
import { requireWorkspace } from "@/lib/auth/require-user";
import { formatGreetingSubject, getGreetingForSeoulTime } from "@/lib/presentation/greeting";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";
import { listConsultations, toConsultation } from "@/lib/consultations/consultation-repository";
import { listTodos } from "@/lib/dashboard/todo-repository";
import { CurrentWeather } from "@/components/dashboard/current-weather";
import { listTodayFollowups } from "@/lib/consultations/quote-followup-repository";
import { seoulDateKey } from "@/lib/consultations/reservation-time";

function getKoreanDate() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date());
}

export default async function DashboardPage() {
  const context = await requireWorkspace();
  const identity = toWorkspaceIdentity(context);
  const greetingSubject = formatGreetingSubject(identity.displayName, identity.jobTitle);
  const greeting = getGreetingForSeoulTime();
  const consultations=(await listConsultations(context.workspace.id)).map(toConsultation);
  return (
    <AppShell identity={identity}>
      <section className="welcome-section">
        <div>
          <p className="eyebrow">INTERIOR WORKSPACE</p>
          <h1>{greetingSubject}, {greeting}</h1>
          <p className="today">오늘은 {getKoreanDate()}</p>
        </div>
        <CurrentWeather />
      </section>
      <DashboardDataSection consultations={consultations} todos={await listTodos(context.workspace.id,context.user.id)} todayFollowups={await listTodayFollowups(context.workspace.id,seoulDateKey(new Date()))}/>
    </AppShell>
  );
}
