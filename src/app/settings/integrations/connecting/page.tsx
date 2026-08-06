import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { DriveConnectionProgress } from "@/components/integrations/drive-connection-progress";
import { requireWorkspace } from "@/lib/auth/require-user";
import { DRIVE_PROCESS_COOKIE } from "@/lib/auth/session";
import { findPublicDriveConnection } from "@/lib/google/drive-connection-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function DriveConnectingPage({ searchParams }: { searchParams: Promise<{ error?: string; pending?: string }> }) {
  const context = await requireWorkspace();
  const [params, cookieStore, connection] = await Promise.all([
    searchParams,
    cookies(),
    findPublicDriveConnection(context.workspace.id),
  ]);
  const completed = connection?.connectionStatus === "CONNECTED"
    ? {
        email: connection.googleAccountEmail,
        workspaceName: context.workspace.name,
        folderId: connection.driveRootFolderId,
      }
    : null;

  return (
    <AppShell identity={toWorkspaceIdentity(context)}>
      <main className="drive-progress-page">
        <DriveConnectionProgress
          initialCompletion={completed}
          initialError={params.error}
          hasPendingProcess={cookieStore.has(DRIVE_PROCESS_COOKIE)}
          recoverPending={params.pending === "1"}
        />
      </main>
    </AppShell>
  );
}
