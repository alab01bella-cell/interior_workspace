"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus, X } from "lucide-react";
import type { Consultation } from "@/types/consultation";
import { StatusBadge } from "./status-badge";
import { ReservationEditor, type ReservationSaved } from "./reservation-editor";
import { formatSeoulDateTime, seoulDateKey } from "@/lib/consultations/reservation-time";
import { formatConsultationRegion } from "@/lib/consultations/region-display";

function ReservationCard({item}:{item:Consultation}) { return <article className="reservation-card"><div><time>{formatSeoulDateTime(item.scheduledAt!)}</time><h2>{item.customerName} 고객님</h2><p>{formatConsultationRegion(item.region)} · {item.areaSize} · {item.budget.toLocaleString()}만원</p><p>{item.contactMethod} · {item.phone}</p>{item.scheduledNote&&<small>{item.scheduledNote}</small>}</div><StatusBadge status={item.status}/><nav><Link href={`/consultations/${item.id}`}>상담 보기</Link><Link href={`/images?consultation=${item.id}`}>이미지</Link><Link href={`/documents?consultation=${item.id}`}>서류</Link></nav></article> }

export function ReservationsPage({initialScheduled,received,todayKey}:{initialScheduled:Consultation[];received:Consultation[];todayKey:string}) {
  const [scheduled,setScheduled]=useState(initialScheduled),[candidates,setCandidates]=useState(received),[picking,setPicking]=useState(false),[target,setTarget]=useState<Consultation|null>(null),[toast,setToast]=useState("");
  useEffect(()=>{if(!toast)return;const timer=setTimeout(()=>setToast(""),3500);return()=>clearTimeout(timer)},[toast]);
  const groups=useMemo(()=>({
    today:scheduled.filter((item)=>seoulDateKey(item.scheduledAt!)===todayKey),
    upcoming:scheduled.filter((item)=>seoulDateKey(item.scheduledAt!)>todayKey),
    past:scheduled.filter((item)=>seoulDateKey(item.scheduledAt!)<todayKey).reverse(),
  }),[scheduled,todayKey]);
  const saved=(value:ReservationSaved)=>{if(!target)return;const next={...target,status:"예약" as const,scheduledAt:value.scheduledAt,scheduledNote:value.scheduledNote};setScheduled((items)=>[...items,next].sort((a,b)=>a.scheduledAt!.localeCompare(b.scheduledAt!)));setCandidates((items)=>items.filter((item)=>item.id!==target.id));setTarget(null);setToast(`${new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value.scheduledAt))}으로 예약되었습니다.`)};
  const section=(title:string,items:Consultation[],empty:string)=><section><h2>{title} <strong>{items.length}건</strong></h2>{items.length?items.map((item)=><ReservationCard key={item.id} item={item}/>):<div className="reservation-empty">{empty}</div>}</section>;
  return <main className="reservations-page"><header><div><p className="eyebrow">SCHEDULE</p><h1>예약</h1><span>확정된 상담 일정을 빠르게 확인하세요.</span></div><button className="new-reservation-button" type="button" onClick={()=>setPicking(true)}><Plus/> 예약 잡기</button></header>
    {section("오늘 예약",groups.today,"오늘 예정된 상담이 없습니다.")}{section("다가오는 예약",groups.upcoming,"다가오는 예약이 없습니다.")}{section("지난 예약",groups.past,"지난 예약이 없습니다.")}
    {picking&&<div className="reservation-drawer-layer" role="dialog" aria-modal="true" aria-labelledby="candidate-title"><button className="reservation-drawer-backdrop" aria-label="고객 선택 닫기" onClick={()=>setPicking(false)}/><aside className="reservation-drawer candidate-drawer"><header><div><p>NEW RESERVATION</p><h2 id="candidate-title">예약할 고객 선택</h2></div><button type="button" aria-label="닫기" onClick={()=>setPicking(false)}><X/></button></header><p className="candidate-help">접수 상태의 상담만 표시됩니다.</p><div className="reservation-candidates">{candidates.map((item)=><button key={item.id} type="button" onClick={()=>{setPicking(false);setTarget(item)}}><strong>{item.customerName} 고객님</strong><span>{formatConsultationRegion(item.region)} · {item.areaSize}</span><small>희망일 {item.visitDate} {item.visitTime}</small></button>)}{!candidates.length&&<div className="reservation-empty">예약 가능한 접수 상담이 없습니다.</div>}</div></aside></div>}
    {target&&<ReservationEditor consultation={target} open showTrigger={false} onOpenChange={(open)=>{if(!open)setTarget(null)}} onSaved={saved}/>} {toast&&<div className="app-toast" role="status">{toast}</div>}
  </main>;
}
