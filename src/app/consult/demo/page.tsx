import type { Metadata } from "next";
import { ChecklistPage } from "@/components/checklist/checklist-page";

export const metadata: Metadata = {
  title: "인테리어 상담 체크리스트 | Interior Workspace",
  description: "고객용 인테리어 상담 체크리스트 데모",
};

export default function ConsultationChecklistDemoPage() {
  return <ChecklistPage mode="demo" />;
}
