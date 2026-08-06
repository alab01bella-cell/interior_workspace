import { NextRequest, NextResponse } from "next/server";
import { getAuthConfig } from "@/lib/auth/config";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findDriveConnection, markDriveRevoked } from "@/lib/google/drive-connection-repository";
import { decryptRefreshToken } from "@/lib/google/token-encryption";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const { baseUrl } = getAuthConfig();
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(baseUrl).origin) {
    return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
  }
  const context = await getWorkspaceContextForSession();
  if (!context) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (context.membership.role !== "OWNER") return NextResponse.json({ error: "Owner required" }, { status: 403 });

  const connection = await findDriveConnection(context.workspace.id);
  if (!connection || connection.connectionStatus !== "CONNECTED") {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=not_connected`, 303);
  }

  let revokeFailed = false;
  try {
    if (!connection.encryptedRefreshToken || !connection.tokenIv || !connection.tokenAuthTag) throw new Error("missing_token");
    const refreshToken = await decryptRefreshToken({
      ciphertext: connection.encryptedRefreshToken,
      iv: connection.tokenIv,
      authTag: connection.tokenAuthTag,
    }, context.workspace.id);
    const revokeResponse = await fetch("https://oauth2.googleapis.com/revoke", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token: refreshToken }),
      cache: "no-store",
    });
    revokeFailed = !revokeResponse.ok;
  } catch {
    revokeFailed = true;
  }

  try {
    await markDriveRevoked(context.workspace.id);
  } catch {
    return NextResponse.redirect(`${baseUrl}/settings/integrations?error=disconnect_failed`, 303);
  }
  const query = revokeFailed ? "result=disconnected&warning=revoke_failed" : "result=disconnected";
  return NextResponse.redirect(`${baseUrl}/settings/integrations?${query}`, 303);
}
