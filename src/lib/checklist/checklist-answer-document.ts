import { checklistAnswerSections } from "@/lib/checklist/checklist-data";
import type { ChecklistAnswerValue } from "@/types/checklist";

export interface ChecklistDocumentField {
  name: string;
  label: string;
  value: ChecklistAnswerValue;
}

export interface ChecklistDocumentSection {
  title: string;
  fields: ChecklistDocumentField[];
}

const versionSections = {
  "2026-08-07.v1": checklistAnswerSections,
} as const;

const isPresent = (value: unknown) => {
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "string") return value.trim().length > 0;
  return typeof value === "boolean";
};

export function buildChecklistDocument(
  formVersion: string,
  answers: Record<string, ChecklistAnswerValue>,
): ChecklistDocumentSection[] {
  const schema = versionSections[formVersion as keyof typeof versionSections];
  if (!schema) {
    return [{
      title: "제출 답변",
      fields: Object.entries(answers).flatMap(([name, answer]) =>
        isPresent(answer) ? [{ name, label: name, value: answer }] : [],
      ),
    }].filter((section) => section.fields.length > 0);
  }
  const knownNames = new Set(schema.flatMap((section) => section.fields.map((field) => field.name)));
  const sections = schema.map((section) => ({
    title: section.title,
    fields: section.fields.flatMap((field) => {
      const answer = answers[field.name];
      return field.kind !== "files" && isPresent(answer)
        ? [{ name: field.name, label: field.label, value: answer }]
        : [];
    }),
  })).filter((section) => section.fields.length > 0);

  const unrecognized = Object.entries(answers).flatMap(([name, answer]) =>
    !knownNames.has(name) && isPresent(answer)
      ? [{ name, label: name, value: answer }]
      : [],
  );

  if (unrecognized.length) sections.push({ title: "기타 제출 답변", fields: unrecognized });
  return sections;
}

export function formatChecklistAnswer(name: string, answer: ChecklistAnswerValue) {
  if (Array.isArray(answer)) return answer.join(" / ");
  if (typeof answer === "boolean") return answer ? "동의" : "동의하지 않음";
  if (name === "budget") {
    const numeric = answer.replace(/,/g, "").trim();
    if (/^\d+$/.test(numeric)) return `${Number(numeric).toLocaleString("ko-KR")}만원`;
  }
  return answer;
}
