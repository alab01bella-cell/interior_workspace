import { AppShell } from "@/components/layout/app-shell";
import { DashboardDataSection } from "@/components/dashboard/dashboard-data-section";
import { requireWorkspace } from "@/lib/auth/require-user";
import { formatGreetingSubject, getGreetingForSeoulTime } from "@/lib/presentation/greeting";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

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
  return (
    <AppShell identity={identity}>
      <section className="welcome-section">
        <div>
          <p className="eyebrow">INTERIOR WORKSPACE</p>
          <h1>{greetingSubject}, {greeting}</h1>
          <p className="today">오늘은 {getKoreanDate()}</p>
        </div>
      </section>
      <DashboardDataSection consultations={[]} todos={[]} />
    </AppShell>
  );
}
