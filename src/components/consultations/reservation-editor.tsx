"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { formatSeoulInput } from "@/lib/consultations/reservation-time";
import { formatConsultationRegion } from "@/lib/consultations/region-display";

export type ReservationSaved = { scheduledAt: string; scheduledNote: string | null };

type Props = {
  consultation: Consultation;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSaved?: (value: ReservationSaved) => void;
  onCancelled?: () => void;
  showTrigger?: boolean;
};

export function ReservationEditor({ consultation, open: controlledOpen, onOpenChange, onSaved, onCancelled, showTrigger = true }: Props) {
  const router = useRouter();
  const [localOpen, setLocalOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const initial = consultation.scheduledAt ? formatSeoulInput(consultation.scheduledAt) : "";
  const [date, setDate] = useState(initial.slice(0, 10));
  const [time, setTime] = useState(initial.slice(11, 16));
  const [note, setNote] = useState(consultation.scheduledNote ?? "");
  const open = controlledOpen ?? localOpen;
  const setOpen = (value: boolean) => {
    if (controlledOpen === undefined) setLocalOpen(value);
    onOpenChange?.(value);
  };

  useEffect(() => {
    if (!open) return;
    const previous=document.body.style.overflow; document.body.style.overflow="hidden";
    const close = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || pending) return;
      if (controlledOpen === undefined) setLocalOpen(false);
      onOpenChange?.(false);
    };
    document.addEventListener("keydown", close);
    return () => { document.body.style.overflow=previous; document.removeEventListener("keydown", close); };
  }, [open, pending, controlledOpen, onOpenChange, consultation.id, consultation.scheduledAt, consultation.scheduledNote]);

  const save = async () => {
    if (!date || !time) return;
    setPending(true); setError("");
    const response = await fetch(`/api/consultations/${encodeURIComponent(consultation.id)}/reservation`, {
      method: "PUT", headers: { "content-type": "application/json" },
      body: JSON.stringify({ scheduledAt: `${date}T${time}`, scheduledNote: note, idempotencyKey: crypto.randomUUID() }),
    });
    const result = await response.json().catch(() => null) as { scheduledAt?: string; scheduledNote?: string | null } | null;
    setPending(false);
    if (!response.ok || !result?.scheduledAt) { setError("예약 정보를 저장하지 못했습니다. 잠시 후 다시 시도해주세요."); return; }
    const saved = { scheduledAt: result.scheduledAt, scheduledNote: result.scheduledNote ?? (note.trim() || null) };
    setOpen(false); onSaved?.(saved); router.refresh();
  };

  const cancel = async () => {
    if(!consultation.scheduledAt||!window.confirm("예약을 취소하시겠습니까?"))return;
    setPending(true);setError("");
    const response=await fetch(`/api/consultations/${encodeURIComponent(consultation.id)}/reservation`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({idempotencyKey:crypto.randomUUID()})});
    setPending(false);
    if(!response.ok){setError("예약을 취소하지 못했습니다. 잠시 후 다시 시도해주세요.");return}
    setOpen(false);onCancelled?.();router.refresh();
  };

  return <div className="reservation-editor">
    {showTrigger && <button className="reservation-primary" type="button" onClick={() => setOpen(true)}>{consultation.scheduledAt ? "일정 변경" : "예약 잡기"}</button>}
    {open && <div className="reservation-drawer-layer" role="dialog" aria-modal="true" aria-labelledby="reservation-title">
      <button className="reservation-drawer-backdrop" type="button" aria-label="예약 입력 닫기" disabled={pending} onClick={() => setOpen(false)} />
      <aside className="reservation-drawer">
        <header><div><p>RESERVATION</p><h2 id="reservation-title">{consultation.scheduledAt ? "예약 일정 변경" : "예약 잡기"}</h2></div><button type="button" aria-label="닫기" disabled={pending} onClick={() => setOpen(false)}><X /></button></header>
        <section className="reservation-customer-summary"><strong>{consultation.customerName} 고객님</strong><dl><div><dt>지역</dt><dd>{formatConsultationRegion(consultation.region)}</dd></div><div><dt>평수</dt><dd>{consultation.areaSize || "-"}</dd></div></dl></section>
        <section className="reservation-preference"><span>고객 상담 희망일</span><strong>{consultation.visitDate || "미입력"} {consultation.visitTime}</strong></section>
        <div className="reservation-fields">
          <label>예약 날짜<input type="date" value={date} onChange={(event) => setDate(event.target.value)} required /></label>
          <label>예약 시간<input type="time" step="1800" value={time} onChange={(event) => setTime(event.target.value)} required /></label>
          <label>예약 메모 <small>선택</small><textarea maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} placeholder="방문 전 연락, 주차 안내 등" /></label>
        </div>
        {error && <p className="reservation-error" role="alert">{error}</p>}
        <footer>{consultation.scheduledAt?<button type="button" className="reservation-cancel" disabled={pending} onClick={() => void cancel()}>예약 취소</button>:<button type="button" className="reservation-secondary" disabled={pending} onClick={() => setOpen(false)}>취소</button>}<button type="button" className="reservation-confirm" disabled={pending || !date || !time} onClick={() => void save()}>{pending ? "저장 중..." : consultation.scheduledAt?"일정 저장":"예약 확정"}</button></footer>
      </aside>
    </div>}
  </div>;
}
