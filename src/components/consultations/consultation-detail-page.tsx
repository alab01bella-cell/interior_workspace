"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Home, MapPin, Phone, WalletCards } from "lucide-react";
import { checklistAnswerSections } from "@/lib/checklist/checklist-data";
import { localStorageConsultationRepository } from "@/lib/consultations/local-storage-consultation-repository";
import { initialConsultations } from "@/lib/mock/consultations-data";
import type { ChecklistAnswerValue, StoredFileInfo } from "@/types/checklist";
import type { Consultation } from "@/types/consultation";
import { StatusBadge } from "./status-badge";

const displayValue = (value: ChecklistAnswerValue | undefined) => {
  if (Array.isArray(value)) return value.length ? value : null;
  if (typeof value === "boolean") return value ? "동의" : "동의하지 않음";
  return value?.trim() || "작성하지 않음";
};

function FileAnswer({ files }: { files: StoredFileInfo[] }) {
  if (!files.length) return <span className="answer-empty">작성하지 않음</span>;
  return (
    <div>
      <ul className="answer-file-list">
        {files.map((file, index) => <li key={`${file.name}-${index}`}><strong>{file.name}</strong><span>{file.type || "형식 미확인"} · {file.size.toLocaleString()} bytes</span></li>)}
      </ul>
      <small className="prototype-file-notice">총 {files.length}개 선택 · 프로토타입에서는 실제 파일이 저장되지 않습니다.</small>
    </div>
  );
}

export function ConsultationDetailPage() {
  const params = useParams<{ id: string }>();
  const [consultation, setConsultation] = useState<Consultation | null | undefined>(undefined);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const id = decodeURIComponent(params.id);
      setConsultation(localStorageConsultationRepository.findById(id) ?? initialConsultations.find((item) => item.id === id) ?? null);
    });
    return () => window.clearTimeout(timer);
  }, [params.id]);

  if (consultation === undefined) return <div className="consultation-detail-state">상담 내용을 불러오는 중입니다.</div>;
  if (consultation === null) return <div className="consultation-detail-state"><p>상담 내용을 찾을 수 없습니다.</p><Link href="/consultations">상담목록으로 돌아가기</Link></div>;

  return (
    <div className="consultation-detail-page">
      <Link className="detail-back-link" href="/consultations"><ArrowLeft /> 목록으로 돌아가기</Link>
      <header className="consultation-detail-heading">
        <div><p>CONSULTATION ORIGINAL</p><h1>{consultation.customerName} 고객님 상담 원본</h1><span>{consultation.id}</span></div>
        <StatusBadge status={consultation.status} />
      </header>

      <section className="detail-summary-grid">
        <p><CalendarDays /><span><small>접수일</small>{new Date(consultation.receivedAt).toLocaleString("ko-KR")}</span></p>
        <p><CalendarDays /><span><small>상담 희망일</small>{consultation.visitDate || "작성하지 않음"} {consultation.visitTime}</span></p>
        <p><MapPin /><span><small>지역</small>{consultation.region}</span></p>
        <p><MapPin /><span><small>전체 현장 주소</small>{consultation.fullAddress || "작성하지 않음"}</span></p>
        <p><Home /><span><small>공간 정보</small>{consultation.housingType || "작성하지 않음"} · {consultation.areaSize || "작성하지 않음"}</span></p>
        <p><WalletCards /><span><small>예상 금액</small>{consultation.budget.toLocaleString()}만원</span></p>
        <p><Phone /><span><small>휴대폰 번호</small>{consultation.phone || "작성하지 않음"}</span></p>
      </section>

      {consultation.originalAnswers ? (
        <div className="answer-sections">
          {checklistAnswerSections.map((section, sectionIndex) => (
            <section className="answer-section" key={section.title}>
              <header><span>STEP {sectionIndex + 1}</span><h2>{section.title}</h2></header>
              <dl>
                {section.fields.map((field) => {
                  const files = field.name === "sitePhotos" ? consultation.sitePhotoFiles ?? [] : consultation.referenceImageFiles ?? [];
                  const value = displayValue(consultation.originalAnswers?.[field.name]);
                  return <div key={field.name}><dt>{field.label}</dt><dd>{field.kind === "files" ? <FileAnswer files={files} /> : Array.isArray(value) ? <span className="answer-badges">{value.map((item) => <em key={item}>{item}</em>)}</span> : value}</dd></div>;
                })}
              </dl>
            </section>
          ))}
        </div>
      ) : (
        <section className="mock-original-summary">
          <h2>상담 상세정보</h2>
          <dl>
            <div><dt>원하는 분위기</dt><dd>{consultation.style}</dd></div>
            <div><dt>거주 구성</dt><dd>{consultation.family}</dd></div>
            <div><dt>주요 요청사항</dt><dd>{consultation.request}</dd></div>
          </dl>
          <p>기존 mock 상담은 전체 체크리스트 원본 데이터가 없어 현재 상세정보를 표시합니다.</p>
        </section>
      )}
    </div>
  );
}
