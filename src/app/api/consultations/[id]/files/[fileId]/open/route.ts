import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { findConsultationFile } from "@/lib/consultations/consultation-file-repository";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { getDriveFileLink } from "@/lib/google/drive-api";
import { driveErrorKind } from "@/lib/google/drive-error";
export async function GET(request:Request,{params}:{params:Promise<{id:string;fileId:string}>}){const context=await getWorkspaceContextForSession();if(!context)return new NextResponse(null,{status:401});const {id,fileId}=await params;if(!await findConsultation(context.workspace.id,id))return new NextResponse(null,{status:404});const file=await findConsultationFile(context.workspace.id,id,fileId);if(!file)return NextResponse.redirect(new URL(`/consultations/${id}?driveFile=not_found`,request.url));const connection=await findDriveConnection(context.workspace.id);if(!connection)return NextResponse.redirect(new URL(`/consultations/${id}?driveFile=reauth`,request.url));try{const link=await getDriveFileLink(await getGoogleAccessToken(connection),file.driveFileId);return NextResponse.redirect(link?.webViewLink??new URL(`/consultations/${id}?driveFile=not_found`,request.url));}catch(error){const kind=driveErrorKind(error),value=kind==="REAUTH_REQUIRED"?"reauth":kind==="CONFIG_ERROR"?"config":kind==="PERMISSION_ERROR"?"permission":"temporary";return NextResponse.redirect(new URL(`/consultations/${id}?driveFile=${value}`,request.url));}}
