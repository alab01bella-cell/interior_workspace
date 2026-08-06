import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import {
  clearDriveOAuthCookie,
  DRIVE_OAUTH_COOKIE,
  OAUTH_MAX_AGE,
  seal,
  setDriveProcessCookie,
  unseal,
} from "@/lib/auth/session";

export const runtime = "nodejs";

interface DriveOAuthTransaction {
  state: string;
  codeVerifier: string;
  workspaceId: string;
  userId: string;
}

interface DriveProcessTransaction extends DriveOAuthTransaction {
  code: string;
}

export async function GET(request: NextRequest) {
  let baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
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

    const response = NextResponse.redirect(`${baseUrl}/settings/integrations/connecting?pending=1`);
    setDriveProcessCookie(response, await seal({ ...transaction, code } satisfies DriveProcessTransaction, OAUTH_MAX_AGE));
    clearDriveOAuthCookie(response);
    return response;
  } catch (error) {
    const known = error instanceof Error && ["access_denied", "invalid_state", "invalid_workspace_session", "owner_required"].includes(error.message)
      ? error.message
      : "temporary_error";
    const response = NextResponse.redirect(`${baseUrl}/settings/integrations/connecting?error=${encodeURIComponent(known)}`);
    clearDriveOAuthCookie(response);
    return response;
  }
}
