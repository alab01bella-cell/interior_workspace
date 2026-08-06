"use server";

import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth/require-user";
import { completeOnboarding } from "@/lib/workspaces/workspace-repository";

const allowedJobTitles = new Set(["대표", "실장", "디자이너", "기타"]);

function cleanRequired(value: FormDataEntryValue | null, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned && cleaned.length <= maxLength ? cleaned : null;
}

export async function submitOnboarding(formData: FormData) {
  const user = await requireUser();
  const workspaceName = cleanRequired(formData.get("workspaceName"), 80);
  const displayName = cleanRequired(formData.get("displayName"), 40);
  const submittedJobTitle = formData.get("jobTitle");
  const jobTitle = typeof submittedJobTitle === "string" && allowedJobTitles.has(submittedJobTitle)
    ? submittedJobTitle
    : null;

  if (!workspaceName || !displayName) redirect("/onboarding?error=validation");

  try {
    await completeOnboarding({ userId: user.id, workspaceName, displayName, jobTitle });
  } catch {
    redirect("/onboarding?error=save_failed");
  }
  redirect("/settings/integrations?setup=storage");
}
