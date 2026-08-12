import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";

type NoticeRow={id:string;client_name:string;region:string;submitted_at:string};
type MemberRow={last_notification_checked_at:string|null;joined_at:string};

export async function GET(){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const db=await getDb();
  const member=await db.prepare(`SELECT last_notification_checked_at,joined_at FROM workspace_members WHERE workspace_id=? AND user_id=? AND status='ACTIVE' LIMIT 1`).bind(context.workspace.id,context.user.id).first<MemberRow>();
  if(!member)return NextResponse.json({error:"membership_not_found"},{status:404});
  const snapshot=await db.prepare(`SELECT strftime('%Y-%m-%dT%H:%M:%fZ','now') AS value`).first<{value:string}>();
  const checkedAt=member.last_notification_checked_at??member.joined_at;
  const result=await db.prepare(`SELECT id,client_name,region,submitted_at FROM consultations WHERE workspace_id=? AND julianday(submitted_at)>julianday(?) AND julianday(submitted_at)<=julianday(?) ORDER BY submitted_at DESC,id DESC LIMIT 20`).bind(context.workspace.id,checkedAt,snapshot?.value??new Date().toISOString()).all<NoticeRow>();
  const count=await db.prepare(`SELECT COUNT(*) AS count FROM consultations WHERE workspace_id=? AND julianday(submitted_at)>julianday(?) AND julianday(submitted_at)<=julianday(?)`).bind(context.workspace.id,checkedAt,snapshot?.value??new Date().toISOString()).first<{count:number}>();
  return NextResponse.json({items:result.results.map((row)=>({id:row.id,customerName:row.client_name,region:row.region,submittedAt:row.submitted_at})),unreadCount:count?.count??0,checkedThroughAt:snapshot?.value??new Date().toISOString()},{headers:{"cache-control":"no-store"}});
}

export async function PATCH(request:NextRequest){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {checkedThroughAt?:unknown}|null;
  if(!body||typeof body.checkedThroughAt!=="string"||!Number.isFinite(Date.parse(body.checkedThroughAt)))return NextResponse.json({error:"invalid_request"},{status:400});
  const result=await (await getDb()).prepare(`UPDATE workspace_members SET last_notification_checked_at=CASE WHEN last_notification_checked_at IS NULL OR julianday(last_notification_checked_at)<julianday(?) THEN ? ELSE last_notification_checked_at END,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE workspace_id=? AND user_id=? AND status='ACTIVE' AND julianday(?)<=julianday('now','+1 minute')`).bind(body.checkedThroughAt,body.checkedThroughAt,context.workspace.id,context.user.id,body.checkedThroughAt).run();
  if(result.meta.changes!==1)return NextResponse.json({error:"invalid_request"},{status:400});
  return NextResponse.json({ok:true});
}
