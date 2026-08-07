import type { UploadFileCategory } from "./consultation-file-repository";
export const MAX_FILE_SIZE=5*1024*1024,MAX_FILES=5,MAX_BATCH_SIZE=20*1024*1024;
const photo=new Set(["jpg","jpeg","png","webp","heic","heif"]);
const document=new Set(["pdf","jpg","jpeg","png","doc","docx","xls","xlsx","hwp"]);
const mimeByExtension:Record<string,Set<string>>={
  jpg:new Set(["image/jpeg"]),jpeg:new Set(["image/jpeg"]),png:new Set(["image/png"]),webp:new Set(["image/webp"]),
  heic:new Set(["image/heic","image/heif","application/octet-stream"]),heif:new Set(["image/heif","image/heic","application/octet-stream"]),
  pdf:new Set(["application/pdf"]),doc:new Set(["application/msword"]),docx:new Set(["application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
  xls:new Set(["application/vnd.ms-excel"]),xlsx:new Set(["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]),
  hwp:new Set(["application/x-hwp","application/haansofthwp","application/octet-stream"]),
};
export function isUploadCategory(value:unknown):value is UploadFileCategory{return value==="FIELD_PHOTO"||value==="BEFORE"||value==="AFTER"||value==="DOCUMENT";}
export function validateUploadFile(file:File,category:UploadFileCategory):string|null{
  if(!file.name||file.name.length>180)return "파일명이 올바르지 않습니다.";
  if(file.size<=0||file.size>MAX_FILE_SIZE)return "파일은 5MB 이하여야 합니다.";
  const extension=file.name.split(".").pop()?.toLowerCase()??"";
  if(!(category==="DOCUMENT"?document:photo).has(extension))return "지원하지 않는 파일 형식입니다.";
  if(file.type&&file.type!=="application/octet-stream"&&!mimeByExtension[extension]?.has(file.type))return "파일 형식과 내용 유형이 일치하지 않습니다.";
  return null;
}
