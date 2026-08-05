import { localStorageConsultationRepository } from "./local-storage-consultation-repository";
import { initialConsultations } from "@/lib/mock/consultations-data";
import type { Consultation, ConsultationStatus } from "@/types/consultation";

export type ConsultationStatusCounts = Record<ConsultationStatus, number>;

export function getAllConsultations(): Consultation[] {
  return [...localStorageConsultationRepository.list(), ...initialConsultations];
}

export function getConsultationStatusCounts(consultations: Consultation[]): ConsultationStatusCounts {
  return consultations.reduce<ConsultationStatusCounts>((counts, consultation) => {
    counts[consultation.status] += 1;
    return counts;
  }, { 접수: 0, 예약: 0, 완료: 0, 계약: 0 });
}

export function getLocalDateValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getTodayConsultations(consultations: Consultation[], date = new Date()) {
  const today = getLocalDateValue(date);
  return consultations
    .filter((consultation) => consultation.visitDate === today)
    .sort((a, b) => {
      if (!a.visitTime && !b.visitTime) return 0;
      if (!a.visitTime) return 1;
      if (!b.visitTime) return -1;
      return a.visitTime.localeCompare(b.visitTime);
    });
}

export function getRecentConsultations(consultations: Consultation[], limit = 5) {
  return [...consultations]
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime())
    .slice(0, limit);
}
