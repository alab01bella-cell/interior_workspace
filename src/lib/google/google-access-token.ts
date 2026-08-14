import { getAuthConfig } from "@/lib/auth/config";
import type { WorkspaceGoogleConnection } from "@/types/workspace";
import { decryptRefreshToken } from "./token-encryption";
import { DRIVE_FILE_SCOPE } from "./drive-api";
import { DriveError } from "./drive-error";

export async function getGoogleAccessToken(connection:WorkspaceGoogleConnection):Promise<string> {
  if(connection.connectionStatus!=="CONNECTED"||!connection.encryptedRefreshToken||!connection.tokenIv||!connection.tokenAuthTag) throw new DriveError("REAUTH_REQUIRED","google_connection_unavailable");
  if(!connection.grantedScopes.includes(DRIVE_FILE_SCOPE)) throw new DriveError("PERMISSION_ERROR","google_permission_required");
  let refreshToken:string,config:ReturnType<typeof getAuthConfig>;
  try{refreshToken=await decryptRefreshToken({ciphertext:connection.encryptedRefreshToken,iv:connection.tokenIv,authTag:connection.tokenAuthTag},connection.workspaceId);config=getAuthConfig();}
  catch(error){throw new DriveError("CONFIG_ERROR",error instanceof Error?error.message:"drive_auth_configuration_failed");}
  let response:Response;
  try{response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"}),cache:"no-store",signal:AbortSignal.timeout(30_000)});}
  catch{throw new DriveError("TEMPORARY_ERROR","google_token_failed");}
  if(!response.ok) {
    const failure=await response.json().catch(()=>null) as {error?:unknown}|null;
    const errorCode=typeof failure?.error==="string"?failure.error:"unknown";
    console.error("Google OAuth token refresh failed",{status:response.status,error:errorCode});
    if(errorCode==="invalid_grant")throw new DriveError("REAUTH_REQUIRED","google_reauth_required");
    if(errorCode==="invalid_client"||errorCode==="unauthorized_client")throw new DriveError("CONFIG_ERROR","google_client_configuration_invalid");
    if(response.status===401||response.status===403)throw new DriveError("PERMISSION_ERROR","google_permission_required");
    throw new DriveError("TEMPORARY_ERROR","google_token_failed");
  }
  const body=await response.json() as {access_token?:string};if(!body.access_token)throw new DriveError("TEMPORARY_ERROR","google_token_failed");return body.access_token;
}
