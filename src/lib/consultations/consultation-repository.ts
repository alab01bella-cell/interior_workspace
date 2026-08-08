import { getDb } from "@/lib/db/client";
import { FORM_VERSION, STATUS_FROM_DB, STATUS_TO_DB, type ValidatedSubmission } from "./consultation-schema";
import type { ChecklistAnswerValue } from "@/types/checklist";
import type { Consultation, ConsultationDbStatus, ConsultationStatus, ExternalSyncStatus } from "@/types/consultation";

export interface ConsultationRecord {
  id: string; workspaceId: string; idempotencyKey: string; clientName: string; contactMethod: string;
  contactValue: string; region: string; area: string; budgetAmount: number; preferredDate: string;
  status: ConsultationDbStatus; formVersion: string; answers: Record<string, ChecklistAnswerValue>;
  driveFolderId: string | null; externalSyncStatus: ExternalSyncStatus; sheetSyncedAt: string | null;
  syncErrorCode: string | null; submittedAt: string; createdAt: string; updatedAt: string;
  scheduledAt: string | null; scheduledNote: string | null; statusUpdatedAt: string | null;
  assignedUserId:string|null;assignedUserName:string|null;
}

interface Row { id:string; workspace_id:string; idempotency_key:string; client_name:string; contact_method:string; contact_value:string; region:string; area:string; budget_amount:number; preferred_date:string; status:ConsultationDbStatus; form_version:string; form_payload_json:string; drive_folder_id:string|null; external_sync_status:ExternalSyncStatus; sheet_synced_at:string|null; sync_error_code:string|null; submitted_at:string; created_at:string; updated_at:string; scheduled_at:string|null; scheduled_note:string|null; status_updated_at:string|null;assigned_user_id:string|null;assigned_user_name:string|null }
const select = `SELECT c.id,c.workspace_id,c.idempotency_key,c.client_name,c.contact_method,c.contact_value,c.region,c.area,c.budget_amount,c.preferred_date,c.status,c.form_version,c.form_payload_json,c.drive_folder_id,c.external_sync_status,c.sheet_synced_at,c.sync_error_code,c.submitted_at,c.created_at,c.updated_at,c.scheduled_at,c.scheduled_note,c.status_updated_at,c.assigned_user_id,CASE WHEN u.id IS NULL THEN NULL ELSE COALESCE(NULLIF(u.display_name,''),u.google_name,u.email) END AS assigned_user_name FROM consultations c LEFT JOIN users u ON u.id=c.assigned_user_id`;
const map = (r: Row): ConsultationRecord => ({ id:r.id, workspaceId:r.workspace_id, idempotencyKey:r.idempotency_key, clientName:r.client_name, contactMethod:r.contact_method, contactValue:r.contact_value, region:r.region, area:r.area, budgetAmount:r.budget_amount, preferredDate:r.preferred_date, status:r.status, formVersion:r.form_version, answers:JSON.parse(r.form_payload_json), driveFolderId:r.drive_folder_id, externalSyncStatus:r.external_sync_status, sheetSyncedAt:r.sheet_synced_at, syncErrorCode:r.sync_error_code, submittedAt:r.submitted_at, createdAt:r.created_at, updatedAt:r.updated_at, scheduledAt:r.scheduled_at, scheduledNote:r.scheduled_note, statusUpdatedAt:r.status_updated_at,assignedUserId:r.assigned_user_id,assignedUserName:r.assigned_user_name });

export type ConsultationEventType = "CONSULTATION_RECEIVED"|"RESERVATION_CREATED"|"RESERVATION_UPDATED"|"RESERVATION_CANCELLED"|"STATUS_CHANGED"|"ASSIGNEE_CHANGED";
export interface ConsultationEvent { id:string; eventType:ConsultationEventType; payload:Record<string,unknown>; actorUserId:string|null; createdAt:string }
interface EventRow { id:string; event_type:ConsultationEventType; event_payload_json:string; actor_user_id:string|null; created_at:string }

