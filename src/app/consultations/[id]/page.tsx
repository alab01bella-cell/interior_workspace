import { notFound } from "next/navigation";
import { requireWorkspace } from "@/lib/auth/require-user";

export default async function ConsultationDetailRoute() {
  await requireWorkspace();
  notFound();
}
