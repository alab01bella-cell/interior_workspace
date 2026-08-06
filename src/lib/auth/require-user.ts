import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { findUserById } from "./user-repository";
import { findActiveWorkspaceContext } from "@/lib/workspaces/workspace-repository";
import type { User, WorkspaceContext } from "@/types/workspace";

export async function requireUser(): Promise<User> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");
  const user = await findUserById(sessionUser.id);
  if (!user) redirect("/login");
  return user;
}

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const user = await requireUser();
  if (!user.onboardingCompleted) redirect("/onboarding");
  const context = await findActiveWorkspaceContext(user.id);
  if (!context || !context.workspace.onboardingCompleted) notFound();
  return context;
}

export async function getAuthenticatedDestination(): Promise<"/login" | "/onboarding" | "/dashboard"> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return "/login";
  const user = await findUserById(sessionUser.id);
  if (!user) return "/login";
  if (!user.onboardingCompleted) return "/onboarding";
  return await findActiveWorkspaceContext(user.id) ? "/dashboard" : "/login";
}
