import { notFound, redirect } from "next/navigation";
import { getCurrentUser } from "./session";
import { findUserById } from "./user-repository";
import { findActiveWorkspaceContext } from "@/lib/workspaces/workspace-repository";
import type { User, WorkspaceContext } from "@/types/workspace";
import { canCreateWorkspace } from "@/lib/auth/workspace-creation-eligibility";

export async function requireUser(): Promise<User> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) redirect("/login");
  const user = await findUserById(sessionUser.id);
  if (!user) redirect("/login");
  return user;
}

export async function requireWorkspace(): Promise<WorkspaceContext> {
  const user = await requireUser();
  if (!user.onboardingCompleted) redirect((await canCreateWorkspace(user.email)).allowed?"/onboarding":"/access-denied");
  if (!user.profileCompleted) redirect("/profile/setup");
  const context = await findActiveWorkspaceContext(user.id);
  if (!context || !context.workspace.onboardingCompleted) notFound();
  return context;
}

export async function getWorkspaceContextForSession(): Promise<WorkspaceContext | null> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return null;
  const user = await findUserById(sessionUser.id);
  if (!user?.onboardingCompleted) return null;
  const context = await findActiveWorkspaceContext(user.id);
  return context?.workspace.onboardingCompleted ? context : null;
}

export async function getAuthenticatedDestination(): Promise<"/login" | "/onboarding" | "/profile/setup" | "/access-denied" | "/dashboard"> {
  const sessionUser = await getCurrentUser();
  if (!sessionUser) return "/login";
  const user = await findUserById(sessionUser.id);
  if (!user) return "/login";
  if (!user.onboardingCompleted) return (await canCreateWorkspace(user.email)).allowed?"/onboarding":"/access-denied";
  const context=await findActiveWorkspaceContext(user.id);
  if(!context)return "/login";
  return user.profileCompleted?"/dashboard":"/profile/setup";
}
