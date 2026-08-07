import { NextRequest, NextResponse } from "next/server";
import { createConsultation } from "./consultation-repository";
import { MAX_PAYLOAD_BYTES, validateSubmission } from "./consultation-schema";
import { syncConsultation } from "@/lib/google/consultation-sync";

export interface PublicConsultationWorkspace { id:string; name:string }

export async function handlePublicSubmission(request:NextRequest, workspace:PublicConsultationWorkspace|null) {
  try {
    if(!workspace) return NextResponse.json({error:"not_found"},{status:404});
    const length=Number(request.headers.get("content-length")??0);
    if(length>MAX_PAYLOAD_BYTES) return NextResponse.json({error:"payload_too_large"},{status:413});
    const raw=await request.text();
    if(new TextEncoder().encode(raw).byteLength>MAX_PAYLOAD_BYTES) return NextResponse.json({error:"payload_too_large"},{status:413});
    const input=validateSubmission(JSON.parse(raw));
    if(request.headers.get("idempotency-key")!==input.idempotencyKey) return NextResponse.json({error:"invalid_idempotency_key"},{status:400});
    const result=await createConsultation(workspace.id,input);
    const createdAt=result.record.createdAt.includes("T")?result.record.createdAt:`${result.record.createdAt.replace(" ","T")}Z`;
    const stalePending=result.record.externalSyncStatus==="PENDING"&&Date.now()-new Date(createdAt).getTime()>60_000;
    if(result.created||result.record.externalSyncStatus!=="PENDING"||stalePending) await syncConsultation(result.record,workspace.name);
    return NextResponse.json({consultationId:result.record.id,accepted:true},{status:result.created?201:200,headers:{"cache-control":"no-store"}});
  } catch(error) {
    const code=error instanceof Error?error.message:"invalid_payload";
    const clientError=["invalid_payload","invalid_date","invalid_budget","privacy_consent_required","invalid_idempotency_key"].includes(code);
    return NextResponse.json({error:clientError?code:"temporary_error"},{status:clientError?400:500});
  }
}
