import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { saveQuote } from "@/lib/consultations/consultation-repository";
import { syncConsultationCommercials } from "@/lib/google/consultation-sync";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {amount?:unknown;note?:unknown;fileId?:unknown;action?:unknown;idempotencyKey?:unknown}|null;
  if(!body||typeof body.amount!=="number"||!Number.isSafeInteger(body.amount)||body.amount<=0||body.amount>100_000_000_000||!(body.note===null||typeof body.note==="string")||!(body.fileId===null||typeof body.fileId==="string")||!(["SAVE","SEND"] as unknown[]).includes(body.action)||typeof body.idempotencyKey!=="string"||body.idempotencyKey.length<8||body.idempotencyKey.length>100||String(body.note??"").length>2000)return NextResponse.json({error:"invalid_request"},{status:400});
  const id=(await params).id;const result=await saveQuote({workspaceId:context.workspace.id,consultationId:id,amount:body.amount,note:body.note?.trim()||null,fileId:body.fileId||null,send:body.action==="SEND",actorUserId:context.user.id,idempotencyKey:body.idempotencyKey});
  if(result.error)return NextResponse.json({error:result.error},{status:result.error==="not_found"?404:409});
  await syncConsultationCommercials(context.workspace.id,id,context.workspace.name);
  return NextResponse.json({ok:true,consultation:result.record});
}
