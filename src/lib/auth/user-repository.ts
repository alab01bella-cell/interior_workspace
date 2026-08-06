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
  job_title: string | null;
  onboarding_completed: number;
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
    jobTitle: row.job_title,
    onboardingCompleted: row.onboarding_completed === 1,
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
    INSERT INTO users (id, google_sub, email, google_name, profile_image_url)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(google_sub) DO UPDATE SET
      email = excluded.email,
      google_name = excluded.google_name,
      profile_image_url = excluded.profile_image_url,
      updated_at = datetime('now'),
      last_login_at = datetime('now')
  `).bind(id, profile.googleSub, profile.email, profile.googleName, profile.profileImageUrl).run();

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

export function getServiceDisplayName(user: Pick<User, "displayName" | "googleName" | "email">): string {
  return user.displayName?.trim() || user.googleName.trim() || user.email.split("@")[0];
}
