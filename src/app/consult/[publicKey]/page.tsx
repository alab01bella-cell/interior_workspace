import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ensureConsultationShortCode, findWorkspaceByPublicKey } from "@/lib/workspaces/workspace-repository";
export const metadata:Metadata={title:"인테리어 상담 신청 | Interior Workspace"};
export default async function PublicConsultationPage({params}:{params:Promise<{publicKey:string}>}){const {publicKey}=await params;if(publicKey==="demo")notFound();const workspace=await findWorkspaceByPublicKey(publicKey);if(!workspace)notFound();redirect(`/c/${await ensureConsultationShortCode(workspace.id)}`);}
