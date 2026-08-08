import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { StatusBadge } from "@/components/consultations/status-badge";
import { requireWorkspace } from "@/lib/auth/require-user";
import { checklistAnswerSections } from "@/lib/checklist/checklist-data";
import { findConsultation, listConsultationEvents, toConsultation, type ConsultationEvent } from "@/lib/consultations/consultation-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";
import { listConsultationFiles } from "@/lib/consultations/consultation-file-repository";
import { ReservationEditor } from "@/components/consultations/reservation-editor";
import { ProgressActions } from "@/components/consultations/progress-actions";
import { formatSeoulDateTime } from "@/lib/consultations/reservation-time";
import { listActiveTeamMembers } from "@/lib/workspaces/team-repository";
import { AssigneeSelector } from "@/components/consultations/assignee-selector";
import { QuoteEditor } from "@/components/consultations/quote-editor";
import { contractOutcomeLabel,formatWon,lostReasonLabel,quoteStatusLabel } from "@/lib/consultations/quote-display";

const display=(value:unknown)=>Array.isArray(value)?value.join(", "):typeof value==="boolean"?(value?"동의":"미동의"):String(value??"")||"-";
const eventLabel:Record<ConsultationEvent["eventType"],string>={CONSULTATION_RECEIVED:"상담 접수",RESERVATION_CREATED:"상담 예약",RESERVATION_UPDATED:"상담 일정 변경",RESERVATION_CANCELLED:"예약 취소",STATUS_CHANGED:"상태 변경",ASSIGNEE_CHANGED:"담당자 변경",QUOTE_CREATED:"견적 등록",QUOTE_UPDATED:"견적 수정",QUOTE_SENT:"견적 발송 처리",CONTRACT_OUTCOME_CHANGED:"계약 결과 변경"};
const statusLabel:Record<string,string>={RECEIVED:"접수",RESERVED:"예약",COMPLETED:"완료",CONTRACTED:"계약"};

