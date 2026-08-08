import { AppShell } from "@/components/layout/app-shell";
import { ProfileSettingsPage } from "@/components/profile/profile-settings-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { findPublicDriveConnection } from "@/lib/google/drive-connection-repository";
import { getServiceDisplayName } from "@/lib/auth/user-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function ProfileSettingsRoute(){const context=await requireWorkspace();const connection=await findPublicDriveConnection(context.workspace.id);return <AppShell identity={toWorkspaceIdentity(context)}><ProfileSettingsPage name={getServiceDisplayName(context.user)} email={context.user.email} initialImageUrl={context.user.profileImageUrl} hasCustomImage={Boolean(context.user.customProfileDriveFileId)} driveConnected={connection?.connectionStatus==="CONNECTED"&&Boolean(connection.driveRootFolderId)}/></AppShell>}
