import type { AuthUser } from "@/types/auth";
import type { User } from "@/types/workspace";
import { getDb } from "@/lib/db/client";

interface UserRow {
  id: string;
  google_sub: string;
  email: string;
  google_name: string;
  display_name: string | null;
  profile_image_url: string | null;
  google_profile_image_url: string | null;
  custom_profile_drive_file_id: string | null;
  custom_profile_workspace_id: string | null;
  job_title: string | null;
  onboarding_completed: number;
  profile_completed: number;
  created_at: string;
  updated_at: string;
  last_login_at: string;
  status: User["status"];
}

export interface GoogleProfile {
  googleSub: string;
  email: string;
  googleName: string;
  profileImageUrl: string | null;
}

function mapUser(row: UserRow): User {
  return {
    id: row.id,
    googleSub: row.google_sub,
    email: row.email,
    googleName: row.google_name,
    displayName: row.display_name,
    profileImageUrl: row.profile_image_url,
    googleProfileImageUrl: row.google_profile_image_url,
    customProfileDriveFileId: row.custom_profile_drive_file_id,
    customProfileWorkspaceId: row.custom_profile_workspace_id,
    jobTitle: row.job_title,
    onboardingCompleted: row.onboarding_completed === 1,
    profileCompleted: row.profile_completed === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastLoginAt: row.last_login_at,
    status: row.status,
  };
}

export function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    googleSub: user.googleSub,
    email: user.email,
    googleName: user.googleName,
    profileImageUrl: user.profileImageUrl,
  };
}

export async function findOrCreateGoogleUser(profile: GoogleProfile): Promise<User> {
  const db = await getDb();
  const id = crypto.randomUUID();
  await db.prepare(`
    INSERT INTO users (id, google_sub, email, google_name, profile_image_url, google_profile_image_url)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(google_sub) DO UPDATE SET
      email = excluded.email,
      google_name = excluded.google_name,
      google_profile_image_url = excluded.profile_image_url,
      profile_image_url = CASE WHEN users.custom_profile_drive_file_id IS NULL THEN excluded.profile_image_url ELSE users.profile_image_url END,
      updated_at = datetime('now'),
      last_login_at = datetime('now')
  `).bind(id, profile.googleSub, profile.email, profile.googleName, profile.profileImageUrl, profile.profileImageUrl).run();

  const row = await db.prepare("SELECT * FROM users WHERE google_sub = ?")
    .bind(profile.googleSub)
    .first<UserRow>();
  if (!row || row.status !== "ACTIVE") throw new Error("user_unavailable");
  return mapUser(row);
}

export async function findUserById(id: string): Promise<User | null> {
  const row = await (await getDb()).prepare("SELECT * FROM users WHERE id = ? AND status = 'ACTIVE'")
    .bind(id)
    .first<UserRow>();
  return row ? mapUser(row) : null;
}

export async function findUserByGoogleSub(googleSub:string):Promise<User|null>{
  const row=await (await getDb()).prepare("SELECT * FROM users WHERE google_sub=? AND status='ACTIVE' LIMIT 1").bind(googleSub).first<UserRow>();
  return row?mapUser(row):null;
}

export async function hasActiveWorkspaceMembership(userId:string):Promise<boolean>{
  const row=await (await getDb()).prepare(`SELECT 1 AS found FROM workspace_members wm JOIN workspaces w ON w.id=wm.workspace_id AND w.status='ACTIVE' WHERE wm.user_id=? AND wm.status='ACTIVE' LIMIT 1`).bind(userId).first<{found:number}>();
  return Boolean(row);
}

export async function setCustomProfileImage(input:{userId:string;workspaceId:string;driveFileId:string}):Promise<void>{
  await (await getDb()).prepare(`UPDATE users SET custom_profile_drive_file_id=?,custom_profile_workspace_id=?,profile_image_url=?,updated_at=datetime('now') WHERE id=? AND status='ACTIVE'`).bind(input.driveFileId,input.workspaceId,`/api/profile/avatar?v=${Date.now()}`,input.userId).run();
}

export async function resetCustomProfileImage(userId:string):Promise<{driveFileId:string|null;workspaceId:string|null}>{
  const db=await getDb();
  const current=await db.prepare(`SELECT custom_profile_drive_file_id,custom_profile_workspace_id FROM users WHERE id=? AND status='ACTIVE'`).bind(userId).first<{custom_profile_drive_file_id:string|null;custom_profile_workspace_id:string|null}>();
  await db.prepare(`UPDATE users SET custom_profile_drive_file_id=NULL,custom_profile_workspace_id=NULL,profile_image_url=google_profile_image_url,updated_at=datetime('now') WHERE id=? AND status='ACTIVE'`).bind(userId).run();
  return {driveFileId:current?.custom_profile_drive_file_id??null,workspaceId:current?.custom_profile_workspace_id??null};
}

export async function updateUserProfile(input:{userId:string;displayName:string;jobTitle:string;complete:boolean}):Promise<User>{
  const db=await getDb();
  await db.prepare(`UPDATE users SET display_name=?,job_title=?,profile_completed=CASE WHEN ?=1 THEN 1 ELSE profile_completed END,updated_at=datetime('now') WHERE id=? AND status='ACTIVE'`).bind(input.displayName,input.jobTitle,input.complete?1:0,input.userId).run();
  const user=await findUserById(input.userId);
  if(!user)throw new Error("user_unavailable");
  return user;
}

export function getServiceDisplayName(user: Pick<User, "displayName" | "googleName" | "email">): string {
  return user.displayName?.trim() || user.googleName.trim() || user.email.split("@")[0];
}
