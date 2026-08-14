import { DriveError,driveApiError } from "./drive-error";

export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";
const DRIVE_UPLOAD_API = "https://www.googleapis.com/upload/drive/v3";

async function driveFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${DRIVE_API}${path}`, {
      ...init,
      signal: init?.signal ?? AbortSignal.timeout(30_000),
      headers: {
        authorization: `Bearer ${accessToken}`,
        ...(init?.body ? { "content-type": "application/json" } : {}),
        ...init?.headers,
      },
      cache: "no-store",
    });
  } catch {
    throw new DriveError("TEMPORARY_ERROR","drive_network_failed");
  }
}

export async function getDriveAccountEmail(accessToken: string): Promise<string> {
  const response = await driveFetch(accessToken, "/about?fields=user(emailAddress)");
  if (!response.ok) throw driveApiError(response.status,"drive_account_unavailable");
  const data = await response.json() as { user?: { emailAddress?: string } };
  if (!data.user?.emailAddress) throw new Error("drive_account_unavailable");
  return data.user.emailAddress;
}

export async function isUsableDriveFolder(accessToken: string, folderId: string): Promise<boolean> {
  const response = await driveFetch(accessToken, `/files/${encodeURIComponent(folderId)}?fields=id,trashed,mimeType`);
  if (response.status === 404) return false;
  if (!response.ok) throw driveApiError(response.status,"drive_folder_check_failed");
  const file = await response.json() as { trashed?: boolean; mimeType?: string };
  return file.trashed !== true && file.mimeType === "application/vnd.google-apps.folder";
}

export async function createDriveRootFolder(accessToken: string, workspaceName: string): Promise<string> {
  const response = await driveFetch(accessToken, "/files?fields=id", {
    method: "POST",
    body: JSON.stringify({
      name: `Interior Workspace - ${workspaceName}`,
      mimeType: "application/vnd.google-apps.folder",
    }),
  });
  if (!response.ok) throw driveApiError(response.status,"drive_folder_create_failed");
  const file = await response.json() as { id?: string };
  if (!file.id) throw new Error("drive_folder_create_failed");
  return file.id;
}

export async function createDriveFolder(accessToken:string,name:string,parentId:string):Promise<string> {
  const response=await driveFetch(accessToken,"/files?fields=id",{method:"POST",body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder",parents:[parentId]})});
  if(!response.ok) throw driveApiError(response.status,"drive_folder_create_failed");
  const file=await response.json() as {id?:string}; if(!file.id) throw new Error("drive_folder_create_failed"); return file.id;
}

export async function findAppResource(accessToken:string,parentId:string,key:string,value:string,mimeType:string):Promise<string|null>{
  const q=`'${parentId.replace(/'/g,"\\'")}' in parents and trashed=false and mimeType='${mimeType}' and appProperties has { key='${key}' and value='${value}' }`;
  const response=await driveFetch(accessToken,`/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  if(!response.ok)throw driveApiError(response.status,"drive_resource_find_failed"); const data=await response.json() as {files?:{id:string}[]}; return data.files?.[0]?.id??null;
}
export async function createAppResource(accessToken:string,name:string,parentId:string,mimeType:string,key:string,value:string):Promise<string>{
  const response=await driveFetch(accessToken,"/files?fields=id",{method:"POST",body:JSON.stringify({name,mimeType,parents:[parentId],appProperties:{[key]:value}})});
  if(!response.ok)throw driveApiError(response.status,"drive_resource_create_failed");const file=await response.json() as {id?:string};if(!file.id)throw new Error("drive_resource_create_failed");return file.id;
}

export async function uploadDriveFile(accessToken:string,input:{name:string;parentId:string;mimeType:string;bytes:ArrayBuffer|Uint8Array;appProperties?:Record<string,string>}):Promise<{id:string;size:number}> {
  const boundary=`iw_${crypto.randomUUID().replace(/-/g,"")}`;
  const encoder=new TextEncoder();
  const metadata=JSON.stringify({name:input.name,parents:[input.parentId],appProperties:input.appProperties});
  const payload=input.bytes instanceof ArrayBuffer?input.bytes:new Uint8Array(input.bytes).buffer;
  const body=new Blob([
    encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`),
    payload,
    encoder.encode(`\r\n--${boundary}--`),
  ]);
  let response:Response;try{response=await fetch(`${DRIVE_UPLOAD_API}/files?uploadType=multipart&fields=id,size`,{method:"POST",headers:{authorization:`Bearer ${accessToken}`,"content-type":`multipart/related; boundary=${boundary}`},body,cache:"no-store",signal:AbortSignal.timeout(60_000)});}catch{throw new DriveError("TEMPORARY_ERROR","drive_network_failed");}
  if(!response.ok)throw driveApiError(response.status,"drive_file_upload_failed");
  const file=await response.json() as {id?:string;size?:string};const uploadedSize=Number(file.size);if(!file.id||!Number.isFinite(uploadedSize)||uploadedSize!==payload.byteLength)throw new Error("drive_upload_size_mismatch");return {id:file.id,size:uploadedSize};
}

