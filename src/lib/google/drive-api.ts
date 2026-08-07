export const DRIVE_FILE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const DRIVE_API = "https://www.googleapis.com/drive/v3";

async function driveFetch(accessToken: string, path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${DRIVE_API}${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(30_000),
    headers: {
      authorization: `Bearer ${accessToken}`,
      ...(init?.body ? { "content-type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function getDriveAccountEmail(accessToken: string): Promise<string> {
  const response = await driveFetch(accessToken, "/about?fields=user(emailAddress)");
  if (!response.ok) throw new Error("drive_account_unavailable");
  const data = await response.json() as { user?: { emailAddress?: string } };
  if (!data.user?.emailAddress) throw new Error("drive_account_unavailable");
  return data.user.emailAddress;
}

export async function isUsableDriveFolder(accessToken: string, folderId: string): Promise<boolean> {
  const response = await driveFetch(accessToken, `/files/${encodeURIComponent(folderId)}?fields=id,trashed,mimeType`);
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("drive_folder_check_failed");
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
  if (!response.ok) throw new Error("drive_folder_create_failed");
  const file = await response.json() as { id?: string };
  if (!file.id) throw new Error("drive_folder_create_failed");
  return file.id;
}

export async function createDriveFolder(accessToken:string,name:string,parentId:string):Promise<string> {
  const response=await driveFetch(accessToken,"/files?fields=id",{method:"POST",body:JSON.stringify({name,mimeType:"application/vnd.google-apps.folder",parents:[parentId]})});
  if(!response.ok) throw new Error("drive_folder_create_failed");
  const file=await response.json() as {id?:string}; if(!file.id) throw new Error("drive_folder_create_failed"); return file.id;
}

export async function findAppResource(accessToken:string,parentId:string,key:string,value:string,mimeType:string):Promise<string|null>{
  const q=`'${parentId.replace(/'/g,"\\'")}' in parents and trashed=false and mimeType='${mimeType}' and appProperties has { key='${key}' and value='${value}' }`;
  const response=await driveFetch(accessToken,`/files?q=${encodeURIComponent(q)}&fields=files(id)&pageSize=1`);
  if(!response.ok)throw new Error("drive_resource_find_failed"); const data=await response.json() as {files?:{id:string}[]}; return data.files?.[0]?.id??null;
}
export async function createAppResource(accessToken:string,name:string,parentId:string,mimeType:string,key:string,value:string):Promise<string>{
  const response=await driveFetch(accessToken,"/files?fields=id",{method:"POST",body:JSON.stringify({name,mimeType,parents:[parentId],appProperties:{[key]:value}})});
  if(!response.ok)throw new Error("drive_resource_create_failed");const file=await response.json() as {id?:string};if(!file.id)throw new Error("drive_resource_create_failed");return file.id;
}

export async function createSpreadsheetFile(accessToken:string,name:string,parentId:string):Promise<string> {
  const response=await driveFetch(accessToken,"/files?fields=id",{method:"POST",body:JSON.stringify({name,mimeType:"application/vnd.google-apps.spreadsheet",parents:[parentId]})});
  if(!response.ok) throw new Error("spreadsheet_create_failed");
  const file=await response.json() as {id?:string}; if(!file.id) throw new Error("spreadsheet_create_failed"); return file.id;
}

export async function deleteDriveFolder(accessToken: string, folderId: string): Promise<void> {
  await driveFetch(accessToken, `/files/${encodeURIComponent(folderId)}`, { method: "DELETE" });
}
