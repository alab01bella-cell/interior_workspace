import type { Metadata } from "next";
import Link from "next/link";
import { CloudSun } from "lucide-react";
import { DashboardDataSection } from "@/components/dashboard/dashboard-data-section";
import { demoConsultations } from "@/lib/demo/demo-consultations-data";
import { demoTodoItems, demoWorkspace } from "@/lib/demo/demo-dashboard-data";
import { formatGreetingSubject, getGreetingForSeoulTime } from "@/lib/presentation/greeting";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "제품 체험 | Interior Workspace",
  description: "가상 상담 데이터로 Interior Workspace 대시보드를 체험합니다.",
};

export default function DemoPage() {
  const greetingSubject = formatGreetingSubject("OO");
  const greeting = getGreetingForSeoulTime();
  return (
    <main className="demo-page">
      <header className="demo-header">
        <Link className="demo-brand" href="/demo"><strong>Interior</strong> Workspace</Link>
        <nav aria-label="데모 시작 메뉴">
          <Link href="/consult/demo">체크리스트 체험하기</Link>
          <Link className="demo-primary-action" href="/">Google 계정으로 시작하기</Link>
        </nav>
      </header>
      <div className="demo-content">
        <div className="demo-notice" role="note">체험용 데이터이며 실제 데이터가 아닙니다.</div>
        <section className="welcome-section">
          <div>
            <p className="eyebrow">{demoWorkspace.name.toUpperCase()}</p>
            <h1>{greetingSubject}, {greeting}</h1>
            <p className="today">공개 제품 체험 화면</p>
          </div>
          <div className="weather-card" aria-label="체험용 날씨 정보">
            <CloudSun aria-hidden="true" /><strong>28°</strong>
            <div><p>{demoWorkspace.location}</p><span>체험용 날씨</span></div>
          </div>
        </section>
        <DashboardDataSection consultations={demoConsultations} todos={demoTodoItems} demo />
      </div>
    </main>
  );
}
