import { getDb } from "@/lib/db/client";

export interface ChecklistReview{questionKey:string;isChecked:boolean;isConfirmed:boolean;consultationNote:string;updatedByName:string|null;updatedAt:string}
interface Row{question_key:string;is_checked:number;is_confirmed:number;consultation_note:string;updated_by_name:string|null;updated_at:string}

export async function listChecklistReviews(workspaceId:string,consultationId:string):Promise<ChecklistReview[]>{
  const rows=await (await getDb()).prepare(`SELECT r.question_key,r.is_checked,r.is_confirmed,r.consultation_note,r.updated_at,CASE WHEN u.id IS NULL THEN NULL ELSE COALESCE(NULLIF(u.display_name,''),u.google_name,u.email) END AS updated_by_name FROM consultation_checklist_reviews r JOIN consultations c ON c.id=r.consultation_id AND c.workspace_id=r.workspace_id LEFT JOIN users u ON u.id=r.updated_by_user_id WHERE r.workspace_id=? AND r.consultation_id=? ORDER BY r.created_at,r.question_key`).bind(workspaceId,consultationId).all<Row>();
  return rows.results.map((row)=>({questionKey:row.question_key,isChecked:row.is_checked===1||row.is_confirmed===1,isConfirmed:row.is_confirmed===1,consultationNote:row.consultation_note,updatedByName:row.updated_by_name,updatedAt:row.updated_at}));
}

export async function saveChecklistReview(input:{workspaceId:string;consultationId:string;questionKey:string;isChecked:boolean;isConfirmed:boolean;consultationNote:string;userId:string}){
  const db=await getDb(),consultation=await db.prepare(`SELECT 1 AS found FROM consultations WHERE workspace_id=? AND id=? LIMIT 1`).bind(input.workspaceId,input.consultationId).first();
  if(!consultation)return null;
  await db.prepare(`INSERT INTO consultation_checklist_reviews(id,workspace_id,consultation_id,question_key,is_checked,is_confirmed,consultation_note,updated_by_user_id) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(workspace_id,consultation_id,question_key) DO UPDATE SET is_checked=excluded.is_checked,is_confirmed=excluded.is_confirmed,consultation_note=excluded.consultation_note,updated_by_user_id=excluded.updated_by_user_id,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).bind(crypto.randomUUID(),input.workspaceId,input.consultationId,input.questionKey,input.isChecked||input.isConfirmed?1:0,input.isConfirmed?1:0,input.consultationNote,input.userId).run();
  return (await listChecklistReviews(input.workspaceId,input.consultationId)).find((review)=>review.questionKey===input.questionKey)??null;
}

export async function upsertChecklistSummary(input:{workspaceId:string;consultationId:string;content:string;userId:string}){
  const db=await getDb(),consultation=await db.prepare(`SELECT 1 AS found FROM consultations WHERE workspace_id=? AND id=? LIMIT 1`).bind(input.workspaceId,input.consultationId).first();if(!consultation)return false;
  await db.prepare(`INSERT INTO consultation_checklist_summaries(id,workspace_id,consultation_id,content,updated_by_user_id) VALUES(?,?,?,?,?) ON CONFLICT(workspace_id,consultation_id) DO UPDATE SET content=excluded.content,updated_by_user_id=excluded.updated_by_user_id,updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now')`).bind(crypto.randomUUID(),input.workspaceId,input.consultationId,input.content,input.userId).run();return true;
}
