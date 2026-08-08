import { AppShell } from "@/components/layout/app-shell";
import { TeamManagementPage } from "@/components/team/team-management-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { listTeamInvitations,listTeamMembers } from "@/lib/workspaces/team-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function TeamPage(){const context=await requireWorkspace();const isOwner=context.membership.role==="OWNER";return <AppShell identity={toWorkspaceIdentity(context)}><TeamManagementPage workspaceName={context.workspace.name} isOwner={isOwner} initialMembers={await listTeamMembers(context.workspace.id)} initialInvitations={isOwner?await listTeamInvitations(context.workspace.id):[]}/></AppShell>}
