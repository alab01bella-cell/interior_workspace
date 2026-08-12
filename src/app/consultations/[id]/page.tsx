import { notFound } from "next/navigation";import Link from "next/link";import { AppShell } from "@/components/layout/app-shell";import { requireWorkspace } from "@/lib/auth/require-user";import { findConsultation,listConsultationEvents,toConsultation,type ConsultationEvent } from "@/lib/consultations/consultation-repository";import { consultationChecklistPath,consultationFileOpenPath } from "@/lib/consultations/consultation-routes";import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";import { listConsultationFiles } from "@/lib/consultations/consultation-file-repository";import { ReservationEditor } from "@/components/consultations/reservation-editor";import { ProgressActions } from "@/components/consultations/progress-actions";import { formatSeoulDateTime,seoulDateKey } from "@/lib/consultations/reservation-time";import { listActiveTeamMembers } from "@/lib/workspaces/team-repository";import { AssigneeSelector } from "@/components/consultations/assignee-selector";import { QuoteEditor } from "@/components/consultations/quote-editor";import { contractOutcomeLabel,formatManWon,lostReasonLabel } from "@/lib/consultations/quote-display";import { formatConsultationRegion } from "@/lib/consultations/region-display";import { listConsultationNotes } from "@/lib/consultations/consultation-note-repository";import { ConsultationNotes } from "@/components/consultations/consultation-notes";import { getQuoteFollowupHistory } from "@/lib/consultations/quote-followup-repository";import { DetailFollowupCard } from "@/components/consultations/detail-followup-card";
const value=(input:unknown)=>Array.isArray(input)?input.filter(Boolean).join(", "):String(input??"").trim();
const budgetLabel=(input:unknown,fallback:number)=>{const raw=value(input).replace(/,/g,"");
return /^\d+$/.test(raw)?`${Number(raw).toLocaleString("ko-KR")}만원`:value(input)||`${fallback.toLocaleString("ko-KR")}만원`};
const eventLabel:Record<ConsultationEvent["eventType"],string>={CONSULTATION_RECEIVED:"상담 접수",RESERVATION_CREATED:"예약 등록",RESERVATION_UPDATED:"예약 변경",RESERVATION_CANCELLED:"예약 취소",STATUS_CHANGED:"상담 상태 변경",ASSIGNEE_CHANGED:"담당자 변경",QUOTE_CREATED:"견적 등록",QUOTE_UPDATED:"견적 수정",QUOTE_SENT:"견적 발송",CONTRACT_OUTCOME_CHANGED:"계약 결과 변경"};
const stageDate=(events:ConsultationEvent[],types:ConsultationEvent["eventType"][])=>events.filter((event)=>types.includes(event.eventType)).at(-1)?.createdAt;
export default async function ConsultationDetailRoute({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<{driveFile?:string}>}){const context=await requireWorkspace(),record=await findConsultation(context.workspace.id,(await params).id);if(!record)notFound();
const consultation=toConsultation(record),files=await listConsultationFiles(context.workspace.id,record.id),events=(await listConsultationEvents(context.workspace.id,record.id)).slice().reverse(),members=(await listActiveTeamMembers(context.workspace.id)).map(({userId,name})=>({userId,name})),memberNames=new Map(members.map((member)=>[member.userId,member.name])),quoteFile=files.find((file)=>file.id===record.quoteFileId),followup=await getQuoteFollowupHistory(context.workspace.id,record.id),notes=await listConsultationNotes(context.workspace.id,record.id),images={FIELD_PHOTO:files.filter((file)=>file.fileCategory==="FIELD_PHOTO").length,BEFORE:files.filter((file)=>file.fileCategory==="BEFORE").length,AFTER:files.filter((file)=>file.fileCategory==="AFTER").length},docs=files.filter((file)=>file.fileCategory==="DOCUMENT"||file.fileCategory==="CHECKLIST_ORIGINAL").slice(0,4),completed=record.status==="COMPLETED"||record.status==="CONTRACTED"||record.quoteStatus!=="NOT_CREATED",resultDone=record.contractOutcome!=="PENDING",stages=[{label:"접수",done:true,date:record.submittedAt},{label:"예약",done:Boolean(record.scheduledAt||stageDate(events,["RESERVATION_CREATED","RESERVATION_UPDATED"])),date:stageDate(events,["RESERVATION_CREATED","RESERVATION_UPDATED"])},{label:"상담완료",done:completed,date:stageDate(events,["STATUS_CHANGED"])},{label:"견적발송",done:record.quoteStatus==="SENT",date:record.quoteSentAt},{label:"계약결과",done:resultDone,date:record.contractDecidedAt}];
const priorities=(Array.isArray(record.answers.priority)?record.answers.priority:[]).map(String).filter(Boolean),important=value(record.answers.nonNegotiable),styles=[value(record.answers.styles),value(record.answers.colorTone)].filter(Boolean).join(" · ");
return <AppShell identity={toWorkspaceIdentity(context)}>
<main className="customer-detail-page">{(await searchParams).driveFile==="missing"&&<p className="file-missing-notice">Drive에서 파일을 찾을 수 없습니다.</p>}<header className="customer-detail-header">
<div>
<p>CONSULTATION</p>
<div>
<h1>{record.clientName} 고객님</h1>
<span className={`customer-outcome outcome-${record.contractOutcome.toLowerCase()}`}>{record.contractOutcome==="PENDING"?consultation.status:contractOutcomeLabel[record.contractOutcome]}</span>
</div>
<strong>{formatConsultationRegion(record.region)} · {record.area}{consultation.housingType&&` · ${consultation.housingType}`}</strong>
<small>{record.contactValue} · 상담희망일 {record.preferredDate}{record.assignedUserName&&` · 담당 ${record.assignedUserName}`}</small>
</div>
<AssigneeSelector consultationId={record.id} initialUserId={record.assignedUserId} members={members}/>
</header>
<section className="customer-progress">{stages.map((stage,index)=>
<div className={stage.done?"is-done":""} key={stage.label}>
<i>{stage.done?"✓":index+1}</i>
<span>{stage.label}</span>{stage.date&&<small>{seoulDateKey(stage.date).slice(5).replace("-",".")}</small>}</div>)}</section>
<div className="customer-detail-grid">
<div className="customer-detail-column customer-detail-left">
<section className="customer-card detail-info-card">
<header>
<h2>고객 정보</h2>
</header>
<dl>{[["공간 유형",consultation.housingType],["평수",record.area],["현재 상태",value(record.answers.currentStatus)],["공사 목적",value(record.answers.renovationReason)],["예산",budgetLabel(record.answers.budget,record.budgetAmount)],["입주 예정",value(record.answers.moveInDate)],["연락 방법",record.contactMethod]].filter(([,v])=>v).map(([label,data])=>
<div key={label}>
<dt>{label}</dt>
<dd>{data}</dd>
</div>)}</dl><Link href={consultationChecklistPath(record.id)}>고객이 작성한 체크리스트 전체 보기 →</Link></section>
<section className="customer-card detail-priority-card">
<header>
<h2>고객 우선순위</h2>
</header>{priorities.length?<ol>{priorities.map((item)=>
<li key={item}>{item}</li>)}</ol>:<p className="detail-empty">등록된 우선순위가 없습니다.</p>}{important&&<div><span>중요하게 생각하는 부분</span><p>{important}</p></div>}{styles&&<div><span>원하는 분위기·스타일</span><p>{styles}</p></div>}{value(record.answers.inconvenience)&&<div>
<span>가장 불편한 부분</span>
<p>{value(record.answers.inconvenience)}</p>
</div>}{value(record.answers.skipOk)&&<div>
<span>하지 않아도 되는 공사</span>
<p>{value(record.answers.skipOk)}</p>
</div>}</section>
</div>
<div className="customer-detail-column customer-detail-center">
<ConsultationNotes consultationId={record.id} initialNotes={notes}/>
<section className="customer-card detail-timeline-card">
<header>
<h2>진행 히스토리</h2>
</header>
<ol>{events.map((event)=>
<li key={event.id}>
<time>{formatSeoulDateTime(event.createdAt)}</time>
<div>
<strong>{eventLabel[event.eventType]}</strong>{event.actorUserId&&<small>{memberNames.get(event.actorUserId)}</small>}{event.eventType.startsWith("QUOTE_")&&typeof event.payload.quote_amount==="number"&&<span>{formatManWon(event.payload.quote_amount)}</span>}{event.eventType==="CONTRACT_OUTCOME_CHANGED"&&<span>{event.payload.new_outcome==="CONTRACTED"?"계약 확정":event.payload.lost_reason&&typeof event.payload.lost_reason==="string"?`불성사 · ${lostReasonLabel[event.payload.lost_reason as keyof typeof lostReasonLabel]}`:"결과 변경"}</span>}</div>
</li>)}{followup?.notes.map((note)=>
<li key={`followup-${note.id}`}>
<time>{formatSeoulDateTime(note.createdAt)}</time>
<div>
<strong>후속 연락</strong>
<small>{note.authorName}</small>
<span>{note.content}</span>
</div>
</li>)}</ol>
</section>
<DetailFollowupCard consultation={consultation} initialDate={followup?.nextContactAt??null} initialNotes={followup?.notes??[]}/>
</div>
<div className="customer-detail-column customer-detail-right">
<section className="customer-card detail-images-card">
<header>
<h2>이미지</h2>
<Link href={`/images?consultation=${record.id}`}>전체보기 →</Link>
</header>{Object.entries(images).map(([category,count])=>
<div key={category}>
<span>{category==="FIELD_PHOTO"?"현장사진":category}</span>
<strong>{count}장</strong>
<small>{count?"":"사진 없음"}</small>
</div>)}</section>
<section className="customer-card detail-files-card">
<header>
<h2>파일</h2>
<Link href={`/documents?consultation=${record.id}`}>전체 파일 보기 →</Link>
</header>{docs.map((file)=>
<a href={consultationFileOpenPath(record.id,file.id)} target="_blank" rel="noreferrer" key={file.id}>
<b>{file.fileCategory==="CHECKLIST_ORIGINAL"?"체크리스트":file.id===record.quoteFileId?"견적서":"파일"}</b>
<span>{file.originalFileName}</span>
</a>)}{!docs.length&&<p className="detail-empty">등록된 파일이 없습니다.</p>}</section>
<section className="customer-card detail-reservation-card">
<header>
<h2>상담 예약</h2>
</header>{record.scheduledAt?<>
<strong>{formatSeoulDateTime(record.scheduledAt)}</strong>{record.scheduledNote&&<p>{record.scheduledNote}</p>}{completed&&<span>상담 완료</span>}</>:<p className="detail-empty">예약된 상담이 없습니다.</p>}<div>
<ReservationEditor consultation={consultation}/>
<ProgressActions consultationId={record.id} status={consultation.status}/>
</div>
</section>
<section className="customer-card detail-quote-card">
<header>
<h2>견적</h2>
</header>{record.quoteAmount?<>
<strong>{formatManWon(record.quoteAmount)}</strong>{quoteFile&&<a href={consultationFileOpenPath(record.id,quoteFile.id)} target="_blank" rel="noreferrer">{quoteFile.originalFileName}</a>}<span className={`quote-status-badge ${record.quoteStatus==="SENT"?"is-sent":"is-unsent"}`}>{record.quoteStatus==="SENT"?"✓ 발송완료":"미발송"}</span>{record.quoteSentAt&&<small>발송일 {seoulDateKey(record.quoteSentAt).replaceAll("-",".")}</small>}<p>{contractOutcomeLabel[record.contractOutcome]}{record.lostReason&&` · ${lostReasonLabel[record.lostReason]}`}</p>
</>:<p className="detail-empty">등록된 견적이 없습니다.</p>}{(record.status==="COMPLETED"||record.status==="CONTRACTED")&&<QuoteEditor consultation={consultation}/>} {record.quoteStatus==="SENT"&&<Link className="card-text-action" href={`/quotes?consultation=${record.id}`}>계약결과 관리</Link>}</section>
</div>
</div>
</main>
</AppShell>}