export async function createConsultation(workspaceId: string, input: ValidatedSubmission): Promise<{ record: ConsultationRecord; created: boolean }> {
  const db = await getDb(); const id = crypto.randomUUID(); const now = new Date().toISOString();
  const result = await db.prepare(`INSERT INTO consultations (id,workspace_id,idempotency_key,client_name,contact_method,contact_value,region,area,budget_amount,preferred_date,status,form_version,form_payload_json,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,'RECEIVED',?,?,?) ON CONFLICT(workspace_id,idempotency_key) DO NOTHING`).bind(id,workspaceId,input.idempotencyKey,input.clientName,input.contactMethod,input.contactValue,input.region,input.area,input.budgetAmount,input.preferredDate,FORM_VERSION,JSON.stringify(input.answers),now).run();
  const row = await db.prepare(`${select} WHERE c.workspace_id=? AND c.idempotency_key=? LIMIT 1`).bind(workspaceId,input.idempotencyKey).first<Row>();
  if (!row) throw new Error("consultation_save_failed");
  const created=result.meta.changes === 1;
  if(created) try { await db.prepare(`INSERT INTO consultation_events(id,workspace_id,consultation_id,event_type,event_payload_json,actor_user_id,idempotency_key,created_at) VALUES(?,?,?,'CONSULTATION_RECEIVED','{}',NULL,?,?) ON CONFLICT(consultation_id,idempotency_key) DO NOTHING`).bind(crypto.randomUUID(),workspaceId,row.id,`received:${row.id}`,now).run(); } catch { /* 상담 원본 저장 성공은 이벤트 실패로 취소하지 않는다. */ }
  return { record:map(row), created };
}
export async function findConsultation(workspaceId:string,id:string) { const r=await (await getDb()).prepare(`${select} WHERE c.workspace_id=? AND c.id=? LIMIT 1`).bind(workspaceId,id).first<Row>(); return r?map(r):null; }
export async function listConsultations(workspaceId:string) { const q=await (await getDb()).prepare(`${select} WHERE c.workspace_id=? ORDER BY c.submitted_at DESC,c.created_at DESC,c.id DESC LIMIT 500`).bind(workspaceId).all<Row>(); return q.results.map(map); }
export function toConsultation(r:ConsultationRecord):Consultation { return { id:r.id,status:STATUS_FROM_DB[r.status],customerName:r.clientName,phone:r.contactValue,contactMethod:r.contactMethod,region:r.region,fullAddress:[r.region,String(r.answers.addressDetail??"")].filter(Boolean).join(" "),housingType:String(r.answers.housingType??""),areaSize:r.area,visitDate:r.preferredDate,visitTime:String(r.answers.visitTime??""),budget:r.budgetAmount,receivedAt:r.submittedAt,request:String(r.answers.inconvenience??r.answers.questions??""),style:Array.isArray(r.answers.styles)?r.answers.styles.join(", "):String(r.answers.styles??""),family:String(r.answers.residents??""),source:"stored",originalAnswers:r.answers,sitePhotoFiles:[],referenceImageFiles:[],formVersion:r.formVersion,driveFolderId:r.driveFolderId,externalSyncStatus:r.externalSyncStatus,sheetSyncedAt:r.sheetSyncedAt,scheduledAt:r.scheduledAt,scheduledNote:r.scheduledNote,statusUpdatedAt:r.statusUpdatedAt,assignedUserId:r.assignedUserId,assignedUserName:r.assignedUserName }; }

export async function listScheduledConsultations(workspaceId:string) { const q=await (await getDb()).prepare(`${select} WHERE c.workspace_id=? AND c.scheduled_at IS NOT NULL ORDER BY c.scheduled_at ASC,c.id ASC`).bind(workspaceId).all<Row>(); return q.results.map(map); }
export async function listConsultationEvents(workspaceId:string,id:string) { const q=await (await getDb()).prepare(`SELECT id,event_type,event_payload_json,actor_user_id,created_at FROM consultation_events WHERE workspace_id=? AND consultation_id=? ORDER BY created_at DESC,id DESC`).bind(workspaceId,id).all<EventRow>(); return q.results.map((r)=>({id:r.id,eventType:r.event_type,payload:JSON.parse(r.event_payload_json) as Record<string,unknown>,actorUserId:r.actor_user_id,createdAt:r.created_at})); }

