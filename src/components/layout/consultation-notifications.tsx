"use client";

import { useCallback,useEffect,useRef,useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatConsultationRegion } from "@/lib/consultations/region-display";

type Notice={id:string;customerName:string;region:string;submittedAt:string};
type ResponseData={items:Notice[];unreadCount:number;checkedThroughAt:string};
const time=(value:string)=>new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(value));

export function ConsultationNotifications(){
  const [items,setItems]=useState<Notice[]>([]),[unread,setUnread]=useState(0),[open,setOpen]=useState(false),[snapshot,setSnapshot]=useState("");const root=useRef<HTMLDivElement>(null);
  const load=useCallback(async()=>{const response=await fetch("/api/notifications/consultations",{cache:"no-store"});if(!response.ok)return;const data=await response.json() as ResponseData;setItems(data.items);setUnread(data.unreadCount);setSnapshot(data.checkedThroughAt)},[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load()},60_000);const visibility=()=>{if(document.visibilityState==="visible")void load()};document.addEventListener("visibilitychange",visibility);return()=>{window.clearTimeout(initial);window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility)}},[load]);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
  const toggle=()=>{const next=!open;setOpen(next);if(next&&snapshot&&unread){const checkedThroughAt=snapshot;setUnread(0);void fetch("/api/notifications/consultations",{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({checkedThroughAt})}).then((response)=>{if(!response.ok)void load()})}};
  return <div className="notification-center" ref={root}><button className="icon-button notification-button" aria-label={unread?`새 상담 알림 ${unread}건`:"상담 알림"} aria-expanded={open} type="button" onClick={toggle}><Bell/>{unread>0&&<span className="notification-count">{unread>99?"99+":unread}</span>}</button>{open&&<section className="notification-panel"><header><div><strong>신규상담 알림</strong><span>마지막 확인 이후 접수</span></div><Link href="/consultations">전체 보기</Link></header><div>{items.map((item)=><Link href={`/consultations/${encodeURIComponent(item.id)}`} key={item.id} onClick={()=>setOpen(false)}><strong><b>NEW</b> {item.customerName}</strong><span>{formatConsultationRegion(item.region)}</span><time>{time(item.submittedAt)}</time></Link>)}{!items.length&&<p>새로운 상담이 없습니다.</p>}</div></section>}</div>;
}