export default async function ConsultationDetailRoute({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{driveFile?:string}>}) {
  const context=await requireWorkspace();
  const record=await findConsultation(context.workspace.id,(await params).id);
  if(!record) notFound();
  const consultation=toConsultation(record);
  const files=await listConsultationFiles(context.workspace.id,record.id);
  const events=await listConsultationEvents(context.workspace.id,record.id);
  const original=files.find(file=>file.fileCategory==="CHECKLIST_ORIGINAL");
  const quoteFile=files.find(file=>file.id===record.quoteFileId);
  const members=(await listActiveTeamMembers(context.workspace.id)).map(({userId,name})=>({userId,name}));

  return (
    <AppShell identity={toWorkspaceIdentity(context)}>
      <section className="consultation-detail consultation-detail-page">
        {(await searchParams).driveFile==="missing"&&<p className="file-missing-notice">Drive에서 파일을 찾을 수 없습니다.</p>}
        <header><div><p className="eyebrow">CONSULTATION</p><h1>{consultation.customerName} 고객님 상담</h1></div><StatusBadge status={consultation.status}/></header>
        <dl className="detail-summary">
          <div><dt>상태</dt><dd>{consultation.status}</dd></div>
          <div><dt>담당자</dt><dd><AssigneeSelector consultationId={record.id} initialUserId={record.assignedUserId} members={members}/></dd></div>
          <div><dt>상담 일정</dt><dd>{record.scheduledAt?formatSeoulDateTime(record.scheduledAt):"미정"}</dd></div>
          <div><dt>연락 방법</dt><dd>{record.contactMethod} · {record.contactValue}</dd></div>
          <div><dt>현장</dt><dd>{consultation.fullAddress} · {record.area}</dd></div>
          <div><dt>접수일</dt><dd>{new Date(record.submittedAt).toLocaleString("ko-KR")}</dd></div>
          <div><dt>외부 동기화</dt><dd>{record.externalSyncStatus}</dd></div>
        </dl>
        <section className="consultation-schedule"><div><p className="eyebrow">SCHEDULE</p><h2>상담 일정</h2>{record.scheduledAt?<><strong>{formatSeoulDateTime(record.scheduledAt)}</strong>{record.scheduledNote&&<p>{record.scheduledNote}</p>}</>:<p>아직 예약되지 않았습니다.</p>}</div><div className="schedule-actions"><ReservationEditor consultation={consultation}/><ProgressActions consultationId={record.id} status={consultation.status}/></div></section>
        <section className="consultation-commercial"><div><p className="eyebrow">QUOTE & CONTRACT</p><h2>견적 및 계약</h2></div><dl><div><dt>견적 상태</dt><dd>{quoteStatusLabel[record.quoteStatus]}</dd></div><div><dt>견적 금액</dt><dd>{formatWon(record.quoteAmount)}</dd></div><div><dt>발송일</dt><dd>{record.quoteSentAt?formatSeoulDateTime(record.quoteSentAt):"-"}</dd></div><div><dt>계약 결과</dt><dd>{contractOutcomeLabel[record.contractOutcome]}</dd></div>{record.lostReason&&<div><dt>불성사 사유</dt><dd>{lostReasonLabel[record.lostReason]}{record.lostReasonNote&&<small>{record.lostReasonNote}</small>}</dd></div>}{quoteFile&&<div><dt>견적서</dt><dd><a href={`/api/consultations/${record.id}/files/${quoteFile.id}/open`} target="_blank" rel="noreferrer">{quoteFile.originalFileName}</a></dd></div>}</dl>{(record.status==="COMPLETED"||record.status==="CONTRACTED")&&<QuoteEditor consultation={consultation}/>}</section>
        <div className="detail-actions">
          {record.driveFolderId&&<a href={`https://drive.google.com/drive/folders/${encodeURIComponent(record.driveFolderId)}`} target="_blank" rel="noreferrer">고객 폴더 열기</a>}
          {original&&<a href={`/api/consultations/${record.id}/files/${original.id}/open`} target="_blank" rel="noreferrer">인쇄용 원본 PDF</a>}
          {context.membership.role==="OWNER"&&<form action={`/api/consultations/${encodeURIComponent(record.id)}/sync`} method="post"><button type="submit">{record.externalSyncStatus==="SYNCED"?"원본 PDF 다시 생성":"다시 동기화"}</button></form>}
        </div>
        {checklistAnswerSections.map((section)=><article className="detail-section" key={section.title}><h2>{section.title}</h2><dl>{section.fields.filter((field)=>field.kind!=="files").map((field)=><div key={field.name}><dt>{field.label}</dt><dd>{display(record.answers[field.name])}</dd></div>)}</dl></article>)}
        <section className="consultation-timeline"><h2>진행 기록</h2><ol>{events.map((event)=><li key={event.id}><time>{formatSeoulDateTime(event.createdAt)}</time><div><strong>{eventLabel[event.eventType]}</strong>{typeof event.payload.scheduledAt==="string"&&<span>{formatSeoulDateTime(event.payload.scheduledAt)}</span>}{event.eventType==="STATUS_CHANGED"&&typeof event.payload.to==="string"&&<span>{statusLabel[event.payload.to]??event.payload.to}</span>}{event.eventType==="ASSIGNEE_CHANGED"&&<span>{typeof event.payload.new_user_name==="string"?`담당자가 ${event.payload.new_user_name}님으로 변경되었습니다.`:"담당자가 미지정으로 변경되었습니다."}</span>}{event.eventType.startsWith("QUOTE_")&&typeof event.payload.quote_amount==="number"&&<span>{formatWon(event.payload.quote_amount)}</span>}{event.eventType==="CONTRACT_OUTCOME_CHANGED"&&<span>{event.payload.new_outcome==="CONTRACTED"?"계약 확정":event.payload.lost_reason&&typeof event.payload.lost_reason==="string"?`계약 불성사 · ${lostReasonLabel[event.payload.lost_reason as keyof typeof lostReasonLabel]??event.payload.lost_reason}`:"계약 결과 변경"}</span>}</div></li>)}{!events.some((event)=>event.eventType==="CONSULTATION_RECEIVED")&&<li><time>{formatSeoulDateTime(record.submittedAt)}</time><div><strong>상담 접수</strong></div></li>}</ol></section>
        <nav className="detail-file-links" aria-label="상담 파일 관리"><a href={`/images?consultation=${encodeURIComponent(record.id)}`}>이미지 {files.filter(file=>file.fileCategory==="FIELD_PHOTO"||file.fileCategory==="BEFORE"||file.fileCategory==="AFTER").length}개 ›</a><a href={`/documents?consultation=${encodeURIComponent(record.id)}`}>서류 {files.filter(file=>file.fileCategory==="DOCUMENT"||file.fileCategory==="CHECKLIST_ORIGINAL").length}개 ›</a></nav>
      </section>
    </AppShell>
  );
}