export async function updateStatus(workspaceId:string,id:string,status:ConsultationStatus,actorUserId:string,idempotencyKey:string) {
  const current=await findConsultation(workspaceId,id); if(!current)return null;
  if(await eventKeyExists(id,idempotencyKey))return current;
  if(current.status===STATUS_TO_DB[status])return current;
  const db=await getDb(), now=new Date().toISOString();
  await db.batch([
    db.prepare(`UPDATE consultations SET status=?, status_updated_at=?, external_sync_status=CASE WHEN sheet_synced_at IS NULL THEN external_sync_status ELSE 'PARTIAL' END, updated_at=? WHERE workspace_id=? AND id=?`).bind(STATUS_TO_DB[status],now,now,workspaceId,id),
    db.prepare(`INSERT INTO consultation_events(id,workspace_id,consultation_id,event_type,event_payload_json,actor_user_id,idempotency_key,created_at) VALUES(?,?,?,'STATUS_CHANGED',?,?,?,?) ON CONFLICT(consultation_id,idempotency_key) DO NOTHING`).bind(crypto.randomUUID(),workspaceId,id,JSON.stringify({from:current.status,to:STATUS_TO_DB[status]}),actorUserId,idempotencyKey,now),
  ]);
  return findConsultation(workspaceId,id);
}

export async function saveReservation(input:{workspaceId:string;consultationId:string;scheduledAt:string;scheduledNote:string|null;actorUserId:string;idempotencyKey:string}) {
  const current=await findConsultation(input.workspaceId,input.consultationId); if(!current)return null;
  if(await eventKeyExists(input.consultationId,input.idempotencyKey))return current;
  const now=new Date().toISOString(), nextStatus=current.status==="RECEIVED"?"RESERVED":current.status;
  const type:ConsultationEventType=current.scheduledAt?"RESERVATION_UPDATED":"RESERVATION_CREATED";
  const payload={previousScheduledAt:current.scheduledAt,scheduledAt:input.scheduledAt,note:input.scheduledNote};
  const db=await getDb(); await db.batch([
    db.prepare(`UPDATE consultations SET scheduled_at=?,scheduled_note=?,status=?,status_updated_at=CASE WHEN status<>? THEN ? ELSE status_updated_at END,external_sync_status=CASE WHEN sheet_synced_at IS NULL THEN external_sync_status ELSE 'PARTIAL' END,updated_at=? WHERE workspace_id=? AND id=?`).bind(input.scheduledAt,input.scheduledNote,nextStatus,nextStatus,now,now,input.workspaceId,input.consultationId),
    db.prepare(`INSERT INTO consultation_events(id,workspace_id,consultation_id,event_type,event_payload_json,actor_user_id,idempotency_key,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(consultation_id,idempotency_key) DO NOTHING`).bind(crypto.randomUUID(),input.workspaceId,input.consultationId,type,JSON.stringify(payload),input.actorUserId,input.idempotencyKey,now),
  ]); return findConsultation(input.workspaceId,input.consultationId);
}

