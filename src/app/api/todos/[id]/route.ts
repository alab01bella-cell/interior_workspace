import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { deleteTodo,toggleTodo } from "@/lib/dashboard/todo-repository";

export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});const body=await request.json().catch(()=>null) as {completed?:unknown}|null;if(typeof body?.completed!=="boolean")return NextResponse.json({error:"invalid_request"},{status:400});const item=await toggleTodo(context.workspace.id,context.user.id,(await params).id,body.completed);return item?NextResponse.json({item}):NextResponse.json({error:"not_found"},{status:404})}
export async function DELETE(_request:NextRequest,{params}:{params:Promise<{id:string}>}){const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});return await deleteTodo(context.workspace.id,context.user.id,(await params).id)?NextResponse.json({ok:true}):NextResponse.json({error:"not_found"},{status:404})}
