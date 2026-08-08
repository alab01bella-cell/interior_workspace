import { createAppResource, findAppResource, isUsableDriveFolder, listDirectDriveChildren } from "@/lib/google/drive-api";
import { findCategoryFolder, listConsultationFiles, saveCategoryFolder, saveConsultationFile, type UploadFileCategory } from "./consultation-file-repository";

const FOLDER="application/vnd.google-apps.folder";
export const folderNames:Record<UploadFileCategory,string>={FIELD_PHOTO:"현장사진",BEFORE:"Before",AFTER:"After",DOCUMENT:"서류"};

export async function ensureCategoryFolder(input:{workspaceId:string;consultationId:string;consultationFolderId:string;category:UploadFileCategory;accessToken:string}):Promise<string>{
  let folder=await findCategoryFolder(input.consultationId,input.category);
  if(folder&&await isUsableDriveFolder(input.accessToken,folder))return folder;
  folder=await findAppResource(input.accessToken,input.consultationFolderId,"consultation_file_category",`${input.consultationId}:${input.category}`,FOLDER);
  if(!folder)folder=await createAppResource(input.accessToken,folderNames[input.category],input.consultationFolderId,FOLDER,"consultation_file_category",`${input.consultationId}:${input.category}`);
  await saveCategoryFolder(input.workspaceId,input.consultationId,input.category,folder);return folder;
}

const reconcileCategories:UploadFileCategory[]=["FIELD_PHOTO","BEFORE","AFTER","DOCUMENT"];
export async function reconcileConsultationDriveFiles(input:{workspaceId:string;consultationId:string;consultationFolderId:string;accessToken:string}):Promise<{discovered:number}> {
  const consultationChildren=await listDirectDriveChildren(input.accessToken,input.consultationFolderId);
  const existing=await listConsultationFiles(input.workspaceId,input.consultationId);
  const knownDriveIds=new Set(existing.map((file)=>file.driveFileId));
  let discovered=0;
  for(const category of reconcileCategories){
    let folderId=await findCategoryFolder(input.consultationId,category);
    if(folderId&&!consultationChildren.some((file)=>file.id===folderId&&file.mimeType===FOLDER))folderId=null;
    if(!folderId){
      const expectedProperty=`${input.consultationId}:${category}`;
      const folder=consultationChildren.find((file)=>file.mimeType===FOLDER&&file.appProperties.consultation_file_category===expectedProperty)
        ??consultationChildren.find((file)=>file.mimeType===FOLDER&&file.name===folderNames[category]);
      if(!folder)continue;
      folderId=folder.id;
      await saveCategoryFolder(input.workspaceId,input.consultationId,category,folderId);
    }
    const children=await listDirectDriveChildren(input.accessToken,folderId);
    for(const file of children){
      if(file.mimeType===FOLDER||knownDriveIds.has(file.id))continue;
      await saveConsultationFile({workspaceId:input.workspaceId,consultationId:input.consultationId,driveFileId:file.id,driveFolderId:folderId,fileCategory:category,originalFileName:file.name,mimeType:file.mimeType,fileSize:file.size,idempotencyKey:`reconcile:${file.id}`});
      knownDriveIds.add(file.id);discovered++;
    }
  }
  return {discovered};
}
