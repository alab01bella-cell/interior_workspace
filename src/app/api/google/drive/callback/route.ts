import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { clearDriveOAuthCookie, DRIVE_OAUTH_COOKIE, unseal } from "@/lib/auth/session";
import {
  createDriveRootFolder,
  deleteDriveFolder,
  DRIVE_FILE_SCOPE,
  getDriveAccountEmail,
  isUsableDriveFolder,
} from "@/lib/google/drive-api";
import { findDriveConnection, saveConnectedDrive } from "@/lib/google/drive-connection-repository";
import { encryptRefreshToken } from "@/lib/google/token-encryption";

export const runtime = "nodejs";

interface DriveOAuthTransaction {
  state: string;
  codeVerifier: string;
  workspaceId: string;
  userId: string;
}

interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
}

function redirectWithResult(baseUrl: string, key: "error" | "result", value: string) {
  return NextResponse.redirect(`${baseUrl}/settings/integrations?${key}=${encodeURIComponent(value)}`);
}

export async function GET(request: NextRequest) {
  let baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
  let createdFolderId: string | null = null;
  let accessTokenForCompensation: string | null = null;
  try {
    const config = getAuthConfig();
    baseUrl = config.baseUrl;
    const oauthError = request.nextUrl.searchParams.get("error");
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const transactionToken = request.cookies.get(DRIVE_OAUTH_COOKIE)?.value;
    const transaction = transactionToken ? await unseal<DriveOAuthTransaction>(transactionToken) : null;
    if (!state || !transaction || state !== transaction.state) throw new Error("invalid_state");
    if (oauthError) throw new Error("access_denied");
    if (!code) throw new Error("invalid_state");

    const context = await getWorkspaceContextForSession();
    if (!context || context.user.id !== transaction.userId || context.workspace.id !== transaction.workspaceId) {
      throw new Error("invalid_workspace_session");
    }
    if (context.membership.role !== "OWNER") throw new Error("owner_required");

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: `${config.baseUrl}/api/google/drive/callback`,
        grant_type: "authorization_code",
        code_verifier: transaction.codeVerifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("token_exchange_failed");
    const tokens = await tokenResponse.json() as TokenResponse;
    if (!tokens.access_token || !tokens.expires_in) throw new Error("invalid_token_response");
    accessTokenForCompensation = tokens.access_token;
    const grantedScopes = (tokens.scope ?? "").split(" ").filter(Boolean);
    if (!grantedScopes.includes(DRIVE_FILE_SCOPE)) throw new Error("drive_scope_missing");

    const [email, existing] = await Promise.all([
      getDriveAccountEmail(tokens.access_token),
      findDriveConnection(context.workspace.id),
    ]);
    const encryptedToken = tokens.refresh_token
      ? await encryptRefreshToken(tokens.refresh_token, context.workspace.id)
      : existing?.encryptedRefreshToken && existing.tokenIv && existing.tokenAuthTag
        ? {
            ciphertext: existing.encryptedRefreshToken,
            iv: existing.tokenIv,
            authTag: existing.tokenAuthTag,
          }
        : null;
    if (!encryptedToken) throw new Error("refresh_token_missing");

    let folderId = existing?.driveRootFolderId ?? null;
    if (folderId && !await isUsableDriveFolder(tokens.access_token, folderId)) folderId = null;
    if (!folderId) {
      folderId = await createDriveRootFolder(tokens.access_token, context.workspace.name);
      createdFolderId = folderId;
    }

    await saveConnectedDrive({
      workspaceId: context.workspace.id,
      userId: context.user.id,
      email,
      token: encryptedToken,
      grantedScopes,
      folderId,
    });
    createdFolderId = null;
    const response = redirectWithResult(baseUrl, "result", "connected");
    clearDriveOAuthCookie(response);
    return response;
  } catch (error) {
    if (createdFolderId && accessTokenForCompensation) {
      try { await deleteDriveFolder(accessTokenForCompensation, createdFolderId); } catch { /* best-effort compensation */ }
    }
    const known = error instanceof Error && ["access_denied", "invalid_state", "owner_required"].includes(error.message)
      ? error.message
      : "drive_connection_failed";
    const response = redirectWithResult(baseUrl, "error", known);
    clearDriveOAuthCookie(response);
    return response;
  }
}
