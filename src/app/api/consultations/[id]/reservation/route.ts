import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { cancelReservation,saveReservation } from "@/lib/consultations/consultation-repository";
import { parseSeoulDateTime } from "@/lib/consultations/reservation-time";
import { syncConsultationStatus } from "@/lib/google/consultation-sync";

const validKey=(value:unknown)=>typeof value==="string"&&value.length>=8&&value.length<=100;

export async function PUT(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const context=await getWorkspaceContextForSession(); if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {scheduledAt?:unknown;scheduledNote?:unknown;idempotencyKey?:unknown}|null;
  const scheduledAt=parseSeoulDateTime(body?.scheduledAt), note=typeof body?.scheduledNote==="string"?body.scheduledNote.trim():"";
  if(!scheduledAt||note.length>1000||!validKey(body?.idempotencyKey))return NextResponse.json({error:"invalid_reservation"},{status:400});
  const {id}=await params; const record=await saveReservation({workspaceId:context.workspace.id,consultationId:id,scheduledAt,scheduledNote:note||null,actorUserId:context.user.id,idempotencyKey:body!.idempotencyKey as string});
  if(!record)return NextResponse.json({error:"not_found"},{status:404});
  await syncConsultationStatus(context.workspace.id,id,context.workspace.name);
  return NextResponse.json({ok:true,status:record.status,scheduledAt:record.scheduledAt,scheduledNote:record.scheduledNote});
}

export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
  const context=await getWorkspaceContextForSession(); if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {idempotencyKey?:unknown}|null;
  if(!validKey(body?.idempotencyKey))return NextResponse.json({error:"invalid_request"},{status:400});
  const {id}=await params; const result=await cancelReservation({workspaceId:context.workspace.id,consultationId:id,actorUserId:context.user.id,idempotencyKey:body!.idempotencyKey as string});
  if(result.error==="not_found")return NextResponse.json({error:"not_found"},{status:404});
  if(result.error==="protected_status")return NextResponse.json({error:"completed_reservation_protected"},{status:409});
  await syncConsultationStatus(context.workspace.id,id,context.workspace.name);
  return NextResponse.json({ok:true});
}
