import type { StoredConsultation, ConsultationStatus } from "@/types/consultation";

export interface ConsultationRepository {
  list(): StoredConsultation[];
  findById(id: string): StoredConsultation | null;
  save(consultation: StoredConsultation): void;
  updateStatus(id: string, status: ConsultationStatus): StoredConsultation | null;
}
