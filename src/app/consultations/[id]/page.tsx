import { AppShell } from "@/components/layout/app-shell";
import { ConsultationDetailPage } from "@/components/consultations/consultation-detail-page";
import { requireUser } from "@/lib/auth/require-user";

export default async function ConsultationDetailRoute() {
  const user = await requireUser();
  return <AppShell user={user}><ConsultationDetailPage /></AppShell>;
}
