import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { removeMember } from "@/lib/workspaces/team-repository";

export async function DELETE(_request:NextRequest,{params}:{params:Promise<{membershipId:string}>}){const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});if(context.membership.role!=="OWNER")return NextResponse.json({error:"forbidden"},{status:403});const result=await removeMember({workspaceId:context.workspace.id,membershipId:(await params).membershipId,actorUserId:context.user.id});if(!result.ok)return NextResponse.json({error:result.error},{status:result.error==="not_found"?404:409});return NextResponse.json({ok:true,unassignedCount:result.count});}
