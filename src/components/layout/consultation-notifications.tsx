"use client";

import { useCallback,useEffect,useRef,useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { formatSeoulDateTime } from "@/lib/consultations/reservation-time";
import { formatConsultationRegion } from "@/lib/consultations/region-display";

type Notice={id:string;customerName:string;region:string;submittedAt:string};
type ResponseData={workspaceId:string;userId:string;items:Notice[]};
export function ConsultationNotifications(){
  const [items,setItems]=useState<Notice[]>([]),[unread,setUnread]=useState(0),[open,setOpen]=useState(false);const root=useRef<HTMLDivElement>(null),storageKey=useRef("");
  const load=useCallback(async()=>{const response=await fetch("/api/notifications/consultations",{cache:"no-store"});if(!response.ok)return;const data=await response.json() as ResponseData;setItems(data.items);const key=`iw-consultation-notices:${data.workspaceId}:${data.userId}`;storageKey.current=key;const seen=localStorage.getItem(key);if(!seen){if(data.items[0])localStorage.setItem(key,data.items[0].id);setUnread(0);return}const seenIndex=data.items.findIndex((item)=>item.id===seen);setUnread(seenIndex<0?data.items.length:seenIndex)},[]);
  useEffect(()=>{const initial=window.setTimeout(()=>void load(),0);const timer=window.setInterval(()=>{if(document.visibilityState==="visible")void load()},60_000);const visibility=()=>{if(document.visibilityState==="visible")void load()};document.addEventListener("visibilitychange",visibility);return()=>{window.clearTimeout(initial);window.clearInterval(timer);document.removeEventListener("visibilitychange",visibility)}},[load]);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false)};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close)},[]);
  const toggle=()=>{const next=!open;setOpen(next);if(next&&items[0]&&storageKey.current){localStorage.setItem(storageKey.current,items[0].id);setUnread(0)}};
  return <div className="notification-center" ref={root}><button className="icon-button notification-button" aria-label={unread?`새 상담 알림 ${unread}건`:"상담 알림"} aria-expanded={open} type="button" onClick={toggle}><Bell/>{unread>0&&<span className="notification-count">{unread>9?"9+":unread}</span>}</button>{open&&<section className="notification-panel"><header><div><strong>신규 상담 알림</strong><span>최근 접수 20건</span></div><Link href="/consultations">전체 보기</Link></header><div>{items.map((item)=><Link href={`/consultations/${encodeURIComponent(item.id)}`} key={item.id} onClick={()=>setOpen(false)}><strong>{item.customerName} 고객님</strong><span>{formatConsultationRegion(item.region)}</span><time>{formatSeoulDateTime(item.submittedAt)}</time></Link>)}{!items.length&&<p>아직 접수된 상담이 없습니다.</p>}</div></section>}</div>;
}
