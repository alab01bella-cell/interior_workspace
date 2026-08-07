"use client";
import { useState } from "react";
export function PublicConsultationLink({path}:{path:string}){const [copied,setCopied]=useState(false);const url=typeof window==="undefined"?path:`${window.location.origin}${path}`;return <div className="public-link-row"><input aria-label="고객 상담 접수 링크" onFocus={(e)=>e.currentTarget.select()} readOnly value={url}/><button type="button" onClick={async()=>{await navigator.clipboard.writeText(`${window.location.origin}${path}`);setCopied(true);window.setTimeout(()=>setCopied(false),1500);}}>{copied?"복사됨":"상담 접수 링크 복사"}</button></div>}
