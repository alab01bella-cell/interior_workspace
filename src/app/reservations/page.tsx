import { AppShell } from "@/components/layout/app-shell";
import { ReservationsPage } from "@/components/consultations/reservations-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { listConsultations, toConsultation } from "@/lib/consultations/consultation-repository";
import { seoulDateKey } from "@/lib/consultations/reservation-time";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";
import { listActiveTeamMembers } from "@/lib/workspaces/team-repository";

export default async function ReservationsRoute(){
  const context=await requireWorkspace();
  const consultations=(await listConsultations(context.workspace.id)).map(toConsultation);
  const scheduled=consultations.filter((item)=>Boolean(item.scheduledAt)).sort((a,b)=>a.scheduledAt!.localeCompare(b.scheduledAt!));
  const received=consultations.filter((item)=>item.status==="접수"&&!item.scheduledAt);
  const members=(await listActiveTeamMembers(context.workspace.id)).map(({userId,name})=>({userId,name}));
  return <AppShell identity={toWorkspaceIdentity(context)}><ReservationsPage initialScheduled={scheduled} received={received} todayKey={seoulDateKey(new Date())} members={members} currentUserId={context.user.id}/></AppShell>;
}
