"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Search, SlidersHorizontal } from "lucide-react";
import type { Consultation, ConsultationStatus } from "@/types/consultation";
import { StatusBadge } from "./status-badge";

const statusFilters: ("전체" | ConsultationStatus)[] = ["전체", "접수", "예약", "완료", "계약"];
const pageSize = 8;

const formatDate = (value: string) => new Intl.DateTimeFormat("ko-KR", {
  year: "2-digit", month: "2-digit", day: "2-digit",
}).format(new Date(value));

export function ConsultationsPage({ consultations: initialConsultations, initialStatus = "전체" }: { consultations: Consultation[]; initialStatus?: "전체" | ConsultationStatus }) {
  const [consultations, setConsultations] = useState(initialConsultations);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"전체" | ConsultationStatus>(initialStatus);
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return consultations
      .filter((item) => statusFilter === "전체" || item.status === statusFilter)
      .filter((item) => !normalizedQuery || `${item.customerName} ${item.region}`.toLowerCase().includes(normalizedQuery))
      .sort((a, b) => {
        if (a.source !== b.source) return a.source === "stored" ? -1 : 1;
        return new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime();
      });
  }, [consultations, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const changeFilter = (status: "전체" | ConsultationStatus) => {
    setStatusFilter(status);
    setPage(1);
  };

  const changeStatus = async (id: string, status: ConsultationStatus) => {
    const previous=consultations.find((item)=>item.id===id)?.status;
    setConsultations((items) => items.map((item) => item.id === id ? { ...item, status } : item));
    const response=await fetch(`/api/consultations/${encodeURIComponent(id)}/status`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status})});
    if(!response.ok&&previous)setConsultations((items)=>items.map((item)=>item.id===id?{...item,status:previous}:item));
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
        <span className="sort-label"><SlidersHorizontal /> 최신순</span>
      </section>

      <section className="consultations-surface">
        <div className="consultations-table-wrap">
          <table className="consultations-table">
            <thead><tr><th>상태</th><th>고객 이름</th><th>지역</th><th>평수</th><th>상담 희망일</th><th>예상 금액</th><th>접수일</th><th>상담 원본</th><th>관리</th></tr></thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.id}>
                  <td><StatusBadge status={item.status} /></td><td><strong>{item.customerName}</strong></td><td>{item.region}</td><td>{item.areaSize}</td><td>{item.visitDate}<small>{item.visitTime}</small></td><td>{item.budget.toLocaleString()}만원</td><td>{formatDate(item.receivedAt)}</td>
                  <td><Link className="original-button" href={`/consultations/${encodeURIComponent(item.id)}`}>원본 보기 <ExternalLink /></Link></td>
                  <td><select aria-label={`${item.customerName} 상담 상태`} value={item.status} onChange={(event) => void changeStatus(item.id, event.target.value as ConsultationStatus)}>{statusFilters.slice(1).map((status) => <option key={status}>{status}</option>)}</select></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="consultation-mobile-list">
          {pageItems.map((item) => (
            <article className="consultation-mobile-card" key={item.id}>
              <header><div><StatusBadge status={item.status} /><h2>{item.customerName} 고객님</h2></div><span>{formatDate(item.receivedAt)}</span></header>
              <dl><div><dt>지역</dt><dd>{item.region}</dd></div><div><dt>평수</dt><dd>{item.areaSize}</dd></div><div><dt>상담 희망일</dt><dd>{item.visitDate} {item.visitTime}</dd></div><div><dt>예상 금액</dt><dd>{item.budget.toLocaleString()}만원</dd></div></dl>
              <footer><Link className="original-button" href={`/consultations/${encodeURIComponent(item.id)}`}>원본 보기 <ExternalLink /></Link><select aria-label={`${item.customerName} 상담 상태`} value={item.status} onChange={(event) => void changeStatus(item.id, event.target.value as ConsultationStatus)}>{statusFilters.slice(1).map((status) => <option key={status}>{status}</option>)}</select></footer>
            </article>
          ))}
        </div>

        {pageItems.length === 0 && <div className="consultations-empty">아직 접수된 상담이 없습니다.</div>}
        <footer className="pagination"><span>{(currentPage - 1) * pageSize + (pageItems.length ? 1 : 0)}–{(currentPage - 1) * pageSize + pageItems.length} / {filtered.length}</span><div><button disabled={currentPage === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} aria-label="이전 페이지" type="button"><ChevronLeft /></button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((value) => <button className={currentPage === value ? "is-active" : ""} key={value} onClick={() => setPage(value)} type="button">{value}</button>)}<button disabled={currentPage === totalPages} onClick={() => setPage((value) => Math.min(totalPages, value + 1))} aria-label="다음 페이지" type="button"><ChevronRight /></button></div></footer>
      </section>
    </div>
  );
}
