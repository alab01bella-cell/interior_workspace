import { AppShell } from "@/components/layout/app-shell";
import { ConsultationsPage } from "@/components/consultations/consultations-page";
import type { ConsultationStatus } from "@/types/consultation";
import { requireUser } from "@/lib/auth/require-user";

const statuses: ConsultationStatus[] = ["접수", "예약", "완료", "계약"];

export default async function ConsultationsRoute({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const user = await requireUser();
  const { status } = await searchParams;
  const initialStatus = statuses.includes(status as ConsultationStatus) ? status as ConsultationStatus : "전체";
  return <AppShell user={user}><ConsultationsPage initialStatus={initialStatus} /></AppShell>;
}
