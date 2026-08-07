import { getAuthConfig } from "@/lib/auth/config";
import type { WorkspaceGoogleConnection } from "@/types/workspace";
import { decryptRefreshToken } from "./token-encryption";
import { DRIVE_FILE_SCOPE } from "./drive-api";

export async function getGoogleAccessToken(connection:WorkspaceGoogleConnection):Promise<string> {
  if(connection.connectionStatus!=="CONNECTED"||!connection.encryptedRefreshToken||!connection.tokenIv||!connection.tokenAuthTag) throw new Error("google_connection_unavailable");
  if(!connection.grantedScopes.includes(DRIVE_FILE_SCOPE)) throw new Error("google_permission_required");
  const refreshToken=await decryptRefreshToken({ciphertext:connection.encryptedRefreshToken,iv:connection.tokenIv,authTag:connection.tokenAuthTag},connection.workspaceId);
  const config=getAuthConfig();
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:config.clientId,client_secret:config.clientSecret,refresh_token:refreshToken,grant_type:"refresh_token"}),cache:"no-store",signal:AbortSignal.timeout(30_000)});
  if(!response.ok) { if(response.status===400||response.status===401) throw new Error("google_permission_required"); throw new Error("google_token_failed"); }
  const body=await response.json() as {access_token?:string}; if(!body.access_token) throw new Error("google_token_failed"); return body.access_token;
}
