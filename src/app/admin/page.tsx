import { AppShell } from "@/components/layout/app-shell";
import { AdminOwnerAccess } from "@/components/admin/admin-owner-access";
import { requireWorkspace } from "@/lib/auth/require-user";
import { requireSuperAdminUser } from "@/lib/admin/super-admin";
import { listOwnerSignupAllowances } from "@/lib/admin/owner-signup-repository";
import { listAdminWorkspaces } from "@/lib/admin/workspace-admin-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function AdminPage(){const context=await requireWorkspace();requireSuperAdminUser(context.user);const [allowances,workspaces]=await Promise.all([listOwnerSignupAllowances(),listAdminWorkspaces()]);return <AppShell identity={toWorkspaceIdentity(context)}><AdminOwnerAccess initialAllowances={allowances} workspaces={workspaces}/></AppShell>}
