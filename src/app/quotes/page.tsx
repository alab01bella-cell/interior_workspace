import { AppShell } from "@/components/layout/app-shell";
import { QuotesPage } from "@/components/consultations/quotes-page";
import { requireWorkspace } from "@/lib/auth/require-user";
import { listConsultations,toConsultation } from "@/lib/consultations/consultation-repository";
import { listActiveTeamMembers } from "@/lib/workspaces/team-repository";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function QuotesRoute({searchParams}:{searchParams:Promise<{consultation?:string}>}){const context=await requireWorkspace();const consultations=(await listConsultations(context.workspace.id)).map(toConsultation).filter((item)=>item.status==="완료"||item.status==="계약"||item.quoteStatus!=="NOT_CREATED"||item.contractOutcome!=="PENDING");const members=(await listActiveTeamMembers(context.workspace.id)).map(({userId,name})=>({userId,name}));return <AppShell identity={toWorkspaceIdentity(context)}><QuotesPage consultations={consultations} members={members} currentUserId={context.user.id} initialConsultationId={(await searchParams).consultation}/></AppShell>}
