"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, FileText, Search, SlidersHorizontal } from "lucide-react";
import type { Consultation, ConsultationStatus } from "@/types/consultation";
import { StatusBadge } from "./status-badge";
import { formatConsultationRegion } from "@/lib/consultations/region-display";
import { formatSeoulDateTime } from "@/lib/consultations/reservation-time";
import { ReservationEditor, type ReservationSaved } from "./reservation-editor";

const statusFilters: ("전체" | ConsultationStatus)[] = ["전체", "접수", "예약", "완료", "계약"];
const pageSizeOptions = [10, 20, 50] as const;

const formatReceivedAt = (value: string) => {
  const parts = new Intl.DateTimeFormat("en-CA", { year:"2-digit", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hourCycle:"h23", timeZone:"Asia/Seoul" }).formatToParts(new Date(value));
  const part=(type:Intl.DateTimeFormatPartTypes)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}.${part("month")}.${part("day")} ${part("hour")}:${part("minute")}`;
};

const receivedDateKey = (value: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(value));

export function ConsultationsPage({ consultations: initialConsultations, initialStatus = "전체" }: { consultations: Consultation[]; initialStatus?: "전체" | ConsultationStatus }) {
  const [consultations, setConsultations] = useState(initialConsultations);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"전체" | ConsultationStatus>(initialStatus);
  const [receivedFrom, setReceivedFrom] = useState("");
  const [receivedTo, setReceivedTo] = useState("");
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(10);
  const [page, setPage] = useState(1);
  const [reservationTarget, setReservationTarget] = useState<Consultation | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => { if (!toast) return; const timer=setTimeout(()=>setToast(""),3500); return ()=>clearTimeout(timer); }, [toast]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return consultations
      .filter((item) => statusFilter === "전체" || item.status === statusFilter)
      .filter((item) => !receivedFrom || receivedDateKey(item.receivedAt) >= receivedFrom)
      .filter((item) => !receivedTo || receivedDateKey(item.receivedAt) <= receivedTo)
      .filter((item) => !normalizedQuery || `${item.customerName} ${item.region}`.toLowerCase().includes(normalizedQuery));
  }, [consultations, query, statusFilter, receivedFrom, receivedTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeFilter = (status: "전체" | ConsultationStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

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
        <div className="received-date-filter" aria-label="접수일 필터">
          <span>접수일</span>
          <input type="date" aria-label="접수 시작일" value={receivedFrom} max={receivedTo||undefined} onChange={(event)=>{setReceivedFrom(event.target.value);setPage(1)}} />
          <i>–</i>
          <input type="date" aria-label="접수 종료일" value={receivedTo} min={receivedFrom||undefined} onChange={(event)=>{setReceivedTo(event.target.value);setPage(1)}} />
          {(receivedFrom||receivedTo)&&<button type="button" onClick={()=>{setReceivedFrom("");setReceivedTo("");setPage(1)}}>초기화</button>}
        </div>
        <span className="sort-label"><SlidersHorizontal /> 최신순</span>
      </section>

      <section className="consultations-surface">
        <div className="consultations-table-wrap">
          <table className="consultations-table">
            <thead><tr><th>번호</th><th>상태</th><th>고객 이름</th><th>지역</th><th>평수</th><th>상담 희망일</th><th>예상 금액</th><th>상담 원본</th><th>자료</th><th>관리</th><th>접수일</th></tr></thead>
            <tbody>
              {pageItems.map((item,itemIndex) => (
                <tr key={item.id}>
                  <td>{(currentPage-1)*pageSize+itemIndex+1}</td><td><StatusBadge status={item.status} />{item.scheduledAt&&<button type="button" className="confirmed-schedule" onClick={()=>setReservationTarget(item)}>{formatSeoulDateTime(item.scheduledAt)}</button>}</td><td><strong>{item.customerName}</strong></td><td className="consultation-region">{formatConsultationRegion(item.region)}</td><td>{item.areaSize}</td><td>{item.visitDate}<small>{item.visitTime}</small></td><td>{item.budget.toLocaleString()}만원</td>
                  <td><Link className="consultation-original-link" href={`/consultations/${encodeURIComponent(item.id)}`}><FileText /> 상담지</Link></td>
                  <td><div className="consultation-file-shortcuts"><Link href={`/images?consultation=${encodeURIComponent(item.id)}`}>이미지</Link><Link href={`/documents?consultation=${encodeURIComponent(item.id)}`}>서류</Link></div></td>
                  <td><select aria-label={`${item.customerName} 상담 상태`} value={item.status} onChange={(event) => void changeStatus(item.id, event.target.value as ConsultationStatus)}>{statusFilters.slice(1).map((status) => <option key={status}>{status}</option>)}</select></td>
                  <td className="consultation-received-at">{formatReceivedAt(item.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="consultation-mobile-list">
          {pageItems.map((item,itemIndex) => (
            <article className="consultation-mobile-card" key={item.id}>
              <header><div><span className="consultation-number">{(currentPage-1)*pageSize+itemIndex+1}</span><StatusBadge status={item.status} /><h2>{item.customerName} 고객님</h2></div><span>{formatReceivedAt(item.receivedAt)}</span></header>
              <dl><div><dt>지역</dt><dd>{formatConsultationRegion(item.region)}</dd></div><div><dt>평수</dt><dd>{item.areaSize}</dd></div><div><dt>상담 희망일</dt><dd>{item.visitDate} {item.visitTime}</dd></div>{item.scheduledAt&&<div><dt>확정 예약</dt><dd><button type="button" className="confirmed-schedule" onClick={()=>setReservationTarget(item)}>{formatSeoulDateTime(item.scheduledAt)}</button></dd></div>}<div><dt>예상 금액</dt><dd>{item.budget.toLocaleString()}만원</dd></div></dl>
              <div className="consultation-file-shortcuts"><Link href={`/images?consultation=${encodeURIComponent(item.id)}`}>이미지</Link><Link href={`/documents?consultation=${encodeURIComponent(item.id)}`}>서류</Link></div><footer><Link className="consultation-original-link" href={`/consultations/${encodeURIComponent(item.id)}`}><FileText /> 상담지</Link><select aria-label={`${item.customerName} 상담 상태`} value={item.status} onChange={(event) => void changeStatus(item.id, event.target.value as ConsultationStatus)}>{statusFilters.slice(1).map((status) => <option key={status}>{status}</option>)}</select></footer>
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
