import type { ConsultationRepository } from "./consultation-repository";
import type { ConsultationStatus, StoredConsultation, StoredConsultationsDocument } from "@/types/consultation";

export const CONSULTATIONS_STORAGE_KEY = "interior-workspace:consultations:v1";

const emptyDocument = (): StoredConsultationsDocument => ({ version: 1, consultations: [] });

function isStoredConsultation(value: unknown): value is StoredConsultation {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredConsultation>;
  const stringFields: (keyof StoredConsultation)[] = [
    "id", "customerName", "phone", "region", "fullAddress", "housingType", "areaSize",
    "visitDate", "visitTime", "receivedAt", "request", "style", "family",
  ];
  const validFiles = (files: unknown) => Array.isArray(files) && files.every((file) => {
    if (!file || typeof file !== "object") return false;
    const candidate = file as { name?: unknown; type?: unknown; size?: unknown };
    return typeof candidate.name === "string" && typeof candidate.type === "string" && typeof candidate.size === "number";
  });
  const validAnswers = item.originalAnswers && typeof item.originalAnswers === "object"
    && Object.values(item.originalAnswers).every((answer) => typeof answer === "string" || typeof answer === "boolean" || (Array.isArray(answer) && answer.every((entry) => typeof entry === "string")));
  return stringFields.every((field) => typeof item[field] === "string")
    && typeof item.budget === "number"
    && item.source === "stored"
    && ["접수", "예약", "완료", "계약"].includes(String(item.status))
    && !!validAnswers
    && validFiles(item.sitePhotoFiles)
    && validFiles(item.referenceImageFiles);
}

export class LocalStorageConsultationRepository implements ConsultationRepository {
  private read(): StoredConsultationsDocument {
    if (typeof window === "undefined") return emptyDocument();
    try {
      const raw = window.localStorage.getItem(CONSULTATIONS_STORAGE_KEY);
      if (!raw) return emptyDocument();
      const parsed = JSON.parse(raw) as Partial<StoredConsultationsDocument>;
      if (parsed.version !== 1 || !Array.isArray(parsed.consultations)) return emptyDocument();
      return { version: 1, consultations: parsed.consultations.filter(isStoredConsultation) };
    } catch {
      return emptyDocument();
    }
  }

  private write(document: StoredConsultationsDocument) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CONSULTATIONS_STORAGE_KEY, JSON.stringify(document));
  }

  list() {
    return this.read().consultations;
  }

  findById(id: string) {
    return this.list().find((item) => item.id === id) ?? null;
  }

  save(consultation: StoredConsultation) {
    const current = this.read();
    const withoutDuplicate = current.consultations.filter((item) => item.id !== consultation.id);
    this.write({ version: 1, consultations: [consultation, ...withoutDuplicate] });
  }

  updateStatus(id: string, status: ConsultationStatus) {
    const current = this.read();
    let updated: StoredConsultation | null = null;
    const consultations = current.consultations.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, status };
      return updated;
    });
    if (updated) this.write({ version: 1, consultations });
    return updated;
  }
}

export const localStorageConsultationRepository = new LocalStorageConsultationRepository();
