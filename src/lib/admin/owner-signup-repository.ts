import { getDb } from "@/lib/db/client";
import { isSuperAdminEmail,normalizeAccountEmail } from "@/lib/admin/super-admin";

export type OwnerSignupAllowance={id:string;email:string;status:"ALLOWED"|"COMPLETED";createdAt:string;completedAt:string|null};
interface Row{id:string;email:string;status:"ALLOWED"|"COMPLETED";created_at:string;completed_at:string|null}

export async function listOwnerSignupAllowances():Promise<OwnerSignupAllowance[]>{
  const rows=await (await getDb()).prepare(`SELECT id,email,status,created_at,completed_at FROM owner_signup_allowances WHERE status IN ('ALLOWED','COMPLETED') ORDER BY created_at DESC`).all<Row>();
  return rows.results.map((row)=>({id:row.id,email:row.email,status:row.status,createdAt:row.created_at,completedAt:row.completed_at}));
}

export async function allowOwnerSignup(input:{email:string;actorUserId:string}){
  const email=normalizeAccountEmail(input.email);
  if(isSuperAdminEmail(email))throw new Error("protected_account");
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw new Error("invalid_email");
  const owner=await (await getDb()).prepare(`SELECT 1 AS found FROM users u JOIN workspace_members wm ON wm.user_id=u.id AND wm.role='OWNER' AND wm.status='ACTIVE' JOIN workspaces w ON w.id=wm.workspace_id AND w.status='ACTIVE' WHERE lower(u.email)=? LIMIT 1`).bind(email).first();
  if(owner)throw new Error("already_owner");
  await (await getDb()).prepare(`INSERT INTO owner_signup_allowances(id,email,status,allowed_by_user_id) VALUES(?,?,'ALLOWED',?) ON CONFLICT(email) DO UPDATE SET status=CASE WHEN owner_signup_allowances.status='COMPLETED' THEN 'COMPLETED' ELSE 'ALLOWED' END,allowed_by_user_id=excluded.allowed_by_user_id,cancelled_at=NULL,updated_at=datetime('now')`).bind(crypto.randomUUID(),email,input.actorUserId).run();
}

export async function cancelOwnerSignup(input:{id:string}){
  const row=await (await getDb()).prepare(`SELECT email,status FROM owner_signup_allowances WHERE id=? LIMIT 1`).bind(input.id).first<{email:string;status:string}>();
  if(!row)throw new Error("not_found");
  if(isSuperAdminEmail(row.email))throw new Error("protected_account");
  if(row.status!=="ALLOWED")throw new Error("completed_protected");
  await (await getDb()).prepare(`UPDATE owner_signup_allowances SET status='CANCELLED',cancelled_at=datetime('now'),updated_at=datetime('now') WHERE id=? AND status='ALLOWED'`).bind(input.id).run();
}
