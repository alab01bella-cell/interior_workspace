"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Search, SlidersHorizontal } from "lucide-react";
import type { Consultation, ConsultationStatus } from "@/types/consultation";
import { StatusBadge } from "./status-badge";
import { formatConsultationRegion } from "@/lib/consultations/region-display";
import { consultationChecklistPath, consultationDetailPath, consultationSessionPath } from "@/lib/consultations/consultation-routes";
import { formatSeoulDateTime } from "@/lib/consultations/reservation-time";
import { ReservationEditor, type ReservationSaved } from "./reservation-editor";
import { formatManWon,quoteStatusLabel } from "@/lib/consultations/quote-display";

type ConsultationFilter = "전체" | ConsultationStatus | "불성사";
const statusFilters: ConsultationFilter[] = ["전체", "접수", "예약", "완료", "계약", "불성사"];
const pageSizeOptions = [10, 20, 50] as const;
const displayStatus=(item:Consultation):ConsultationStatus|"불성사"=>item.contractOutcome==="LOST"?"불성사":item.contractOutcome==="CONTRACTED"?"계약":item.status;
const canAddReservation=(item:Consultation)=>item.status==="접수"&&item.contractOutcome==="PENDING";

const formatReceivedAt = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { year:"2-digit", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23", timeZone:"Asia/Seoul" }).formatToParts(new Date(value));
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
};

const receivedDateKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

