import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ChecklistPage } from "@/components/checklist/checklist-page";
import { findWorkspaceByShortCode } from "@/lib/workspaces/workspace-repository";

export const metadata:Metadata={title:"인테리어 상담 신청 | Interior Workspace"};

export default async function ShortConsultationPage({params}:{params:Promise<{shortCode:string}>}) {
  const {shortCode}=await params;
  const workspace=await findWorkspaceByShortCode(shortCode);
  if(!workspace)notFound();
  return <ChecklistPage mode="production" submissionPath={`/api/public/c/${encodeURIComponent(shortCode)}`} workspaceName={workspace.name}/>;
}
