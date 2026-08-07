import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { updateStatus } from "@/lib/consultations/consultation-repository";
import { syncConsultationStatus } from "@/lib/google/consultation-sync";
import type { ConsultationStatus } from "@/types/consultation";
const statuses=new Set<ConsultationStatus>(["접수","예약","완료","계약"]);
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});const {status,idempotencyKey}=await request.json() as {status?:ConsultationStatus;idempotencyKey?:string};if(!status||!statuses.has(status)||!idempotencyKey||idempotencyKey.length>100)return NextResponse.json({error:"invalid_status"},{status:400});const {id}=await params;const record=await updateStatus(context.workspace.id,id,status,context.user.id,idempotencyKey);if(!record)return NextResponse.json({error:"not_found"},{status:404});await syncConsultationStatus(context.workspace.id,id,context.workspace.name);return NextResponse.json({ok:true});}
