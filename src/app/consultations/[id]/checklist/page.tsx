import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { buildChecklistDocument, formatChecklistAnswer } from "@/lib/checklist/checklist-answer-document";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { consultationDetailPath } from "@/lib/consultations/consultation-routes";
import { formatConsultationRegion } from "@/lib/consultations/region-display";
import { seoulDateKey } from "@/lib/consultations/reservation-time";
import { requireWorkspace } from "@/lib/auth/require-user";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function ConsultationChecklistRoute({ params }: { params: Promise<{ id: string }> }) {
  const context = await requireWorkspace();
  const record = await findConsultation(context.workspace.id, (await params).id);
  if (!record) notFound();
  const sections = buildChecklistDocument(record.formVersion, record.answers);

  return <AppShell identity={toWorkspaceIdentity(context)}>
    <main className="checklist-document-page">
      <header className="checklist-document-header">
        <div>
          <p>CONSULTATION SHEET</p>
          <h1>{record.clientName} 고객님의 상담지</h1>
          <dl>
            <div><dt>접수일</dt><dd>{seoulDateKey(record.submittedAt).replaceAll("-", ".")}</dd></div>
            <div><dt>지역</dt><dd>{formatConsultationRegion(record.region)}</dd></div>
            <div><dt>평수</dt><dd>{record.area}</dd></div>
          </dl>
        </div>
        <Link href={consultationDetailPath(record.id)}>고객 상세로 돌아가기</Link>
      </header>
      <article className="checklist-document">
        {sections.map((section, index) => <section key={section.title}>
          <header><span>{String(index + 1).padStart(2, "0")}</span><h2>{section.title}</h2></header>
          <dl>{section.fields.map((field) => <div key={field.name}>
            <dt>{field.label}</dt>
            <dd>{formatChecklistAnswer(field.name, field.value)}</dd>
          </div>)}</dl>
        </section>)}
        {!sections.length && <p className="checklist-document-empty">제출된 답변이 없습니다.</p>}
      </article>
      <footer className="checklist-document-version">제출 양식 버전 · {record.formVersion}</footer>
    </main>
  </AppShell>;
}
