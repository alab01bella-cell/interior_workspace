import { AppShell } from "@/components/layout/app-shell";
import { ConsultationDetailPage } from "@/components/consultations/consultation-detail-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function ConsultationDetailRoute() {
  const context = await requireWorkspace();
  return <AppShell identity={toWorkspaceIdentity(context)}><ConsultationDetailPage /></AppShell>;
}
