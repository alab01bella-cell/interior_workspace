import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { isUploadCategory } from "@/lib/consultations/file-policy";
import { ensureCategoryFolder } from "@/lib/consultations/consultation-drive-files";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { driveErrorKind } from "@/lib/google/drive-error";
export async function GET(request:Request,{params}:{params:Promise<{id:string;category:string}>}){const context=await getWorkspaceContextForSession();if(!context)return new NextResponse(null,{status:401});const {id,category}=await params;if(!isUploadCategory(category))return new NextResponse(null,{status:400});const consultation=await findConsultation(context.workspace.id,id);if(!consultation?.driveFolderId)return new NextResponse("파일 폴더를 찾을 수 없습니다.",{status:404});const connection=await findDriveConnection(context.workspace.id);if(!connection)return NextResponse.redirect(new URL("/settings/integrations?error=reauth_required",request.url));try{const folder=await ensureCategoryFolder({workspaceId:context.workspace.id,consultationId:id,consultationFolderId:consultation.driveFolderId,category,accessToken:await getGoogleAccessToken(connection)});return NextResponse.redirect(`https://drive.google.com/drive/folders/${encodeURIComponent(folder)}`);}catch(error){const kind=driveErrorKind(error),value=kind==="REAUTH_REQUIRED"?"reauth_required":kind==="CONFIG_ERROR"?"config":kind==="PERMISSION_ERROR"?"permission":"temporary";return NextResponse.redirect(new URL(`/settings/integrations?error=${value}`,request.url));}}
