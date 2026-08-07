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
}

interface Row { id:string; workspace_id:string; idempotency_key:string; client_name:string; contact_method:string; contact_value:string; region:string; area:string; budget_amount:number; preferred_date:string; status:ConsultationDbStatus; form_version:string; form_payload_json:string; drive_folder_id:string|null; external_sync_status:ExternalSyncStatus; sheet_synced_at:string|null; sync_error_code:string|null; submitted_at:string; created_at:string; updated_at:string }
const select = `SELECT id, workspace_id, idempotency_key, client_name, contact_method, contact_value, region, area, budget_amount, preferred_date, status, form_version, form_payload_json, drive_folder_id, external_sync_status, sheet_synced_at, sync_error_code, submitted_at, created_at, updated_at FROM consultations`;
const map = (r: Row): ConsultationRecord => ({ id:r.id, workspaceId:r.workspace_id, idempotencyKey:r.idempotency_key, clientName:r.client_name, contactMethod:r.contact_method, contactValue:r.contact_value, region:r.region, area:r.area, budgetAmount:r.budget_amount, preferredDate:r.preferred_date, status:r.status, formVersion:r.form_version, answers:JSON.parse(r.form_payload_json), driveFolderId:r.drive_folder_id, externalSyncStatus:r.external_sync_status, sheetSyncedAt:r.sheet_synced_at, syncErrorCode:r.sync_error_code, submittedAt:r.submitted_at, createdAt:r.created_at, updatedAt:r.updated_at });

export async function createConsultation(workspaceId: string, input: ValidatedSubmission): Promise<{ record: ConsultationRecord; created: boolean }> {
  const db = await getDb(); const id = crypto.randomUUID(); const now = new Date().toISOString();
  const result = await db.prepare(`INSERT INTO consultations (id,workspace_id,idempotency_key,client_name,contact_method,contact_value,region,area,budget_amount,preferred_date,status,form_version,form_payload_json,submitted_at) VALUES (?,?,?,?,?,?,?,?,?,?,'RECEIVED',?,?,?) ON CONFLICT(workspace_id,idempotency_key) DO NOTHING`).bind(id,workspaceId,input.idempotencyKey,input.clientName,input.contactMethod,input.contactValue,input.region,input.area,input.budgetAmount,input.preferredDate,FORM_VERSION,JSON.stringify(input.answers),now).run();
  const row = await db.prepare(`${select} WHERE workspace_id=? AND idempotency_key=? LIMIT 1`).bind(workspaceId,input.idempotencyKey).first<Row>();
  if (!row) throw new Error("consultation_save_failed");
  return { record:map(row), created:result.meta.changes === 1 };
}
export async function findConsultation(workspaceId:string,id:string) { const r=await (await getDb()).prepare(`${select} WHERE workspace_id=? AND id=? LIMIT 1`).bind(workspaceId,id).first<Row>(); return r?map(r):null; }
export async function listConsultations(workspaceId:string) { const q=await (await getDb()).prepare(`${select} WHERE workspace_id=? ORDER BY submitted_at DESC, created_at DESC, id DESC LIMIT 500`).bind(workspaceId).all<Row>(); return q.results.map(map); }
export function toConsultation(r:ConsultationRecord):Consultation { return { id:r.id,status:STATUS_FROM_DB[r.status],customerName:r.clientName,phone:r.contactValue,contactMethod:r.contactMethod,region:r.region,fullAddress:[r.region,String(r.answers.addressDetail??"")].filter(Boolean).join(" "),housingType:String(r.answers.housingType??""),areaSize:r.area,visitDate:r.preferredDate,visitTime:String(r.answers.visitTime??""),budget:r.budgetAmount,receivedAt:r.submittedAt,request:String(r.answers.inconvenience??r.answers.questions??""),style:Array.isArray(r.answers.styles)?r.answers.styles.join(", "):String(r.answers.styles??""),family:String(r.answers.residents??""),source:"stored",originalAnswers:r.answers,sitePhotoFiles:[],referenceImageFiles:[],formVersion:r.formVersion,driveFolderId:r.driveFolderId,externalSyncStatus:r.externalSyncStatus,sheetSyncedAt:r.sheetSyncedAt }; }
export async function updateStatus(workspaceId:string,id:string,status:ConsultationStatus) { const db=await getDb(); await db.prepare(`UPDATE consultations SET status=?, external_sync_status=CASE WHEN sheet_synced_at IS NULL THEN external_sync_status ELSE 'PARTIAL' END, updated_at=datetime('now') WHERE workspace_id=? AND id=?`).bind(STATUS_TO_DB[status],workspaceId,id).run(); return findConsultation(workspaceId,id); }
export async function updateSync(id:string, values:{driveFolderId?:string; status:ExternalSyncStatus; sheetSynced?:boolean; error?:string|null}) { const db=await getDb(); await db.prepare(`UPDATE consultations SET drive_folder_id=COALESCE(?,drive_folder_id), external_sync_status=?, sheet_synced_at=CASE WHEN ?=1 THEN datetime('now') ELSE sheet_synced_at END, sync_error_code=?, updated_at=datetime('now') WHERE id=?`).bind(values.driveFolderId??null,values.status,values.sheetSynced?1:0,values.error??null,id).run(); }
