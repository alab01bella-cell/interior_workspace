import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { getDb } from "@/lib/db/client";

export async function GET(){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const result=await (await getDb()).prepare(`SELECT id,client_name,region,submitted_at FROM consultations WHERE workspace_id=? ORDER BY submitted_at DESC,id DESC LIMIT 20`).bind(context.workspace.id).all<{id:string;client_name:string;region:string;submitted_at:string}>();
  return NextResponse.json({workspaceId:context.workspace.id,userId:context.user.id,items:result.results.map((row)=>({id:row.id,customerName:row.client_name,region:row.region,submittedAt:row.submitted_at}))},{headers:{"cache-control":"no-store"}});
}
