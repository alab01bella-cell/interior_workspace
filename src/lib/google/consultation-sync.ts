import {
  checklistFields,
  STATUS_FROM_DB,
} from "@/lib/consultations/consultation-schema";
import {
  findConsultation,
  updateSync,
  type ConsultationRecord,
} from "@/lib/consultations/consultation-repository";
import { findDriveConnection } from "./drive-connection-repository";
import { findAppResource, createAppResource } from "./drive-api";
import { getGoogleAccessToken } from "./google-access-token";
import {
  appendRows,
  hasConsultationRow,
  initializeConsultationSpreadsheet,
  updateStatusAndScheduleCells,
  updateCommercialCells,
} from "./sheets-api";
import { getDb } from "@/lib/db/client";
import { createChecklistPdf } from "@/lib/pdf/checklist-pdf";
import {
  findChecklistOriginal,
  replaceChecklistOriginal,
  saveConsultationFile,
} from "@/lib/consultations/consultation-file-repository";
import { uploadDriveFile } from "./drive-api";

const FOLDER = "application/vnd.google-apps.folder",
  SPREADSHEET = "application/vnd.google-apps.spreadsheet";
export const summaryHeaders = [
  "상담ID",
  "접수일",
  "고객명",
  "지역",
  "평수",
  "예산",
  "상담 가능일",
  "연락 방법",
  "연락처",
  "상태",
  "확정 상담일시",
  "견적 금액",
  "견적 발송일",
  "계약 결과",
  "불성사 사유",
];
export const rawHeaders = [
  "상담ID",
  "접수일",
  "form_version",
  ...checklistFields.map((f) => f.label),
  "raw payload JSON",
];
const cell = (v: unknown) =>
  Array.isArray(v)
    ? v.join(", ")
    : typeof v === "boolean"
      ? v
        ? "동의"
        : "미동의"
      : String(v ?? "");
