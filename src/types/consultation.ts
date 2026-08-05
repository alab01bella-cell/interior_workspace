import type { ChecklistAnswerValue, StoredFileInfo } from "./checklist";

export type ConsultationStatus = "접수" | "예약" | "완료" | "계약";

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
