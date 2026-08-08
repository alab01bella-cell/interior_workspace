"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { ConsultationStatus } from "@/types/consultation";

export function ProgressActions({consultationId,status}:{consultationId:string;status:ConsultationStatus}){const router=useRouter(),[pending,setPending]=useState(false);const next=status==="예약"?{status:"완료" as const,label:"상담 완료"}:null;if(!next)return null;const run=async()=>{setPending(true);const response=await fetch(`/api/consultations/${encodeURIComponent(consultationId)}/status`,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({status:next.status,idempotencyKey:crypto.randomUUID()})});setPending(false);if(response.ok)router.refresh();};return <button className="progress-action" type="button" disabled={pending} onClick={()=>void run()}>{pending?"처리 중...":next.label}</button>}
