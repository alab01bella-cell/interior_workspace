import { NextRequest,NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { createTodo,listTodos } from "@/lib/dashboard/todo-repository";

export async function GET(){const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});return NextResponse.json({items:await listTodos(context.workspace.id,context.user.id)},{headers:{"cache-control":"no-store"}})}
export async function POST(request:NextRequest){const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});const body=await request.json().catch(()=>null) as {label?:unknown}|null;const label=typeof body?.label==="string"?body.label.trim():"";if(!label||label.length>300)return NextResponse.json({error:"invalid_label"},{status:400});return NextResponse.json({item:await createTodo(context.workspace.id,context.user.id,label)},{status:201})}
