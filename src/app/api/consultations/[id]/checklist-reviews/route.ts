import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { buildChecklistDocument,formatChecklistAnswer } from "@/lib/checklist/checklist-answer-document";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { listChecklistReviews,saveChecklistReview,upsertChecklistSummary } from "@/lib/consultations/checklist-review-repository";
import { ensureCategoryFolder } from "@/lib/consultations/consultation-drive-files";
import { findFileByUploadKey,saveConsultationFile,updateConsultationFile } from "@/lib/consultations/consultation-file-repository";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { updateDriveFile,uploadDriveFile } from "@/lib/google/drive-api";
import { createConsultationSessionPdf } from "@/lib/pdf/consultation-session-pdf";

const fieldsFor=(record:NonNullable<Awaited<ReturnType<typeof findConsultation>>>)=>buildChecklistDocument(record.formVersion,record.answers).flatMap((section)=>section.fields).filter((field)=>field.name!=="privacyConsent");
async function scoped(id:string){const context=await getWorkspaceContextForSession();if(!context)return {error:NextResponse.json({error:"unauthorized"},{status:401})};const record=await findConsultation(context.workspace.id,id);if(!record)return {error:NextResponse.json({error:"not_found"},{status:404})};return {context,record,fields:fieldsFor(record)}}

export async function GET(_:Request,{params}:{params:Promise<{id:string}>}){const result=await scoped((await params).id);if("error" in result)return result.error;const reviews=await listChecklistReviews(result.context.workspace.id,result.record.id);return NextResponse.json({reviews,total:result.fields.length,confirmed:reviews.filter((review)=>review.isConfirmed&&result.fields.some((field)=>field.name===review.questionKey)).length})}

export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){const result=await scoped((await params).id);if("error" in result)return result.error;const body=await request.json().catch(()=>null) as {questionKey?:unknown;isChecked?:unknown;isConfirmed?:unknown;consultationNote?:unknown}|null,questionKey=typeof body?.questionKey==="string"?body.questionKey:"",note=typeof body?.consultationNote==="string"?body.consultationNote:"";if(!result.fields.some((field)=>field.name===questionKey)||typeof body?.isChecked!=="boolean"||typeof body?.isConfirmed!=="boolean"||note.length>4000)return NextResponse.json({error:"invalid_request"},{status:400});const review=await saveChecklistReview({workspaceId:result.context.workspace.id,consultationId:result.record.id,questionKey,isChecked:body.isChecked||body.isConfirmed,isConfirmed:body.isConfirmed,consultationNote:note,userId:result.context.user.id});return review?NextResponse.json({review}):NextResponse.json({error:"not_found"},{status:404})}

export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
  const result=await scoped((await params).id);if("error" in result)return result.error;
  const body=await request.json().catch(()=>({})) as {reviews?:Array<{questionKey?:unknown;isChecked?:unknown;isConfirmed?:unknown;consultationNote?:unknown}>};
  if(body.reviews){for(const item of body.reviews){const questionKey=typeof item.questionKey==="string"?item.questionKey:"",note=typeof item.consultationNote==="string"?item.consultationNote:"";if(!result.fields.some((field)=>field.name===questionKey)||typeof item.isChecked!=="boolean"||typeof item.isConfirmed!=="boolean"||note.length>4000)return NextResponse.json({error:"invalid_request"},{status:400});await saveChecklistReview({workspaceId:result.context.workspace.id,consultationId:result.record.id,questionKey,isChecked:item.isChecked||item.isConfirmed,isConfirmed:item.isConfirmed,consultationNote:note,userId:result.context.user.id})}}
  const reviews=await listChecklistReviews(result.context.workspace.id,result.record.id),labels=new Map(result.fields.map((field)=>[field.name,field.label]));
  const lines=reviews.filter((review)=>review.consultationNote.trim()&&labels.has(review.questionKey)).map((review)=>`• ${labels.get(review.questionKey)}: ${review.consultationNote.trim()}`),content=lines.length?lines.join("\n"):"추가 상담 메모 없음";
  await upsertChecklistSummary({workspaceId:result.context.workspace.id,consultationId:result.record.id,content,userId:result.context.user.id});
  if(!result.record.driveFolderId)return NextResponse.json({ok:true,content,pdf:{saved:false,error:"drive_folder_unavailable"}});
  try{
    const connection=await findDriveConnection(result.context.workspace.id);if(!connection)throw new Error("google_connection_unavailable");const token=await getGoogleAccessToken(connection);
    const folderId=await ensureCategoryFolder({workspaceId:result.context.workspace.id,consultationId:result.record.id,consultationFolderId:result.record.driveFolderId,category:"DOCUMENT",accessToken:token});
    const now=new Date(),date=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit"}).format(now),fileName=`상담 기록_${result.record.clientName}_${date}.pdf`,key="consultation-session-pdf";
    const bytes=await createConsultationSessionPdf({customerName:result.record.clientName,consultedAt:now,operatorName:result.context.user.displayName||result.context.user.googleName||result.context.user.email,fields:result.fields.map((field)=>({questionKey:field.name,label:field.label,answer:formatChecklistAnswer(field.name,field.value)})),reviews,summary:content}),existing=await findFileByUploadKey(result.record.id,key);
    if(existing){const uploaded=await updateDriveFile(token,{fileId:existing.driveFileId,name:fileName,mimeType:"application/pdf",bytes});await updateConsultationFile({workspaceId:result.context.workspace.id,consultationId:result.record.id,id:existing.id,fileName,fileSize:uploaded.size,userId:result.context.user.id})}
    else{const uploaded=await uploadDriveFile(token,{name:fileName,parentId:folderId,mimeType:"application/pdf",bytes,appProperties:{consultation_session_pdf:result.record.id}});await saveConsultationFile({workspaceId:result.context.workspace.id,consultationId:result.record.id,driveFileId:uploaded.id,driveFolderId:folderId,fileCategory:"DOCUMENT",originalFileName:fileName,mimeType:"application/pdf",fileSize:uploaded.size,uploadedByUserId:result.context.user.id,idempotencyKey:key})}
    return NextResponse.json({ok:true,content,pdf:{saved:true,fileName}});
  }catch(error){return NextResponse.json({ok:true,content,pdf:{saved:false,error:error instanceof Error?error.message:"pdf_save_failed"}})}
}
