import { NextRequest } from "next/server";
import { handlePublicSubmission } from "@/lib/consultations/public-submission";
import { findWorkspaceByShortCode } from "@/lib/workspaces/workspace-repository";

export const runtime="nodejs";

export async function POST(request:NextRequest,{params}:{params:Promise<{shortCode:string}>}) {
  const {shortCode}=await params;
  return handlePublicSubmission(request,await findWorkspaceByShortCode(shortCode));
}
