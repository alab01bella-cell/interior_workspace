import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { MAX_BATCH_SIZE,MAX_FILES,isUploadCategory,validateUploadFile } from "@/lib/consultations/file-policy";
import { ensureCategoryFolder } from "@/lib/consultations/consultation-drive-files";
import { findFileByUploadKey,listConsultationFiles,saveConsultationFile } from "@/lib/consultations/consultation-file-repository";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { findAppResource,uploadDriveFile } from "@/lib/google/drive-api";

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const context=await getWorkspaceContextForSession();if(!context)return NextResponse.json({error:"unauthorized"},{status:401});
  const consultation=await findConsultation(context.workspace.id,(await params).id);if(!consultation)return NextResponse.json({error:"not_found"},{status:404});
  const length=Number(request.headers.get("content-length")??0);if(length>MAX_BATCH_SIZE+1024*1024)return NextResponse.json({error:"batch_too_large"},{status:413});
  const form=await request.formData();const categoryValue=form.get("category");if(!isUploadCategory(categoryValue))return NextResponse.json({error:"invalid_category"},{status:400});
  const files=form.getAll("files").filter((value):value is File=>value instanceof File);if(!files.length||files.length>MAX_FILES||files.reduce((sum,file)=>sum+file.size,0)>MAX_BATCH_SIZE)return NextResponse.json({error:"invalid_files"},{status:400});
  for(const file of files){const error=validateUploadFile(file,categoryValue);if(error)return NextResponse.json({error},{status:400});}
  if(!consultation.driveFolderId)return NextResponse.json({error:"drive_folder_unavailable"},{status:409});
  const connection=await findDriveConnection(context.workspace.id);if(!connection)return NextResponse.json({error:"google_connection_unavailable"},{status:409});const token=await getGoogleAccessToken(connection);
  const folderId=await ensureCategoryFolder({workspaceId:context.workspace.id,consultationId:consultation.id,consultationFolderId:consultation.driveFolderId,category:categoryValue,accessToken:token});
  const batch=String(form.get("idempotencyKey")??"").slice(0,100);if(!/^[A-Za-z0-9_-]{8,100}$/.test(batch))return NextResponse.json({error:"invalid_idempotency_key"},{status:400});
  for(const [index,file] of files.entries()){
    const key=`${batch}:${index}`;if(await findFileByUploadKey(consultation.id,key))continue;
    let driveId=await findAppResource(token,folderId,"consultation_upload",`${consultation.id}:${key}`,file.type||"application/octet-stream");let size=file.size;
    if(!driveId){const uploaded=await uploadDriveFile(token,{name:file.name,parentId:folderId,mimeType:file.type||"application/octet-stream",bytes:await file.arrayBuffer(),appProperties:{consultation_upload:`${consultation.id}:${key}`}});driveId=uploaded.id;size=uploaded.size;}
    await saveConsultationFile({workspaceId:context.workspace.id,consultationId:consultation.id,driveFileId:driveId,driveFolderId:folderId,fileCategory:categoryValue,originalFileName:file.name,mimeType:file.type||"application/octet-stream",fileSize:size,uploadedByUserId:context.user.id,idempotencyKey:key});
  }
  const records=await listConsultationFiles(context.workspace.id,consultation.id);return NextResponse.json({files:records.map(({id,fileCategory,originalFileName,fileSize,createdAt})=>({id,fileCategory,originalFileName,fileSize,createdAt}))});
}
