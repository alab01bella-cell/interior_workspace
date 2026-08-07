import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/consultations/status-badge";
import { requireWorkspace } from "@/lib/auth/require-user";
import { checklistAnswerSections } from "@/lib/checklist/checklist-data";
import { findConsultation, toConsultation } from "@/lib/consultations/consultation-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";
import { listConsultationFiles } from "@/lib/consultations/consultation-file-repository";

const display=(value:unknown)=>Array.isArray(value)?value.join(", "):typeof value==="boolean"?(value?"동의":"미동의"):String(value??"")||"-";

export default async function ConsultationDetailRoute({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{driveFile?:string}>}) {
  const context=await requireWorkspace();
  const record=await findConsultation(context.workspace.id,(await params).id);
  if(!record) notFound();
  const consultation=toConsultation(record);
  const files=await listConsultationFiles(context.workspace.id,record.id);
  const original=files.find(file=>file.fileCategory==="CHECKLIST_ORIGINAL");

  return (
    <AppShell identity={toWorkspaceIdentity(context)}>
      <section className="consultation-detail consultation-detail-page">
        {(await searchParams).driveFile==="missing"&&<p className="file-missing-notice">Drive에서 파일을 찾을 수 없습니다.</p>}
        <header><div><p className="eyebrow">CONSULTATION</p><h1>{consultation.customerName} 고객님 상담</h1></div><StatusBadge status={consultation.status}/></header>
        <dl className="detail-summary">
          <div><dt>연락 방법</dt><dd>{record.contactMethod} · {record.contactValue}</dd></div>
          <div><dt>현장</dt><dd>{consultation.fullAddress} · {record.area}</dd></div>
          <div><dt>접수일</dt><dd>{new Date(record.submittedAt).toLocaleString("ko-KR")}</dd></div>
          <div><dt>외부 동기화</dt><dd>{record.externalSyncStatus}</dd></div>
        </dl>
        <div className="detail-actions">
          {record.driveFolderId&&<a href={`https://drive.google.com/drive/folders/${encodeURIComponent(record.driveFolderId)}`} target="_blank" rel="noreferrer">고객 폴더 열기</a>}
          {original&&<a href={`/api/consultations/${record.id}/files/${original.id}/open`} target="_blank" rel="noreferrer">인쇄용 원본 PDF</a>}
          {context.membership.role==="OWNER"&&record.externalSyncStatus!=="SYNCED"&&<form action={`/api/consultations/${encodeURIComponent(record.id)}/sync`} method="post"><button type="submit">다시 동기화</button></form>}
        </div>
        {checklistAnswerSections.map((section)=><article className="detail-section" key={section.title}><h2>{section.title}</h2><dl>{section.fields.filter((field)=>field.kind!=="files").map((field)=><div key={field.name}><dt>{field.label}</dt><dd>{display(record.answers[field.name])}</dd></div>)}</dl></article>)}
        <nav className="detail-file-links" aria-label="상담 파일 관리"><a href={`/images?consultation=${encodeURIComponent(record.id)}`}>이미지 {files.filter(file=>file.fileCategory==="FIELD_PHOTO"||file.fileCategory==="BEFORE"||file.fileCategory==="AFTER").length}개 ›</a><a href={`/documents?consultation=${encodeURIComponent(record.id)}`}>서류 {files.filter(file=>file.fileCategory==="DOCUMENT"||file.fileCategory==="CHECKLIST_ORIGINAL").length}개 ›</a></nav>
      </section>
    </AppShell>
  );
}