export function ConsultationsPage({ consultations: initialConsultations, initialStatus = "전체",members,currentUserId }: { consultations: Consultation[]; initialStatus?: ConsultationFilter;members:{userId:string;name:string}[];currentUserId:string }) {
  const [todayReceivedKey,setTodayReceivedKey]=useState(()=>receivedDateKey(new Date().toISOString()));
  const [consultations, setConsultations] = useState(initialConsultations);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ConsultationFilter>(initialStatus);
  const [excludeLost,setExcludeLost]=useState(()=>initialStatus!=="불성사"&&typeof window!=="undefined"&&window.localStorage.getItem(`consultations:exclude-lost:${currentUserId}`)==="1");
  const [receivedFrom, setReceivedFrom] = useState("");
  const [receivedTo, setReceivedTo] = useState("");
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(10);
  const [assigneeFilter,setAssigneeFilter]=useState("ALL");
  const [sortOrder,setSortOrder]=useState<"DESC"|"ASC">("DESC");
  const [page, setPage] = useState(1);
  const [reservationTarget, setReservationTarget] = useState<Consultation | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { if (!toast) return; const timer=setTimeout(()=>setToast(""),3500); return ()=>clearTimeout(timer); }, [toast]);
  useEffect(()=>{const timer=window.setInterval(()=>setTodayReceivedKey(receivedDateKey(new Date().toISOString())),60_000);return()=>window.clearInterval(timer)},[]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return consultations
      .filter((item) => {
        if(statusFilter==="전체")return true;
        if(statusFilter==="불성사")return item.contractOutcome==="LOST";
        if(statusFilter==="계약")return item.contractOutcome==="CONTRACTED";
        if(statusFilter==="완료")return item.status==="완료"&&item.contractOutcome==="PENDING";
        return item.status===statusFilter;
      })
      .filter((item)=>!excludeLost||statusFilter==="불성사"||item.contractOutcome!=="LOST")
      .filter((item) => !receivedFrom || receivedDateKey(item.receivedAt) >= receivedFrom)
      .filter((item) => !receivedTo || receivedDateKey(item.receivedAt) <= receivedTo)
      .filter((item)=>assigneeFilter==="ALL"||assigneeFilter==="ME"&&item.assignedUserId===currentUserId||assigneeFilter==="UNASSIGNED"&&!item.assignedUserId||item.assignedUserId===assigneeFilter)
      .filter((item) => !normalizedQuery || `${item.customerName} ${item.region}`.toLowerCase().includes(normalizedQuery))
      .sort((a,b)=>sortOrder==="DESC"?b.receivedAt.localeCompare(a.receivedAt):a.receivedAt.localeCompare(b.receivedAt));
  }, [consultations, query, statusFilter, excludeLost,receivedFrom, receivedTo,assigneeFilter,currentUserId,sortOrder]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeFilter = (status: ConsultationFilter) => {
    setStatusFilter(status);
    if(status==="불성사"){setExcludeLost(false);window.localStorage.setItem(`consultations:exclude-lost:${currentUserId}`,"0")}
    setPage(1);
  };
  const toggleExcludeLost=()=>{if(statusFilter==="불성사")return;setExcludeLost((current)=>{const next=!current;window.localStorage.setItem(`consultations:exclude-lost:${currentUserId}`,next?"1":"0");return next});setPage(1)};

  const changeStatus = async (id: string, status: ConsultationStatus) => {
    const consultation=consultations.find((item)=>item.id===id);
    if(!consultation)return;
    const previous=consultation.status;
    if(status==="예약") { setReservationTarget(consultation); return; }
    if(status==="접수"&&previous==="예약"&&!window.confirm("예약을 취소하시겠습니까?")) return;
    setConsultations((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    const response=await fetch(`/api/consultations/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status,idempotencyKey:crypto.randomUUID()})});
    if(!response.ok)setConsultations((items)=>items.map((item)=>item.id===id?{...item,status:previous}:item));
    else if(status==="접수"&&previous==="예약")setConsultations((items)=>items.map((item)=>item.id===id?{...item,status,scheduledAt:null,scheduledNote:null}:item));
  };

  const reservationSaved=(value:ReservationSaved)=>{
    if(!reservationTarget)return;
    setConsultations((items)=>items.map((item)=>item.id===reservationTarget.id?{...item,status:"예약",scheduledAt:value.scheduledAt,scheduledNote:value.scheduledNote}:item));
    const when=new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value.scheduledAt));
    setToast(`${when}으로 예약되었습니다.`); setReservationTarget(null);
  };

  const reservationCancelled=()=>{
    if(!reservationTarget)return;
    setConsultations((items)=>items.map((item)=>item.id===reservationTarget.id?{...item,status:"접수",scheduledAt:null,scheduledNote:null}:item));
    setToast("예약이 취소되었습니다.");setReservationTarget(null);
  };
  const changeAssignee=async(item:Consultation,assignedUserId:string|null)=>{const previousId=item.assignedUserId??null,previousName=item.assignedUserName??null,nextName=members.find((member)=>member.userId===assignedUserId)?.name??null;setConsultations((items)=>items.map((value)=>value.id===item.id?{...value,assignedUserId,assignedUserName:nextName}:value));const response=await fetch(`/api/consultations/${encodeURIComponent(item.id)}/assignee`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({assignedUserId,idempotencyKey:crypto.randomUUID()})});if(!response.ok){setConsultations((items)=>items.map((value)=>value.id===item.id?{...value,assignedUserId:previousId,assignedUserName:previousName}:value));setToast("담당자를 변경하지 못했습니다.")}else setToast(assignedUserId?`${nextName}님이 담당자로 지정되었습니다.`:"담당자가 미지정으로 변경되었습니다.")};

  return (
    <div className="consultations-page">
      <header className="consultations-heading">
        <div><p>CONSULTATIONS</p><h1>상담목록</h1><span>고객 상담 접수 내역을 한눈에 확인하고 관리하세요.</span></div>
        <strong>총 {filtered.length}건</strong>
      </header>
      <section className="consultation-toolbar">
        <label className="consultation-search"><Search /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="고객 이름 또는 지역 검색" /></label>
        <div className="status-filters" aria-label="상태 필터">
          {statusFilters.map((status) => <button className={statusFilter === status ? "is-active" : ""} key={status} onClick={() => changeFilter(status)} type="button">{status}</button>)}
        </div>
        <label className={`exclude-lost-toggle ${statusFilter==="불성사"?"is-disabled":""}`}><input type="checkbox" checked={excludeLost} disabled={statusFilter==="불성사"} onChange={toggleExcludeLost}/><span>불성사 제외</span></label>
        <div className="received-date-filter" aria-label="접수일 필터">
          <span>접수일</span>
          <input type="date" aria-label="접수 시작일" value={receivedFrom} max={receivedTo||undefined} onChange={(event)=>{setReceivedFrom(event.target.value);setPage(1)}} />
          <i>–</i>
          <input type="date" aria-label="접수 종료일" value={receivedTo} min={receivedFrom||undefined} onChange={(event)=>{setReceivedTo(event.target.value);setPage(1)}} />
          {(receivedFrom||receivedTo)&&<button type="button" onClick={()=>{setReceivedFrom("");setReceivedTo("");setPage(1)}}>초기화</button>}
        </div>
        <label className="assignee-filter"><span>담당자</span><select value={assigneeFilter} onChange={(event)=>{setAssigneeFilter(event.target.value);setPage(1)}}><option value="ALL">전체</option><option value="ME">내 상담</option><option value="UNASSIGNED">미지정</option>{members.map((member)=><option key={member.userId} value={member.userId}>{member.name}</option>)}</select></label>
        <label className="sort-label"><SlidersHorizontal/><select aria-label="상담 정렬" value={sortOrder} onChange={(event)=>{setSortOrder(event.target.value as "DESC"|"ASC");setPage(1)}}><option value="DESC">최신순</option><option value="ASC">오래된순</option></select></label>
      </section>

      <section className="consultations-surface">
        <div className="consultations-table-wrap">
          <table className="consultations-table">
            <colgroup>
              <col className="consultation-col-number" />
              <col className="consultation-col-status" />
              <col className="consultation-col-customer" />
              <col className="consultation-col-region" />
              <col className="consultation-col-area" />
              <col className="consultation-col-visit" />
              <col className="consultation-col-budget" />
              <col className="consultation-col-original" />
              <col className="consultation-col-session" />
              <col className="consultation-col-files" />
              <col className="consultation-col-manage" />
              <col className="consultation-col-received" />
            </colgroup>
            <thead><tr><th>번호</th><th>상태</th><th>고객 이름</th><th>지역</th><th>평수</th><th>상담 희망일</th><th>예상 금액</th><th>상담 원본</th><th>상담 진행</th><th>자료</th><th>관리</th><th>접수일</th></tr></thead>
            <tbody>
              {pageItems.map((item,itemIndex) => (
                <tr key={item.id}>
                  <td>{(currentPage-1)*pageSize+itemIndex+1}</td><td>{canAddReservation(item)?<button type="button" className="status-reservation-trigger" aria-label={`${item.customerName} 예약 추가`} title="예약 추가" onClick={()=>setReservationTarget(item)}><StatusBadge status="접수" /></button>:<StatusBadge status={displayStatus(item)} />}{item.scheduledAt&&<button type="button" className="confirmed-schedule" onClick={()=>setReservationTarget(item)}>{formatSeoulDateTime(item.scheduledAt)}</button>}</td><td><Link className="consultation-customer-link" href={consultationDetailPath(item.id)}><strong>{item.customerName}</strong>{receivedDateKey(item.receivedAt)===todayReceivedKey&&<span className="new-consultation-badge">NEW</span>}</Link><select className="inline-assignee" aria-label={`${item.customerName} 담당자`} value={item.assignedUserId??""} onChange={(event)=>void changeAssignee(item,event.target.value||null)}><option value="">담당자 미지정</option>{members.map((member)=><option key={member.userId} value={member.userId}>{member.name}</option>)}</select>{(item.status==="완료"||item.status==="계약")&&<Link className="inline-quote" href={`/quotes?consultation=${encodeURIComponent(item.id)}`}>{item.quoteAmount?formatManWon(item.quoteAmount):quoteStatusLabel[item.quoteStatus]}</Link>}</td><td className="consultation-region">{formatConsultationRegion(item.region)}</td><td>{item.areaSize}</td><td>{item.visitDate}<small>{item.visitTime}</small></td><td>{item.budget.toLocaleString()}만원</td>
                  <td><Link className="consultation-original-link" href={consultationChecklistPath(item.id)}><FileText /> 상담지</Link></td>
                  <td><Link className="consultation-session-link" href={consultationSessionPath(item.id)}>상담하기</Link></td>
                  <td><div className="consultation-file-shortcuts"><Link href={`/images?consultation=${encodeURIComponent(item.id)}`}>이미지</Link><Link href={`/documents?consultation=${encodeURIComponent(item.id)}`}>파일</Link></div></td>
                  <td><select aria-label={`${item.customerName} 상담 상태`} value={displayStatus(item)} onChange={(event) => {if(event.target.value!=="불성사")void changeStatus(item.id,event.target.value as ConsultationStatus)}}>{(displayStatus(item)==="불성사"?["불성사"]:displayStatus(item)==="계약"?["계약"]:["접수","예약","완료"]).map((status) => <option key={status}>{status}</option>)}</select></td>
                  <td className="consultation-received-at">{formatReceivedAt(item.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="consultation-mobile-list">
          {pageItems.map((item,itemIndex) => (
            <article className="consultation-mobile-card" key={item.id}>
              <header><div><span className="consultation-number">{(currentPage-1)*pageSize+itemIndex+1}</span>{canAddReservation(item)?<button type="button" className="status-reservation-trigger" aria-label={`${item.customerName} 예약 추가`} title="예약 추가" onClick={()=>setReservationTarget(item)}><StatusBadge status="접수" /></button>:<StatusBadge status={displayStatus(item)} />}<h2><Link className="consultation-customer-link" href={consultationDetailPath(item.id)}>{item.customerName} 고객님 {receivedDateKey(item.receivedAt)===todayReceivedKey&&<span className="new-consultation-badge">NEW</span>}</Link></h2></div><span>{formatReceivedAt(item.receivedAt)}</span></header>
              <dl><div><dt>지역</dt><dd>{formatConsultationRegion(item.region)}</dd></div><div><dt>평수</dt><dd>{item.areaSize}</dd></div><div><dt>담당자</dt><dd><select className="inline-assignee" value={item.assignedUserId??""} onChange={(event)=>void changeAssignee(item,event.target.value||null)}><option value="">담당자 미지정</option>{members.map((member)=><option key={member.userId} value={member.userId}>{member.name}</option>)}</select></dd></div><div><dt>상담 희망일</dt><dd>{item.visitDate} {item.visitTime}</dd></div>{item.scheduledAt&&<div><dt>확정 예약</dt><dd><button type="button" className="confirmed-schedule" onClick={()=>setReservationTarget(item)}>{formatSeoulDateTime(item.scheduledAt)}</button></dd></div>}<div><dt>예상 금액</dt><dd>{item.budget.toLocaleString()}만원</dd></div></dl>
              <div className="consultation-file-shortcuts"><Link href={`/images?consultation=${encodeURIComponent(item.id)}`}>이미지</Link><Link href={`/documents?consultation=${encodeURIComponent(item.id)}`}>파일</Link>{(item.status==="완료"||item.status==="계약")&&<Link href={`/quotes?consultation=${encodeURIComponent(item.id)}`}>{item.quoteAmount?formatManWon(item.quoteAmount):quoteStatusLabel[item.quoteStatus]}</Link>}</div><footer><Link className="consultation-original-link" href={consultationChecklistPath(item.id)}><FileText /> 상담지</Link><Link className="consultation-session-link" href={consultationSessionPath(item.id)}>상담하기</Link><select aria-label={`${item.customerName} 상담 상태`} value={displayStatus(item)} onChange={(event) => {if(event.target.value!=="불성사")void changeStatus(item.id,event.target.value as ConsultationStatus)}}>{(displayStatus(item)==="불성사"?["불성사"]:displayStatus(item)==="계약"?["계약"]:["접수","예약","완료"]).map((status) => <option key={status}>{status}</option>)}</select></footer>
            </article>
          ))}
        </div>

        {pageItems.length === 0 && <div className="consultations-empty">아직 접수된 상담이 없습니다.</div>}
        <footer className="pagination"><div className="page-size"><span>페이지당</span><select value={pageSize} onChange={(event)=>{setPageSize(Number(event.target.value) as (typeof pageSizeOptions)[number]);setPage(1)}}>{pageSizeOptions.map((size)=><option key={size} value={size}>{size}건</option>)}</select></div><span>{(currentPage - 1) * pageSize + (pageItems.length ? 1 : 0)}–{(currentPage - 1) * pageSize + pageItems.length} / {filtered.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="이전 페이지" type="button"><ChevronLeft /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => <button className={currentPage === value ? "is-active" : ""} key={value} onClick={() => setPage(value)} type="button">{value}</button>)}<button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="다음 페이지" type="button"><ChevronRight /></button></div></footer>
      </section>
      {reservationTarget&&<ReservationEditor consultation={reservationTarget} open onOpenChange={(open)=>{if(!open)setReservationTarget(null);}} onSaved={reservationSaved} onCancelled={reservationCancelled} showTrigger={false}/>}
      {toast&&<div className="app-toast" role="status">{toast}</div>}
    </div>
  );
}
