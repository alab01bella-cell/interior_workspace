import { AppShell } from "@/components/layout/app-shell";
import { TeamManagementPage } from "@/components/team/team-management-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { listTeamInvitations,listTeamMembers } from "@/lib/workspaces/team-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";
import { notFound } from "next/navigation";

export default async function TeamPage(){const context=await requireWorkspace();if(context.membership.role!=="OWNER")notFound();return <AppShell identity={toWorkspaceIdentity(context)}><TeamManagementPage workspaceName={context.workspace.name} isOwner initialMembers={await listTeamMembers(context.workspace.id)} initialInvitations={await listTeamInvitations(context.workspace.id)}/></AppShell>}
