import { createRemoteJWKSet, jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { clearOAuthCookie, clearSession, OAUTH_COOKIE, setSession, unseal } from "@/lib/auth/session";
import { findOrCreateGoogleUser, findUserByGoogleSub, hasActiveWorkspaceMembership, toAuthUser } from "@/lib/auth/user-repository";
import { acceptInvitation } from "@/lib/workspaces/team-repository";
import { canCreateWorkspace } from "@/lib/auth/workspace-creation-eligibility";

export const runtime = "nodejs";

const googleKeys = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

interface OAuthTransaction {
  state: string;
  nonce: string;
  codeVerifier: string;
  inviteToken?: string|null;
}

function errorRedirect(baseUrl: string, error: string) {
  return NextResponse.redirect(`${baseUrl}/login?error=${encodeURIComponent(error)}`);
}

export async function GET(request: NextRequest) {
  let baseUrl = process.env.AUTH_URL?.replace(/\/$/, "") ?? request.nextUrl.origin;
  try {
    const config = getAuthConfig();
    baseUrl = config.baseUrl;
    const oauthError = request.nextUrl.searchParams.get("error");
    const code = request.nextUrl.searchParams.get("code");
    const state = request.nextUrl.searchParams.get("state");
    const transactionToken = request.cookies.get(OAUTH_COOKIE)?.value;
    const transaction = transactionToken ? await unseal<OAuthTransaction>(transactionToken) : null;

    if (oauthError) throw new Error("access_denied");
    if (!code || !state || !transaction || state !== transaction.state) throw new Error("invalid_state");

    const redirectUri = `${config.baseUrl}/api/auth/google/callback`;
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: config.clientId,
        client_secret: config.clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: transaction.codeVerifier,
      }),
      cache: "no-store",
    });
    if (!tokenResponse.ok) throw new Error("token_exchange");
    const tokens = await tokenResponse.json() as { id_token?: string };
    if (!tokens.id_token) throw new Error("missing_id_token");

    const { payload } = await jwtVerify(tokens.id_token, googleKeys, {
      audience: config.clientId,
      issuer: ["https://accounts.google.com", "accounts.google.com"],
    });
    if (payload.nonce !== transaction.nonce) throw new Error("invalid_nonce");
    if (!payload.sub || typeof payload.email !== "string" || typeof payload.name !== "string" || payload.email_verified !== true) {
      throw new Error("invalid_profile");
    }

    const googleProfile={
      googleSub: payload.sub,
      email: payload.email,
      googleName: payload.name,
      profileImageUrl: typeof payload.picture === "string" ? payload.picture : null,
    };
    const existing=await findUserByGoogleSub(payload.sub);
    const registered=Boolean(existing&&await hasActiveWorkspaceMembership(existing.id));
    const ownerEligibility=await canCreateWorkspace(payload.email);
    if(!transaction.inviteToken&&!registered&&!ownerEligibility.allowed){
      const response=NextResponse.redirect(`${config.baseUrl}/login?error=registration_required`);
      clearSession(response);clearOAuthCookie(response);return response;
    }
    const user=await findOrCreateGoogleUser(googleProfile);
    let destination = registered?user.profileCompleted?"/dashboard":"/profile/setup":"/onboarding";
    if(transaction.inviteToken){const accepted=await acceptInvitation({token:transaction.inviteToken,userId:user.id,email:user.email});destination=accepted.ok?user.profileCompleted?"/dashboard":"/profile/setup":`/invite/${encodeURIComponent(transaction.inviteToken)}?error=${accepted.error}`;}
    const response = NextResponse.redirect(`${config.baseUrl}${destination}`);
    await setSession(response, toAuthUser(user));
    clearOAuthCookie(response);
    return response;
  } catch (error) {
    const code = error instanceof Error && ["access_denied", "invalid_state"].includes(error.message)
      ? error.message
      : "callback_failed";
    const response = errorRedirect(baseUrl, code);
    clearOAuthCookie(response);
    return response;
  }
}
