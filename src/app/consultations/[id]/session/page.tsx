import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { ConsultationSession } from "@/components/consultations/consultation-session";
import { requireWorkspace } from "@/lib/auth/require-user";
import { buildChecklistDocument,formatChecklistAnswer } from "@/lib/checklist/checklist-answer-document";
import { listChecklistReviews } from "@/lib/consultations/checklist-review-repository";
import { findConsultation } from "@/lib/consultations/consultation-repository";
import { formatConsultationRegion } from "@/lib/consultations/region-display";
import { toWorkspaceIdentity } from "@/lib/workspaces/workspace-repository";

export default async function ConsultationSessionRoute({params}:{params:Promise<{id:string}>}){const context=await requireWorkspace(),record=await findConsultation(context.workspace.id,(await params).id);if(!record)notFound();const fields=buildChecklistDocument(record.formVersion,record.answers).flatMap((section)=>section.fields.map((field)=>({section:section.title,questionKey:field.name,label:field.label,answer:formatChecklistAnswer(field.name,field.value)}))).filter((field)=>field.questionKey!=="privacyConsent");return <AppShell identity={toWorkspaceIdentity(context)}><ConsultationSession consultationId={record.id} customerName={record.clientName} meta={`${formatConsultationRegion(record.region)} · ${record.area}`} fields={fields} initialReviews={await listChecklistReviews(context.workspace.id,record.id)}/></AppShell>}
