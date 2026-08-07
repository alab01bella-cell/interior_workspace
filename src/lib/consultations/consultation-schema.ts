import { checklistAnswerSections } from "@/lib/checklist/checklist-data";
import { validateChecklistRequired } from "@/lib/checklist/checklist-validation";
import type { ChecklistAnswerValue } from "@/types/checklist";
import type { ConsultationDbStatus, ConsultationStatus } from "@/types/consultation";

export const FORM_VERSION = "2026-08-07.v1";
export const MAX_PAYLOAD_BYTES = 48 * 1024;
export const STATUS_TO_DB: Record<ConsultationStatus, ConsultationDbStatus> = {
  접수: "RECEIVED", 예약: "RESERVED", 완료: "COMPLETED", 계약: "CONTRACTED",
};
export const STATUS_FROM_DB: Record<ConsultationDbStatus, ConsultationStatus> = {
  RECEIVED: "접수", RESERVED: "예약", COMPLETED: "완료", CONTRACTED: "계약",
};
export const checklistFields = checklistAnswerSections.flatMap((section) => section.fields.filter((field) => field.kind !== "files"));
export const checklistFieldNames = new Set(checklistFields.map((field) => field.name));

export interface ValidatedSubmission {
  idempotencyKey: string;
  answers: Record<string, ChecklistAnswerValue>;
  clientName: string;
  contactMethod: string;
  contactValue: string;
  region: string;
  area: string;
  budgetAmount: number;
  preferredDate: string;
}

function text(value: unknown, max: number, required = false): string {
  if (typeof value !== "string") {
    if (required) throw new Error("invalid_payload");
    return "";
  }
  const result = value.trim();
  if ((required && !result) || result.length > max) throw new Error("invalid_payload");
  return result;
}

export function validateSubmission(body: unknown, today = new Intl.DateTimeFormat("en-CA", { timeZone:"Asia/Seoul",year:"numeric",month:"2-digit",day:"2-digit" }).format(new Date())): ValidatedSubmission {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("invalid_payload");
  const input = body as Record<string, unknown>;
  const idempotencyKey = text(input.idempotencyKey, 100, true);
  if (!/^[A-Za-z0-9_-]{16,100}$/.test(idempotencyKey)) throw new Error("invalid_idempotency_key");
  const rawAnswers = input.answers;
  if (!rawAnswers || typeof rawAnswers !== "object" || Array.isArray(rawAnswers)) throw new Error("invalid_payload");

  const answers: Record<string, ChecklistAnswerValue> = {};
  for (const [key, value] of Object.entries(rawAnswers)) {
    if (!checklistFieldNames.has(key)) throw new Error("invalid_payload");
    if (typeof value === "string") answers[key] = text(value, 2000);
    else if (typeof value === "boolean") answers[key] = value;
    else if (Array.isArray(value) && value.length <= 30 && value.every((item) => typeof item === "string" && item.length <= 200)) answers[key] = value;
    else throw new Error("invalid_payload");
  }
  if (Object.keys(validateChecklistRequired(answers)).length > 0) throw new Error("invalid_payload");
  const clientName = text(answers.name, 100, true);
  const contactValue = text(answers.phone, 30, true);
  const contactMethod = text(answers.preferredContact, 100) || "휴대폰";
  const region = text(answers.address, 300, true);
  const area = text(answers.areaSize, 50, true);
  const preferredDate = text(answers.visitDate, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(preferredDate) || preferredDate < today) throw new Error("invalid_date");
  if (answers.privacyConsent !== true) throw new Error("privacy_consent_required");
  const budgetText = text(answers.budget, 30, true).replace(/,/g, "");
  if (!/^\d+$/.test(budgetText)) throw new Error("invalid_budget");
  const budgetAmount = Number(budgetText);
  if (!Number.isSafeInteger(budgetAmount) || budgetAmount < 0 || budgetAmount > 100_000_000) throw new Error("invalid_budget");
  return { idempotencyKey, answers, clientName, contactMethod, contactValue, region, area, budgetAmount, preferredDate };
}
