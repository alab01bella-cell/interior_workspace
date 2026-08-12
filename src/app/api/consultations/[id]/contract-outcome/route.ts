import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { changeContractOutcome } from "@/lib/consultations/consultation-repository";
import { syncConsultationCommercials } from "@/lib/google/consultation-sync";
import type { LostReason } from "@/types/consultation";

const reasons=new Set<LostReason>(["PRICE","SCHEDULE","COMPETITOR","SCOPE_MISMATCH","CUSTOMER_PLAN_CHANGED","NO_RESPONSE","ON_HOLD","OTHER"]);
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {outcome?:unknown;lostReason?:unknown;lostReasonNote?:unknown;idempotencyKey?:unknown}|null;
  if(!body||(body.outcome!=="PENDING"&&body.outcome!=="CONTRACTED"&&body.outcome!=="LOST")||!(body.lostReason===null||typeof body.lostReason==="string"&&reasons.has(body.lostReason as LostReason))||!(body.lostReasonNote===null||typeof body.lostReasonNote==="string")||String(body.lostReasonNote??"").length>2000||typeof body.idempotencyKey!=="string"||body.idempotencyKey.length<8||body.idempotencyKey.length>100)return NextResponse.json({error:"invalid_request"},{status:400});
  const id=(await params).id;const result=await changeContractOutcome({workspaceId:context.workspace.id,consultationId:id,outcome:body.outcome,lostReason:body.lostReason as LostReason|null,lostReasonNote:body.lostReasonNote?.trim()||null,actorUserId:context.user.id,idempotencyKey:body.idempotencyKey});
  if(result.error)return NextResponse.json({error:result.error},{status:result.error==="not_found"?404:409});
  await syncConsultationCommercials(context.workspace.id,id,context.workspace.name);
  return NextResponse.json({ok:true,consultation:result.record});
}
