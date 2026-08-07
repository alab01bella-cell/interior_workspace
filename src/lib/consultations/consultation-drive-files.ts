import { createAppResource, findAppResource, isUsableDriveFolder } from "@/lib/google/drive-api";
import { findCategoryFolder, saveCategoryFolder, type UploadFileCategory } from "./consultation-file-repository";

const FOLDER="application/vnd.google-apps.folder";
export const folderNames:Record<UploadFileCategory,string>={FIELD_PHOTO:"현장사진",BEFORE:"Before",AFTER:"After",DOCUMENT:"서류"};

export async function ensureCategoryFolder(input:{workspaceId:string;consultationId:string;consultationFolderId:string;category:UploadFileCategory;accessToken:string}):Promise<string>{
  let folder=await findCategoryFolder(input.consultationId,input.category);
  if(folder&&await isUsableDriveFolder(input.accessToken,folder))return folder;
  folder=await findAppResource(input.accessToken,input.consultationFolderId,"consultation_file_category",`${input.consultationId}:${input.category}`,FOLDER);
  if(!folder)folder=await createAppResource(input.accessToken,folderNames[input.category],input.consultationFolderId,FOLDER,"consultation_file_category",`${input.consultationId}:${input.category}`);
  await saveCategoryFolder(input.workspaceId,input.consultationId,input.category,folder);return folder;
}
