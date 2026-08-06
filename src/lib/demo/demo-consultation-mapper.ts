import type { ChecklistAnswerValue, ChecklistFormData, ChecklistSubmission, StoredFileInfo } from "@/types/checklist";
import type { StoredConsultation } from "@/types/consultation";

const fileInfo = (file: File): StoredFileInfo => ({ name: file.name, type: file.type, size: file.size });

export function extractRegion(address: string) {
  const words = address.trim().split(/\s+/).filter(Boolean);
  if (words.length < 2) return words[0] || "지역 미확인";
  return words.slice(0, 2).join(" ");
}

export function createSubmissionId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return `CONS-${crypto.randomUUID()}`;
  return `CONS-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createChecklistSubmission(form: ChecklistFormData): ChecklistSubmission {
  const submissionId = createSubmissionId();
  const submittedAt = new Date().toISOString();
  const answers = Object.fromEntries(
    Object.entries(form)
      .filter(([key]) => key !== "sitePhotos" && key !== "referenceImages")
      .map(([key, value]) => [key, value as ChecklistAnswerValue]),
  );
  return {
    submissionId,
    submittedAt,
    answers,
    sitePhotoFiles: form.sitePhotos.map(fileInfo),
    referenceImageFiles: form.referenceImages.map(fileInfo),
  };
}

const textAnswer = (answers: Record<string, ChecklistAnswerValue>, key: string) => {
  const value = answers[key];
  return typeof value === "string" ? value : "";
};

export function mapSubmissionToConsultation(submission: ChecklistSubmission): StoredConsultation {
  const { answers } = submission;
  const address = textAnswer(answers, "address");
  const styles = answers.styles;
  const residents = textAnswer(answers, "residents");
  const hasChild = textAnswer(answers, "hasChild");
  const request = textAnswer(answers, "inconvenience") || textAnswer(answers, "questions") || textAnswer(answers, "etc");
  return {
    id: submission.submissionId,
    status: "접수",
    customerName: textAnswer(answers, "name"),
    phone: textAnswer(answers, "phone"),
    region: extractRegion(address),
    fullAddress: [address, textAnswer(answers, "addressDetail")].filter(Boolean).join(" "),
    housingType: textAnswer(answers, "housingTypeOther") || textAnswer(answers, "housingType"),
    areaSize: textAnswer(answers, "areaSize"),
    visitDate: textAnswer(answers, "visitDate"),
    visitTime: textAnswer(answers, "visitTime"),
    budget: Number(textAnswer(answers, "budget").replace(/\D/g, "")) || 0,
    receivedAt: submission.submittedAt,
    request: request || "작성하지 않음",
    style: Array.isArray(styles) && styles.length ? styles.join(" · ") : "작성하지 않음",
    family: [residents, hasChild === "있음" ? "아이 있음" : ""].filter(Boolean).join(" · ") || "작성하지 않음",
    source: "stored",
    originalAnswers: answers,
    sitePhotoFiles: submission.sitePhotoFiles,
    referenceImageFiles: submission.referenceImageFiles,
  };
}
