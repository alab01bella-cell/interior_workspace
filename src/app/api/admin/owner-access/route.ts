import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { requireSuperAdminUser } from "@/lib/admin/super-admin";
import { allowOwnerSignup,cancelOwnerSignup,listOwnerSignupAllowances } from "@/lib/admin/owner-signup-repository";

async function adminContext(){const context=await getWorkspaceContextForSession();if(!context)return null;requireSuperAdminUser(context.user);return context}
export async function GET(){const context=await adminContext();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});return NextResponse.json({allowances:await listOwnerSignupAllowances()})}
export async function POST(request:Request){const context=await adminContext();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});const body=await request.json().catch(()=>null) as {email?:unknown}|null;try{await allowOwnerSignup({email:typeof body?.email==="string"?body.email:"",actorUserId:context.user.id});return NextResponse.json({allowances:await listOwnerSignupAllowances()},{status:201})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"save_failed"},{status:400})}}
export async function DELETE(request:Request){const context=await adminContext();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});const id=new URL(request.url).searchParams.get("id");try{if(!id)throw new Error("not_found");await cancelOwnerSignup({id});return NextResponse.json({allowances:await listOwnerSignupAllowances()})}catch(error){return NextResponse.json({error:error instanceof Error?error.message:"cancel_failed"},{status:400})}}
