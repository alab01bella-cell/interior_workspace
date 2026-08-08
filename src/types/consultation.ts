import type { ChecklistAnswerValue, StoredFileInfo } from "./checklist";

export type ConsultationStatus = "접수" | "예약" | "완료" | "계약";
export type ConsultationDbStatus = "RECEIVED" | "RESERVED" | "COMPLETED" | "CONTRACTED";
export type ExternalSyncStatus = "PENDING" | "PARTIAL" | "FAILED" | "SYNCED" | "PERMISSION_REQUIRED";
export type QuoteStatus = "NOT_CREATED" | "DRAFT" | "SENT";
export type ContractOutcome = "PENDING" | "CONTRACTED" | "LOST";
export type LostReason = "PRICE" | "SCHEDULE" | "COMPETITOR" | "SCOPE_MISMATCH" | "CUSTOMER_PLAN_CHANGED" | "NO_RESPONSE" | "ON_HOLD" | "OTHER";

export interface Consultation {
  id: string;
  status: ConsultationStatus;
  customerName: string;
  phone: string;
  region: string;
  fullAddress: string;
  housingType: string;
  areaSize: string;
  visitDate: string;
  visitTime: string;
  budget: number;
  receivedAt: string;
  request: string;
  style: string;
  family: string;
  source?: "mock" | "stored";
  originalAnswers?: Record<string, ChecklistAnswerValue>;
  sitePhotoFiles?: StoredFileInfo[];
  referenceImageFiles?: StoredFileInfo[];
  contactMethod?: string;
  formVersion?: string;
  driveFolderId?: string | null;
  externalSyncStatus?: ExternalSyncStatus;
  sheetSyncedAt?: string | null;
  scheduledAt?: string | null;
  scheduledNote?: string | null;
  statusUpdatedAt?: string | null;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  quoteStatus: QuoteStatus;
  quoteAmount: number | null;
  quoteSentAt: string | null;
  quoteNote: string | null;
  quoteFileId: string | null;
  contractOutcome: ContractOutcome;
  contractDecidedAt: string | null;
  lostReason: LostReason | null;
  lostReasonNote: string | null;
}

export interface StoredConsultation extends Consultation {
  source: "stored";
  originalAnswers: Record<string, ChecklistAnswerValue>;
  sitePhotoFiles: StoredFileInfo[];
  referenceImageFiles: StoredFileInfo[];
}

export interface StoredConsultationsDocument {
  version: 1;
  consultations: StoredConsultation[];
}
