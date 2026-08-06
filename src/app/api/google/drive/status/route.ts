import { NextResponse } from "next/server";
import { getWorkspaceContextForSession } from "@/lib/auth/require-user";
import { findPublicDriveConnection } from "@/lib/google/drive-connection-repository";

export const runtime = "nodejs";

export async function GET() {
  const context = await getWorkspaceContextForSession();
  if (!context) return NextResponse.json({ error: "authentication_required" }, { status: 401 });
  const connection = await findPublicDriveConnection(context.workspace.id);
  if (!connection || connection.connectionStatus !== "CONNECTED") {
    return NextResponse.json({ status: "DISCONNECTED" }, { headers: { "cache-control": "no-store" } });
  }
  return NextResponse.json({
    status: "CONNECTED",
    email: connection.googleAccountEmail,
    workspaceName: context.workspace.name,
    folderId: connection.driveRootFolderId,
  }, { headers: { "cache-control": "no-store" } });
}
