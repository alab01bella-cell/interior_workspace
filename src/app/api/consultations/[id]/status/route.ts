import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { cancelReservation, findConsultation, updateStatus } from "@/lib/consultations/consultation-repository";
import { syncConsultationStatus } from "@/lib/google/consultation-sync";
import type { ConsultationStatus } from "@/types/consultation";
const statuses=new Set<ConsultationStatus>(["접수","예약","완료","계약"]);
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const {status,idempotencyKey}=await request.json() as {status?:ConsultationStatus;idempotencyKey?:string};
  if(!status||!statuses.has(status)||!idempotencyKey||idempotencyKey.length>100)return NextResponse.json({error:"invalid_status"},{status:400});
  const {id}=await params;
  const current=await findConsultation(context.workspace.id,id);
  if(!current)return NextResponse.json({error:"not_found"},{status:404});
  // 예약 상태는 반드시 예약 API에서 확정 일시와 함께 생성한다.
  if(status==="예약"&&current.status!=="RESERVED")return NextResponse.json({error:"reservation_datetime_required"},{status:409});
  if(status==="접수"&&current.status==="RESERVED"){
    const result=await cancelReservation({workspaceId:context.workspace.id,consultationId:id,actorUserId:context.user.id,idempotencyKey});
    if(result.error)return NextResponse.json({error:result.error},{status:result.error==="not_found"?404:409});
  } else {
    const record=await updateStatus(context.workspace.id,id,status,context.user.id,idempotencyKey);
    if(!record)return NextResponse.json({error:"not_found"},{status:404});
  }
  await syncConsultationStatus(context.workspace.id,id,context.workspace.name);return NextResponse.json({ok:true});
}
