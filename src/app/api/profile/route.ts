import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { updateUserProfile } from "@/lib/auth/user-repository";

const clean=(value:unknown,max:number)=>typeof value==="string"?value.trim().replace(/\s+/g," ").slice(0,max):"";

export async function PATCH(request:Request){
  const context=await getWorkspaceContextForSession();
  if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const body=await request.json().catch(()=>null) as {displayName?:unknown;jobTitle?:unknown;complete?:unknown}|null;
  const displayName=clean(body?.displayName,40),jobTitle=clean(body?.jobTitle,40);
  if(!displayName||!jobTitle)return NextResponse.json({error:"validation"},{status:400});
  const user=await updateUserProfile({userId:context.user.id,displayName,jobTitle,complete:body?.complete===true});
  return NextResponse.json({ok:true,user:{displayName:user.displayName,jobTitle:user.jobTitle,profileCompleted:user.profileCompleted}});
}
