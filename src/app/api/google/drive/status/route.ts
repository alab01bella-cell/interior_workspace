import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findDriveConnection } from "@/lib/google/drive-connection-repository";
import { getGoogleAccessToken } from "@/lib/google/google-access-token";
import { driveErrorKind } from "@/lib/google/drive-error";

export const runtime = "nodejs";

export async function GET() {
  const context = await getWorkspaceContextForSession();
  if (!context) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const connection = await findDriveConnection(context.workspace.id);
  if (!connection || connection.connectionStatus !== "CONNECTED") {
    return NextResponse.json({ status: "DISCONNECTED" }, { headers: { "cache-control": "no-store" } });
  }
  try{await getGoogleAccessToken(connection);}catch(error){return NextResponse.json({status:driveErrorKind(error)},{headers:{"cache-control":"no-store"}});}
  return NextResponse.json({
    status: "CONNECTED",
    email: connection.googleAccountEmail,
    workspaceName: context.workspace.name,
    folderId: connection.driveRootFolderId,
  }, { headers: { "cache-control": "no-store" } });
}
