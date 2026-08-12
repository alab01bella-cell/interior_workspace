"use client";
import { useState } from "react";
import { publicConsultationUrl } from "@/lib/consultations/public-consultation-url";

export function PublicConsultationLink({path,origin}:{path:string;origin:string}){const [message,setMessage]=useState("");const url=publicConsultationUrl(path,origin);const copy=async()=>{try{await navigator.clipboard.writeText(url);setMessage("상담 접수 링크를 복사했습니다.")}catch{setMessage("상담 접수 링크를 복사하지 못했습니다.")}window.setTimeout(()=>setMessage(""),2000)};return <div className="public-link-control"><div className="public-link-row"><input aria-label="고객 상담 접수 링크" onFocus={(event)=>event.currentTarget.select()} readOnly value={url}/><button type="button" onClick={()=>void copy()}>복사</button><a href={url} target="_blank" rel="noreferrer">바로가기</a></div>{message&&<p role="status">{message}</p>}</div>}
