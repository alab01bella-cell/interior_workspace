"use client";
import { useState } from "react";
import { Check,UserPlus } from "lucide-react";
import { publicConsultationUrl } from "@/lib/consultations/public-consultation-url";

export function ConsultationLinkCopyButton({path}:{path:string|null}){const [message,setMessage]=useState("");const copy=async()=>{if(!path){setMessage("상담 접수 링크를 먼저 설정해주세요.");return}try{await navigator.clipboard.writeText(publicConsultationUrl(path));setMessage("✓ 상담 접수 링크를 복사했습니다.")}catch{setMessage("상담 접수 링크를 복사하지 못했습니다.")}window.setTimeout(()=>setMessage(""),2200)};return <div className="consultation-quick-copy"><button className="icon-button" aria-label="상담 접수 링크 복사" title="상담 접수 링크 복사" type="button" onClick={()=>void copy()}><UserPlus/></button>{message&&<span className="quick-copy-toast" role="status">{message.startsWith("✓")&&<Check aria-hidden="true"/>}{message.replace(/^✓\s*/,"")}</span>}</div>}