export async function cancelReservation(input:{workspaceId:string;consultationId:string;actorUserId:string;idempotencyKey:string}) {
  const current=await findConsultation(input.workspaceId,input.consultationId); if(!current)return {record:null,error:"not_found" as const};
  if(await eventKeyExists(input.consultationId,input.idempotencyKey))return {record:current,error:null};
  if(current.status==="COMPLETED"||current.status==="CONTRACTED")return {record:current,error:"protected_status" as const};
  if(!current.scheduledAt)return {record:current,error:null};
  const now=new Date().toISOString(),nextStatus=current.status==="RESERVED"?"RECEIVED":current.status,db=await getDb();
  await db.batch([
    db.prepare(`UPDATE consultations SET scheduled_at=NULL,scheduled_note=NULL,status=?,status_updated_at=CASE WHEN status<>? THEN ? ELSE status_updated_at END,external_sync_status=CASE WHEN sheet_synced_at IS NULL THEN external_sync_status ELSE 'PARTIAL' END,updated_at=? WHERE workspace_id=? AND id=?`).bind(nextStatus,nextStatus,now,now,input.workspaceId,input.consultationId),
    db.prepare(`INSERT INTO consultation_events(id,workspace_id,consultation_id,event_type,event_payload_json,actor_user_id,idempotency_key,created_at) VALUES(?,?,?,'RESERVATION_CANCELLED',?,?,?,?) ON CONFLICT(consultation_id,idempotency_key) DO NOTHING`).bind(crypto.randomUUID(),input.workspaceId,input.consultationId,JSON.stringify({previousScheduledAt:current.scheduledAt}),input.actorUserId,input.idempotencyKey,now),
  ]); return {record:await findConsultation(input.workspaceId,input.consultationId),error:null};
}
async function eventKeyExists(consultationId:string,idempotencyKey:string){const row=await (await getDb()).prepare(`SELECT 1 AS found FROM consultation_events WHERE consultation_id=? AND idempotency_key=? LIMIT 1`).bind(consultationId,idempotencyKey).first<{found:number}>();return Boolean(row);}
export async function assignConsultation(input:{workspaceId:string;consultationId:string;assignedUserId:string|null;actorUserId:string;idempotencyKey:string}){
  const current=await findConsultation(input.workspaceId,input.consultationId);if(!current)return {record:null,error:"not_found" as const};if(await eventKeyExists(input.consultationId,input.idempotencyKey))return {record:current,error:null};
  let nextName:string|null=null;if(input.assignedUserId){const member=await (await getDb()).prepare(`SELECT COALESCE(NULLIF(u.display_name,''),u.google_name,u.email) AS name FROM workspace_members wm JOIN users u ON u.id=wm.user_id AND u.status='ACTIVE' WHERE wm.workspace_id=? AND wm.user_id=? AND wm.status='ACTIVE' AND wm.role IN ('OWNER','MEMBER') LIMIT 1`).bind(input.workspaceId,input.assignedUserId).first<{name:string}>();if(!member)return {record:current,error:"invalid_assignee" as const};nextName=member.name;}
  if(current.assignedUserId===input.assignedUserId)return {record:current,error:null};const db=await getDb(),now=new Date().toISOString();await db.batch([
    db.prepare(`UPDATE consultations SET assigned_user_id=?,updated_at=? WHERE workspace_id=? AND id=?`).bind(input.assignedUserId,now,input.workspaceId,input.consultationId),
    db.prepare(`INSERT INTO consultation_events(id,workspace_id,consultation_id,event_type,event_payload_json,actor_user_id,idempotency_key,created_at) VALUES(?,?,?,'ASSIGNEE_CHANGED',?,?,?,?)`).bind(crypto.randomUUID(),input.workspaceId,input.consultationId,JSON.stringify({previous_user_id:current.assignedUserId,new_user_id:input.assignedUserId,previous_user_name:current.assignedUserName,new_user_name:nextName}),input.actorUserId,input.idempotencyKey,now),
  ]);return {record:await findConsultation(input.workspaceId,input.consultationId),error:null};
}
export async function updateSync(id:string, values:{driveFolderId?:string; status:ExternalSyncStatus; sheetSynced?:boolean; error?:string|null}) { const db=await getDb(); await db.prepare(`UPDATE consultations SET drive_folder_id=COALESCE(?,drive_folder_id), external_sync_status=?, sheet_synced_at=CASE WHEN ?=1 THEN datetime('now') ELSE sheet_synced_at END, sync_error_code=?, updated_at=datetime('now') WHERE id=?`).bind(values.driveFolderId??null,values.status,values.sheetSynced?1:0,values.error??null,id).run(); }
