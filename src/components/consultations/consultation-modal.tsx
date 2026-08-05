import { CalendarDays, Home, MapPin, Phone, WalletCards, X } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { StatusBadge } from "./status-badge";

interface ConsultationModalProps {
  consultation: Consultation;
  onClose: () => void;
}

export function ConsultationModal({ consultation, onClose }: ConsultationModalProps) {
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        aria-labelledby="consultation-modal-title"
        aria-modal="true"
        className="consultation-modal"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header>
          <div>
            <span className="modal-eyebrow">상담 원본 · {consultation.id}</span>
            <h2 id="consultation-modal-title">{consultation.customerName} 고객님 상담</h2>
          </div>
          <button aria-label="상담 원본 닫기" onClick={onClose} type="button"><X /></button>
        </header>
        <div className="modal-summary">
          <StatusBadge status={consultation.status} />
          <span>{new Date(consultation.receivedAt).toLocaleString("ko-KR")}</span>
        </div>
        <div className="modal-info-grid">
          <p><Phone /><span><small>연락처</small>{consultation.phone}</span></p>
          <p><MapPin /><span><small>현장 주소</small>{consultation.fullAddress}</span></p>
          <p><Home /><span><small>공간 정보</small>{consultation.housingType} · {consultation.areaSize}</span></p>
          <p><CalendarDays /><span><small>상담 희망일</small>{consultation.visitDate} {consultation.visitTime}</span></p>
          <p><WalletCards /><span><small>예상 금액</small>{consultation.budget.toLocaleString()}만원</span></p>
        </div>
        <div className="modal-answer"><strong>원하는 분위기</strong><p>{consultation.style}</p></div>
        <div className="modal-answer"><strong>거주 구성</strong><p>{consultation.family}</p></div>
        <div className="modal-answer"><strong>주요 요청사항</strong><p>{consultation.request}</p></div>
        <div className="mock-notice">프로토타입용 mock 상담 원본입니다.</div>
      </section>
    </div>
  );
}
