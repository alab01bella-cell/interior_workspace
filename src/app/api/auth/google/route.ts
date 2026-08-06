import { NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { OAUTH_MAX_AGE, seal, setOAuthCookie } from "@/lib/auth/session";

export const runtime = "nodejs";

function randomValue(size = 32) {
  const bytes = crypto.getRandomValues(new Uint8Array(size));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function GET() {
  try {
    const config = getAuthConfig();
    const state = randomValue();
    const nonce = randomValue();
    const codeVerifier = randomValue(48);
    const challenge = base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(codeVerifier))));
    const redirectUri = `${config.baseUrl}/api/auth/google/callback`;
    const authorizationUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authorizationUrl.search = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "openid email profile",
      state,
      nonce,
      code_challenge: challenge,
      code_challenge_method: "S256",
    }).toString();

    const response = NextResponse.redirect(authorizationUrl);
    setOAuthCookie(response, await seal({ state, nonce, codeVerifier }, OAUTH_MAX_AGE));
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=configuration", process.env.AUTH_URL ?? "http://localhost:3000"));
  }
}
