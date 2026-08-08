import { AppShell } from "@/components/layout/app-shell";
import { ConsultationsPage } from "@/components/consultations/consultations-page";
import type { ConsultationStatus } from "@/types/consultation";
import { requireWorkspace } from "@/lib/auth/require-user";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";
import { listConsultations, toConsultation } from "@/lib/consultations/consultation-repository";
import { listActiveTeamMembers } from "@/lib/workspaces/team-repository";

const statuses: ConsultationStatus[] = ["접수", "예약", "완료", "계약"];

export default async function ConsultationsRoute({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const context = await requireWorkspace();
  const { status } = await searchParams;
  const initialStatus = statuses.includes(status as ConsultationStatus) ? status as ConsultationStatus : "전체";
  const consultations=(await listConsultations(context.workspace.id)).map(toConsultation);
  const members=(await listActiveTeamMembers(context.workspace.id)).map(({userId,name})=>({userId,name}));
  return <AppShell identity={toWorkspaceIdentity(context)}><ConsultationsPage consultations={consultations} initialStatus={initialStatus} members={members} currentUserId={context.user.id}/></AppShell>;
}
