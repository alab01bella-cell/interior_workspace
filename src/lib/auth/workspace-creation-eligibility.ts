import { getDb } from "@/lib/db/client";
import { isSuperAdminEmail,normalizeAccountEmail } from "@/lib/admin/super-admin";

export type WorkspaceCreationEligibility={allowed:boolean;source:"SUPER_ADMIN"|"OWNER_ALLOWLIST"|"NONE"};

export async function canCreateWorkspace(email:string):Promise<WorkspaceCreationEligibility>{
  const normalized=normalizeAccountEmail(email);
  if(isSuperAdminEmail(normalized))return {allowed:true,source:"SUPER_ADMIN"};
  const row=await (await getDb()).prepare(`SELECT status FROM owner_signup_allowances WHERE email=? COLLATE NOCASE LIMIT 1`).bind(normalized).first<{status:"ALLOWED"|"COMPLETED"|"CANCELLED"}>();
  return row?.status==="ALLOWED"?{allowed:true,source:"OWNER_ALLOWLIST"}:{allowed:false,source:"NONE"};
}

export async function completeWorkspaceCreationEligibility(input:{email:string;userId:string;workspaceId:string;source:WorkspaceCreationEligibility["source"]}){
  if(input.source!=="OWNER_ALLOWLIST")return;
  const result=await (await getDb()).prepare(`UPDATE owner_signup_allowances SET status='COMPLETED',completed_user_id=?,completed_workspace_id=?,completed_at=datetime('now'),cancelled_at=NULL,updated_at=datetime('now') WHERE email=? COLLATE NOCASE AND status='ALLOWED'`).bind(input.userId,input.workspaceId,normalizeAccountEmail(input.email)).run();
  if(result.meta.changes!==1)throw new Error("owner_eligibility_unavailable");
}
