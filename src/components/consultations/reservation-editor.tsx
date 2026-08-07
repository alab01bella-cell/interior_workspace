"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConsultationStatus } from "@/types/consultation";
import { formatSeoulInput } from "@/lib/consultations/reservation-time";

export function ReservationEditor({consultationId,scheduledAt,scheduledNote,status}:{consultationId:string;scheduledAt:string|null;scheduledNote:string|null;status:ConsultationStatus}) {
  const router=useRouter(), [open,setOpen]=useState(false), [pending,setPending]=useState(false), [error,setError]=useState("");
  const [dateTime,setDateTime]=useState(scheduledAt?formatSeoulInput(scheduledAt):""),[note,setNote]=useState(scheduledNote??"");
  const protectedStatus=status==="완료"||status==="계약";
  const save=async()=>{setPending(true);setError("");const response=await fetch(`/api/consultations/${encodeURIComponent(consultationId)}/reservation`,{method:"PUT",headers:{"content-type":"application/json"},body:JSON.stringify({scheduledAt:dateTime,scheduledNote:note,idempotencyKey:crypto.randomUUID()})});setPending(false);if(!response.ok){setError("예약 정보를 저장하지 못했습니다.");return;}setOpen(false);router.refresh();};
  const cancel=async()=>{if(!confirm("예약을 취소하시겠습니까?"))return;setPending(true);setError("");const response=await fetch(`/api/consultations/${encodeURIComponent(consultationId)}/reservation`,{method:"DELETE",headers:{"content-type":"application/json"},body:JSON.stringify({idempotencyKey:crypto.randomUUID()})});setPending(false);if(!response.ok){setError(response.status===409?"완료 또는 계약된 상담의 예약은 취소할 수 없습니다.":"예약을 취소하지 못했습니다.");return;}setOpen(false);router.refresh();};
  return <div className="reservation-editor">
    <button className="reservation-primary" type="button" onClick={()=>setOpen((value)=>!value)}>{scheduledAt?"일정 변경":"예약 잡기"}</button>
    {open&&<div className="reservation-form"><label>날짜와 시간<input type="datetime-local" value={dateTime} onChange={(event)=>setDateTime(event.target.value)} required /></label><label>예약 관련 메모<textarea maxLength={1000} value={note} onChange={(event)=>setNote(event.target.value)} placeholder="고객 자택 방문 / 주차장 사전 연락" /></label>{error&&<p role="alert">{error}</p>}<div><button type="button" disabled={pending||!dateTime} onClick={()=>void save()}>{pending?"저장 중...":"예약 확정"}</button>{scheduledAt&&<button type="button" className="reservation-cancel" disabled={pending||protectedStatus} title={protectedStatus?"완료·계약 상담은 예약을 취소할 수 없습니다.":undefined} onClick={()=>void cancel()}>예약 취소</button>}</div></div>}
  </div>;
}
