import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { findConsultationFile } from "@/lib/consultations/consultation-file-repository";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { downloadDriveFile } from "@/lib/google/drive-api";
export async function GET(_request:Request,{params}:{params:Promise<{id:string;fileId:string}>}){const context=await getWorkspaceContextForSession();if(!context)return new Response(null,{status:401});const {id,fileId}=await params;if(!await findConsultation(context.workspace.id,id))return new Response(null,{status:404});const file=await findConsultationFile(context.workspace.id,id,fileId);if(!file||!file.mimeType.startsWith("image/"))return new Response(null,{status:404});const connection=await findDriveConnection(context.workspace.id);if(!connection)return new Response(null,{status:404});const source=await downloadDriveFile(await getGoogleAccessToken(connection),file.driveFileId);if(!source)return new Response("Drive에서 파일을 찾을 수 없습니다.",{status:404});return new Response(source.body,{headers:{"content-type":file.mimeType,"cache-control":"private, max-age=300","content-disposition":"inline"}});}
