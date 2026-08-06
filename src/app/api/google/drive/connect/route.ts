import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { OAUTH_MAX_AGE, seal, setDriveOAuthCookie } from "@/lib/auth/session";
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

export async function GET() {
  let baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
  try {
    const config = getAuthConfig();
    baseUrl = config.baseUrl;
    const context = await getWorkspaceContextForSession();
    if (!context) return NextResponse.redirect(`${baseUrl}/?error=authentication_required`);
    if (context.membership.role !== "OWNER") {
      return NextResponse.redirect(`${baseUrl}/settings/integrations?error=owner_required`);
    }

    const state = randomValue();
    const codeVerifier = randomValue(48);
    const challenge = base64Url(new Uint8Array(await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(codeVerifier),
    )));
    const redirectUri = `${config.baseUrl}/api/google/drive/callback`;
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_FILE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
      state,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    setDriveOAuthCookie(response, await seal({
      state,
      codeVerifier,
      workspaceId: context.workspace.id,
      userId: context.user.id,
    }, OAUTH_MAX_AGE));
    return response;
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=configuration`);
  }
}
