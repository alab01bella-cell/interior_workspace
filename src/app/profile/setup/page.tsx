import { notFound, redirect } from "next/navigation";
import { ProfileSettingsPage } from "@/components/profile/profile-settings-page";
import { requireUser } from "@/lib/auth/require-user";
import { getServiceDisplayName } from "@/lib/auth/user-repository";
import { findPublicDriveConnection } from "@/lib/google/drive-connection-repository";
import { findActiveWorkspaceContext } from "@/lib/workspaces/workspace-repository";

export default async function InitialProfileSetupRoute(){
  const user=await requireUser();
  if(!user.onboardingCompleted)redirect("/onboarding");
  const context=await findActiveWorkspaceContext(user.id);
  if(!context)notFound();
  if(user.profileCompleted)redirect("/dashboard");
  const connection=await findPublicDriveConnection(context.workspace.id);
  return <main className="onboarding-page profile-setup-page"><ProfileSettingsPage setup name={getServiceDisplayName(user)} email={user.email} jobTitle={user.jobTitle??""} initialImageUrl={user.profileImageUrl} hasCustomImage={Boolean(user.customProfileDriveFileId)} driveConnected={connection?.connectionStatus==="CONNECTED"&&Boolean(connection.driveRootFolderId)}/></main>;
}
