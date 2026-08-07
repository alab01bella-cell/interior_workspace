import { getDb } from "@/lib/db/client";

export type ConsultationFileCategory="CHECKLIST_ORIGINAL"|"FIELD_PHOTO"|"BEFORE"|"AFTER"|"DOCUMENT";
export type UploadFileCategory=Exclude<ConsultationFileCategory,"CHECKLIST_ORIGINAL">;

export interface ConsultationFileRecord {
  id:string; workspaceId:string; consultationId:string; driveFileId:string; driveFolderId:string;
  fileCategory:ConsultationFileCategory; originalFileName:string; mimeType:string; fileSize:number;
  uploadedByUserId:string|null; idempotencyKey:string|null; createdAt:string; updatedAt:string;
}
interface FileRow {id:string;workspace_id:string;consultation_id:string;drive_file_id:string;drive_folder_id:string;file_category:ConsultationFileCategory;original_file_name:string;mime_type:string;file_size:number;uploaded_by_user_id:string|null;idempotency_key:string|null;created_at:string;updated_at:string}
const map=(row:FileRow):ConsultationFileRecord=>({id:row.id,workspaceId:row.workspace_id,consultationId:row.consultation_id,driveFileId:row.drive_file_id,driveFolderId:row.drive_folder_id,fileCategory:row.file_category,originalFileName:row.original_file_name,mimeType:row.mime_type,fileSize:row.file_size,uploadedByUserId:row.uploaded_by_user_id,idempotencyKey:row.idempotency_key,createdAt:row.created_at,updatedAt:row.updated_at});

export async function listConsultationFiles(workspaceId:string,consultationId:string):Promise<ConsultationFileRecord[]> {
  const result=await (await getDb()).prepare(`SELECT * FROM consultation_files WHERE workspace_id=? AND consultation_id=? ORDER BY created_at DESC`).bind(workspaceId,consultationId).all<FileRow>();
  return result.results.map(map);
}
export async function findConsultationFile(workspaceId:string,consultationId:string,id:string):Promise<ConsultationFileRecord|null>{const row=await (await getDb()).prepare(`SELECT * FROM consultation_files WHERE workspace_id=? AND consultation_id=? AND id=? LIMIT 1`).bind(workspaceId,consultationId,id).first<FileRow>();return row?map(row):null;}
export async function findChecklistOriginal(consultationId:string):Promise<ConsultationFileRecord|null>{const row=await (await getDb()).prepare(`SELECT * FROM consultation_files WHERE consultation_id=? AND file_category='CHECKLIST_ORIGINAL' LIMIT 1`).bind(consultationId).first<FileRow>();return row?map(row):null;}
export async function findFileByUploadKey(consultationId:string,key:string):Promise<ConsultationFileRecord|null>{const row=await (await getDb()).prepare(`SELECT * FROM consultation_files WHERE consultation_id=? AND idempotency_key=? LIMIT 1`).bind(consultationId,key).first<FileRow>();return row?map(row):null;}
export async function saveConsultationFile(input:{workspaceId:string;consultationId:string;driveFileId:string;driveFolderId:string;fileCategory:ConsultationFileCategory;originalFileName:string;mimeType:string;fileSize:number;uploadedByUserId?:string|null;idempotencyKey?:string|null}):Promise<void>{await (await getDb()).prepare(`INSERT INTO consultation_files(id,workspace_id,consultation_id,drive_file_id,drive_folder_id,file_category,original_file_name,mime_type,file_size,uploaded_by_user_id,idempotency_key) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(drive_file_id) DO NOTHING`).bind(crypto.randomUUID(),input.workspaceId,input.consultationId,input.driveFileId,input.driveFolderId,input.fileCategory,input.originalFileName,input.mimeType,input.fileSize,input.uploadedByUserId??null,input.idempotencyKey??null).run();}
export async function findCategoryFolder(consultationId:string,category:UploadFileCategory):Promise<string|null>{const row=await (await getDb()).prepare(`SELECT drive_folder_id FROM consultation_drive_folders WHERE consultation_id=? AND file_category=? LIMIT 1`).bind(consultationId,category).first<{drive_folder_id:string}>();return row?.drive_folder_id??null;}
export async function saveCategoryFolder(workspaceId:string,consultationId:string,category:UploadFileCategory,folderId:string):Promise<void>{await (await getDb()).prepare(`INSERT INTO consultation_drive_folders(id,workspace_id,consultation_id,file_category,drive_folder_id) VALUES(?,?,?,?,?) ON CONFLICT(consultation_id,file_category) DO UPDATE SET drive_folder_id=excluded.drive_folder_id,updated_at=datetime('now')`).bind(crypto.randomUUID(),workspaceId,consultationId,category,folderId).run();}
