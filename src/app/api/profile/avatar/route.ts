import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { findUserById, resetCustomProfileImage, setCustomProfileImage } from "@/lib/auth/user-repository";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { deleteDriveFolder, downloadDriveFile, uploadDriveFile } from "@/lib/google/drive-api";
import { driveErrorKind,driveErrorStatus } from "@/lib/google/drive-error";

const allowedTypes=new Set(["image/jpeg","image/png","image/webp"]);
const maxSize=5*1024*1024;

export async function GET(){
  const session=await getCurrentUser();if(!session)return new NextResponse(null,{status:401});
  const user=await findUserById(session.id);if(!user?.customProfileDriveFileId||!user.customProfileWorkspaceId)return new NextResponse(null,{status:404});
  const connection=await findDriveConnection(user.customProfileWorkspaceId);if(!connection)return new NextResponse(null,{status:404});
  try{const source=await downloadDriveFile(await getGoogleAccessToken(connection),user.customProfileDriveFileId);if(!source)return new NextResponse(null,{status:404});return new NextResponse(source.body,{headers:{"content-type":source.headers.get("content-type")??"image/jpeg","cache-control":"private, no-store","x-content-type-options":"nosniff"}});}catch{return new NextResponse(null,{status:404});}
}

export async function POST(request:Request){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const form=await request.formData().catch(()=>null);const file=form?.get("image");
  if(!(file instanceof File)||!allowedTypes.has(file.type)||file.size<1||file.size>maxSize)return NextResponse.json({error:"invalid_image"},{status:400});
  const connection=await findDriveConnection(context.workspace.id);if(!connection?.driveRootFolderId)return NextResponse.json({error:"drive_connection_unavailable"},{status:409});
  try{
    const token=await getGoogleAccessToken(connection);
    const extension=file.type==="image/png"?"png":file.type==="image/webp"?"webp":"jpg";
    const uploaded=await uploadDriveFile(token,{name:`profile-${context.user.id}.${extension}`,parentId:connection.driveRootFolderId,mimeType:file.type,bytes:await file.arrayBuffer(),appProperties:{profile_user_id:context.user.id}});
    const previous=context.user.customProfileDriveFileId;
    await setCustomProfileImage({userId:context.user.id,workspaceId:context.workspace.id,driveFileId:uploaded.id});
    if(previous&&context.user.customProfileWorkspaceId===context.workspace.id)try{await deleteDriveFolder(token,previous);}catch{/* 이전 사진 정리는 best effort */}
    const user=await findUserById(context.user.id);
    return NextResponse.json({ok:true,imageUrl:user?.profileImageUrl??"/api/profile/avatar"});
  }catch(error){const kind=driveErrorKind(error);return NextResponse.json({error:kind.toLowerCase()},{status:driveErrorStatus(kind)});}
}

export async function DELETE(){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const previous=await resetCustomProfileImage(context.user.id);
  if(previous.driveFileId&&previous.workspaceId){try{const connection=await findDriveConnection(previous.workspaceId);if(connection)await deleteDriveFolder(await getGoogleAccessToken(connection),previous.driveFileId);}catch{/* DB 초기화는 유지 */}}
  const user=await findUserById(context.user.id);return NextResponse.json({ok:true,imageUrl:user?.profileImageUrl??null});
}
