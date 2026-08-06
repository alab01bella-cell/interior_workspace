import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { DRIVE_OAUTH_COOKIE, OAUTH_MAX_AGE, seal, setDriveOAuthCookie, unseal } from "@/lib/auth/session";
import { DRIVE_FILE_SCOPE } from "@/lib/google/drive-api";

export const runtime = "nodejs";

function randomValue(size = 32): string {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

interface DriveOAuthTransaction {
  state: string;
  codeVerifier: string;
  workspaceId: string;
  userId: string;
}

function authorizationUrl(config: ReturnType<typeof getAuthConfig>, transaction: DriveOAuthTransaction) {
  const redirectUri = `${config.baseUrl}/api/google/drive/callback`;
  const challengePromise = crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(transaction.codeVerifier),
  ).then((digest) => base64Url(new Uint8Array(digest)));
  return challengePromise.then((challenge) => {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_FILE_SCOPE,
      access_type: "offline",
      prompt: "select_account consent",
      include_granted_scopes: "true",
      state: transaction.state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();
    return url;
  });
}

export async function GET(request: NextRequest) {
  let baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  try {
    const config = getAuthConfig();
    baseUrl = config.baseUrl;
    const context = await getWorkspaceContextForSession();
    if (!context) return NextResponse.redirect(`${baseUrl}/?error=authentication_required`);
    if (context.membership.role !== "OWNER") {
      return NextResponse.redirect(`${baseUrl}/settings/integrations?error=owner_required`);
    }

    const existingToken = request.cookies.get(DRIVE_OAUTH_COOKIE)?.value;
    const existing = existingToken ? await unseal<DriveOAuthTransaction>(existingToken) : null;
    const transaction = existing?.workspaceId === context.workspace.id && existing.userId === context.user.id
      ? existing
      : {
          state: randomValue(),
          codeVerifier: randomValue(48),
          workspaceId: context.workspace.id,
          userId: context.user.id,
        };

    const response = NextResponse.redirect(await authorizationUrl(config, transaction));
    setDriveOAuthCookie(response, await seal(transaction, OAUTH_MAX_AGE));
    return response;
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=configuration`);
  }
}