const safeName = (v: string) =>
  v
    .replace(/[\\/:*?"<>|]/g, " ")
    .trim()
    .slice(0, 60) || "고객";

async function resourceIds(
  workspaceId: string,
  workspaceName: string,
  token: string,
  rootId: string,
) {
  const db = await getDb();
  const row = await db
    .prepare(
      `SELECT consultation_parent_folder_id,consultation_spreadsheet_id FROM workspace_google_resources WHERE workspace_id=?`,
    )
    .bind(workspaceId)
    .first<{
      consultation_parent_folder_id: string | null;
      consultation_spreadsheet_id: string | null;
    }>();
  let parent =
    row?.consultation_parent_folder_id ??
    (await findAppResource(
      token,
      rootId,
      "iw_resource",
      "consultations",
      FOLDER,
    ));
  if (!parent)
    parent = await createAppResource(
      token,
      "고객 상담자료",
      rootId,
      FOLDER,
      "iw_resource",
      "consultations",
    );
  let spreadsheet =
    row?.consultation_spreadsheet_id ??
    (await findAppResource(
      token,
      rootId,
      "iw_resource",
      "consultation_sheet",
      SPREADSHEET,
    ));
  if (!spreadsheet)
    spreadsheet = await createAppResource(
      token,
      `${safeName(workspaceName)} - 상담 접수대장`,
      rootId,
      SPREADSHEET,
      "iw_resource",
      "consultation_sheet",
    );
  await db
    .prepare(
      `INSERT INTO workspace_google_resources(workspace_id,consultation_parent_folder_id,consultation_spreadsheet_id) VALUES(?,?,?) ON CONFLICT(workspace_id) DO UPDATE SET consultation_parent_folder_id=excluded.consultation_parent_folder_id,consultation_spreadsheet_id=excluded.consultation_spreadsheet_id,updated_at=datetime('now')`,
    )
    .bind(workspaceId, parent, spreadsheet)
    .run();
  return { parent, spreadsheet };
}

export async function syncConsultation(
  record: ConsultationRecord,
  workspaceName: string,
  options?: { repairPdf?: boolean },
): Promise<void> {
  const existingPdf = await findChecklistOriginal(record.id);
  let folderOk = Boolean(record.driveFolderId),
    pdfOk = Boolean(existingPdf && !options?.repairPdf),
    summaryOk = false,
    rawOk = false;
  const errors: string[] = [];
  let permissionRequired = false;
  try {
    const connection = await findDriveConnection(record.workspaceId);
    if (!connection?.driveRootFolderId)
      throw new Error("google_connection_unavailable");
    const token = await getGoogleAccessToken(connection);
    const resources = await resourceIds(
      record.workspaceId,
      workspaceName,
      token,
      connection.driveRootFolderId,
    );
    let folderId = record.driveFolderId;
    try {
      if (!folderId)
        folderId = await findAppResource(
          token,
          resources.parent,
          "consultation_id",
          record.id,
          FOLDER,
        );
      if (!folderId)
        folderId = await createAppResource(
          token,
          `${safeName(record.clientName)}_${safeName(record.region)}_${record.id.slice(0, 4)}`,
          resources.parent,
          FOLDER,
          "consultation_id",
          record.id,
        );
      folderOk = true;
      await updateSync(record.id, {
        driveFolderId: folderId,
        status: "PARTIAL",
      });
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "drive_folder_failed";
      errors.push(code);
      permissionRequired ||= code === "google_permission_required";
    }
    if (folderId)
      try {
        if (!pdfOk) {
          const fileName = `상담 체크리스트_원본_${record.id.slice(0, 4)}.pdf`,
        version = `${record.id}:full-static-ttf-v5`;
          let pdfId = await findAppResource(
            token,
            folderId,
            "consultation_original_pdf_version",
            version,
            "application/pdf",
          );
          let size = existingPdf?.fileSize ?? 0;
          if (!pdfId) {
            const bytes = await createChecklistPdf(record, workspaceName);
            const uploaded = await uploadDriveFile(token, {
              name: fileName,
              parentId: folderId,
              mimeType: "application/pdf",
              bytes,
              appProperties: {
                consultation_original_pdf: record.id,
                consultation_original_pdf_version: version,
              },
            });
            pdfId = uploaded.id;
            size = uploaded.size;
          }
          if (existingPdf)
            await replaceChecklistOriginal({
              consultationId: record.id,
              driveFileId: pdfId,
              driveFolderId: folderId,
              fileName,
              fileSize: size,
            });
          else
            await saveConsultationFile({
              workspaceId: record.workspaceId,
              consultationId: record.id,
              driveFileId: pdfId,
              driveFolderId: folderId,
              fileCategory: "CHECKLIST_ORIGINAL",
              originalFileName: fileName,
              mimeType: "application/pdf",
              fileSize: size,
            });
        }
        pdfOk = true;
      } catch (error) {
        const code = error instanceof Error ? error.message : "pdf_sync_failed";
        errors.push(code);
        permissionRequired ||= code === "google_permission_required";
      }
    let sheetsReady = false;
    try {
      await initializeConsultationSpreadsheet(
        token,
        resources.spreadsheet,
        summaryHeaders,
        rawHeaders,
      );
      sheetsReady = true;
    } catch (error) {
      const code =
        error instanceof Error ? error.message : "sheets_initialize_failed";
      errors.push(code);
      permissionRequired ||= code === "google_permission_required";
    }
    if (sheetsReady)
      try {
        if (
          !(await hasConsultationRow(
            token,
            resources.spreadsheet,
            "상담 접수대장",
            record.id,
          ))
        )
          await appendRows(token, resources.spreadsheet, "상담 접수대장", [
            [
              record.id,
              record.submittedAt,
              record.clientName,
              record.region,
              record.area,
              record.budgetAmount,
              record.preferredDate,
              record.contactMethod,
              record.contactValue,
              STATUS_FROM_DB[record.status],
              record.scheduledAt ?? "",
              record.quoteAmount ?? "",
              record.quoteSentAt ?? "",
              record.contractOutcome,
              record.lostReason ?? "",
            ],
          ]);
        summaryOk = true;
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "summary_sheet_failed";
        errors.push(code);
        permissionRequired ||= code === "google_permission_required";
      }
    if (sheetsReady)
      try {
        if (
          !(await hasConsultationRow(
            token,
            resources.spreadsheet,
            "체크리스트 원본",
            record.id,
          ))
        )
          await appendRows(token, resources.spreadsheet, "체크리스트 원본", [
            [
              record.id,
              record.submittedAt,
              record.formVersion,
              ...checklistFields.map((f) => cell(record.answers[f.name])),
              JSON.stringify(record.answers),
            ],
          ]);
        rawOk = true;
      } catch (error) {
        const code =
          error instanceof Error ? error.message : "raw_sheet_failed";
        errors.push(code);
        permissionRequired ||= code === "google_permission_required";
      }
  } catch (error) {
    const code = error instanceof Error ? error.message : "google_sync_failed";
    errors.push(code);
    permissionRequired ||= code === "google_permission_required";
  }
  const complete = folderOk && pdfOk && summaryOk && rawOk;
  const any = folderOk || pdfOk || summaryOk || rawOk;
  await updateSync(record.id, {
    status: complete
      ? "SYNCED"
      : permissionRequired
        ? "PERMISSION_REQUIRED"
        : any
          ? "PARTIAL"
          : "FAILED",
    sheetSynced: summaryOk && rawOk,
    error: errors[0] ?? null,
  });
}
export async function syncConsultationStatus(
  workspaceId: string,
  id: string,
  workspaceName: string,
) {
  const record = await findConsultation(workspaceId, id);
  if (!record) return;
  try {
    const connection = await findDriveConnection(workspaceId);
    if (!connection?.driveRootFolderId)
      throw new Error("google_connection_unavailable");
    const token = await getGoogleAccessToken(connection);
    const resources = await resourceIds(
      workspaceId,
      workspaceName,
      token,
      connection.driveRootFolderId,
    );
    await initializeConsultationSpreadsheet(token,resources.spreadsheet,summaryHeaders,rawHeaders);
    await updateStatusAndScheduleCells(
      token,
      resources.spreadsheet,
      id,
      STATUS_FROM_DB[record.status],
      record.scheduledAt ? new Intl.DateTimeFormat("ko-KR",{timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(record.scheduledAt)) : "",
    );
    const complete = Boolean(
      record.driveFolderId &&
      record.sheetSyncedAt &&
      (await findChecklistOriginal(id)),
    );
    await updateSync(id, {
      status: complete ? "SYNCED" : "PARTIAL",
      sheetSynced: true,
    });
  } catch (error) {
    const code = error instanceof Error ? error.message : "google_sync_failed";
    await updateSync(id, {
      status:
        code === "google_permission_required"
          ? "PERMISSION_REQUIRED"
          : "PARTIAL",
      error: code,
    });
  }
}

export async function syncConsultationCommercials(workspaceId:string,id:string,workspaceName:string){
  const record=await findConsultation(workspaceId,id);if(!record)return;
  try{
    const connection=await findDriveConnection(workspaceId);if(!connection?.driveRootFolderId)throw new Error("google_connection_unavailable");
    const token=await getGoogleAccessToken(connection);const resources=await resourceIds(workspaceId,workspaceName,token,connection.driveRootFolderId);
    await initializeConsultationSpreadsheet(token,resources.spreadsheet,summaryHeaders,rawHeaders);
    await updateStatusAndScheduleCells(token,resources.spreadsheet,id,STATUS_FROM_DB[record.status],record.scheduledAt??"");
    await updateCommercialCells(token,resources.spreadsheet,id,{quoteAmount:record.quoteAmount,quoteSentAt:record.quoteSentAt,contractOutcome:record.contractOutcome,lostReason:record.lostReason});
    const complete=Boolean(record.driveFolderId&&await findChecklistOriginal(id));
    await updateSync(id,{status:complete?"SYNCED":"PARTIAL",sheetSynced:true,error:null});
  }catch(error){const code=error instanceof Error?error.message:"google_sync_failed";await updateSync(id,{status:code==="google_permission_required"?"PERMISSION_REQUIRED":"PARTIAL",error:code});}
}
