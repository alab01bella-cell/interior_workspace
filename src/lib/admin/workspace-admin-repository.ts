import { getDb } from "@/lib/db/client";
import { getServiceDisplayName } from "@/lib/auth/user-repository";
import type { WorkspacePlan,WorkspaceStatus } from "@/types/workspace";

export interface AdminWorkspaceSummary{
  workspaceId:string;
  workspaceName:string;
  ownerUserId:string;
  ownerName:string;
  ownerEmail:string;
  joinedAt:string;
  status:WorkspaceStatus;
  ownerAllowanceId:string|null;
  billing:{plan:WorkspacePlan;subscriptionStatus:null;nextBillingAt:null};
}

interface Row{
  workspace_id:string;workspace_name:string;owner_user_id:string;owner_email:string;
  owner_google_name:string;owner_display_name:string|null;joined_at:string;
  workspace_status:WorkspaceStatus;plan:WorkspacePlan;allowance_id:string|null;
}

export async function listAdminWorkspaces():Promise<AdminWorkspaceSummary[]>{
  const rows=await (await getDb()).prepare(`
    SELECT w.id AS workspace_id,w.name AS workspace_name,w.owner_user_id,
      w.status AS workspace_status,w.plan,u.email AS owner_email,
      u.google_name AS owner_google_name,u.display_name AS owner_display_name,
      COALESCE(wm.joined_at,w.created_at) AS joined_at,osa.id AS allowance_id
    FROM workspaces w
    JOIN users u ON u.id=w.owner_user_id
    LEFT JOIN workspace_members wm ON wm.workspace_id=w.id
      AND wm.user_id=w.owner_user_id AND wm.role='OWNER'
    LEFT JOIN owner_signup_allowances osa ON osa.completed_workspace_id=w.id
      AND osa.completed_user_id=w.owner_user_id AND osa.status='COMPLETED'
    WHERE w.status='ACTIVE'
    ORDER BY w.created_at DESC,w.id DESC
  `).all<Row>();
  return rows.results.map((row)=>({
    workspaceId:row.workspace_id,workspaceName:row.workspace_name,
    ownerUserId:row.owner_user_id,
    ownerName:getServiceDisplayName({displayName:row.owner_display_name,googleName:row.owner_google_name,email:row.owner_email}),
    ownerEmail:row.owner_email,joinedAt:row.joined_at,status:row.workspace_status,
    ownerAllowanceId:row.allowance_id,
    billing:{plan:row.plan,subscriptionStatus:null,nextBillingAt:null},
  }));
}
