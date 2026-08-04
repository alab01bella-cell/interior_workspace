import type { LucideIcon } from "lucide-react";

export type ConsultationStatus = "접수" | "예약" | "완료" | "계약";

export interface DashboardStat {
  label: ConsultationStatus;
  count: number;
  icon: LucideIcon;
  featured?: boolean;
}

export interface TodayConsultation {
  id: string;
  time: string;
  customerName: string;
  summary: string;
}

export interface TodoItem {
  id: string;
  label: string;
  completed: boolean;
}