export async function updateDriveFile(accessToken:string,input:{fileId:string;name:string;mimeType:string;bytes:ArrayBuffer|Uint8Array}):Promise<{id:string;size:number}> {
  const boundary=`iw_${crypto.randomUUID().replace(/-/g,"")}`,encoder=new TextEncoder();
  const payload=input.bytes instanceof ArrayBuffer?input.bytes:new Uint8Array(input.bytes).buffer;
  const body=new Blob([encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify({name:input.name})}\r\n--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`),payload,encoder.encode(`\r\n--${boundary}--`)]);
  let response:Response;try{response=await fetch(`${DRIVE_UPLOAD_API}/files/${encodeURIComponent(input.fileId)}?uploadType=multipart&fields=id,size`,{method:"PATCH",headers:{authorization:`Bearer ${accessToken}`,"content-type":`multipart/related; boundary=${boundary}`},body,cache:"no-store",signal:AbortSignal.timeout(60_000)});}catch{throw new DriveError("TEMPORARY_ERROR","drive_network_failed");}
  if(!response.ok)throw driveApiError(response.status,"drive_file_update_failed");
  const file=await response.json() as {id?:string;size?:string};const size=Number(file.size);if(!file.id||size!==payload.byteLength)throw new Error("drive_upload_size_mismatch");return {id:file.id,size};
}

export async function getDriveFileLink(accessToken:string,fileId:string):Promise<{webViewLink:string;name:string}|null>{
  const response=await driveFetch(accessToken,`/files/${encodeURIComponent(fileId)}?fields=id,name,trashed,webViewLink`);
  if(response.status===404)return null;if(!response.ok)throw driveApiError(response.status,"drive_file_check_failed");
  const file=await response.json() as {name?:string;trashed?:boolean;webViewLink?:string};if(file.trashed||!file.webViewLink)return null;return {webViewLink:file.webViewLink,name:file.name??""};
}
export async function downloadDriveFile(accessToken:string,fileId:string):Promise<Response|null>{const response=await driveFetch(accessToken,`/files/${encodeURIComponent(fileId)}?alt=media`);if(response.status===404)return null;if(!response.ok)throw driveApiError(response.status,"drive_file_download_failed");return response;}

export interface DriveChildFile {
  id:string; name:string; mimeType:string; size:number; createdTime:string; appProperties:Record<string,string>;
}
export async function listDirectDriveChildren(accessToken:string,parentId:string):Promise<DriveChildFile[]> {
  const files:DriveChildFile[]=[]; let pageToken="";
  do {
    const q=`'${parentId.replace(/'/g,"\\'")}' in parents and trashed=false`;
    const query=new URLSearchParams({q,fields:"nextPageToken,files(id,name,mimeType,size,createdTime,appProperties)",pageSize:"1000"});
    if(pageToken)query.set("pageToken",pageToken);
    const response=await driveFetch(accessToken,`/files?${query.toString()}`);
    if(!response.ok)throw driveApiError(response.status,"drive_children_list_failed");
    const data=await response.json() as {nextPageToken?:string;files?:Array<{id?:string;name?:string;mimeType?:string;size?:string;createdTime?:string;appProperties?:Record<string,string>}>};
    for(const file of data.files??[])if(file.id&&file.name&&file.mimeType)files.push({id:file.id,name:file.name,mimeType:file.mimeType,size:Number(file.size)||0,createdTime:file.createdTime??new Date(0).toISOString(),appProperties:file.appProperties??{}});
    pageToken=data.nextPageToken??"";
  } while(pageToken);
  return files;
}

export async function createSpreadsheetFile(accessToken:string,name:string,parentId:string):Promise<string> {
  const response=await driveFetch(accessToken,"/files?fields=id",{method:"POST",body:JSON.stringify({name,mimeType:"application/vnd.google-apps.spreadsheet",parents:[parentId]})});
  if(!response.ok) throw new Error("spreadsheet_create_failed");
  const file=await response.json() as {id?:string}; if(!file.id) throw new Error("spreadsheet_create_failed"); return file.id;
}

export async function deleteDriveFolder(accessToken: string, folderId: string): Promise<void> {
  await driveFetch(accessToken, `/files/${encodeURIComponent(folderId)}`, { method: "DELETE" });
}
