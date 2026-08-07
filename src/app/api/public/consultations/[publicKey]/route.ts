import { NextRequest, NextResponse } from "next/server";
import { handlePublicSubmission } from "@/lib/consultations/public-submission";
import { findWorkspaceByPublicKey } from "@/lib/workspaces/workspace-repository";
export const runtime="nodejs";
export async function POST(request:NextRequest,{params}:{params:Promise<{publicKey:string}>}){const {publicKey}=await params;if(publicKey==="demo")return NextResponse.json({error:"demo_not_persisted"},{status:404});return handlePublicSubmission(request,await findWorkspaceByPublicKey(publicKey));}
