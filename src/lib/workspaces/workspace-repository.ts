import { getDb } from "@/lib/db/client";
import type { User, Workspace, WorkspaceContext, WorkspaceIdentity, WorkspaceMembership } from "@/types/workspace";
import { getServiceDisplayName } from "@/lib/auth/user-repository";

interface ContextRow {
  user_id: string;
  google_sub: string;
  email: string;
  google_name: string;
  display_name: string | null;
  profile_image_url: string | null;
  job_title: string | null;
  user_onboarding_completed: number;
  user_created_at: string;
  user_updated_at: string;
  last_login_at: string;
  user_status: User["status"];
  workspace_id: string;
  workspace_name: string;
  workspace_slug: string;
  owner_user_id: string;
  plan: Workspace["plan"];
  workspace_onboarding_completed: number;
  google_drive_connection_status: Workspace["googleDriveConnectionStatus"];
  workspace_created_at: string;
  workspace_updated_at: string;
  workspace_status: Workspace["status"];
  membership_id: string;
  role: WorkspaceMembership["role"];
  membership_status: WorkspaceMembership["status"];
  joined_at: string;
  membership_created_at: string;
  membership_updated_at: string;
}

const contextQuery = `
  SELECT
    u.id AS user_id, u.google_sub, u.email, u.google_name, u.display_name,
    u.profile_image_url, u.job_title, u.onboarding_completed AS user_onboarding_completed,
    u.created_at AS user_created_at, u.updated_at AS user_updated_at,
    u.last_login_at, u.status AS user_status,
    w.id AS workspace_id, w.name AS workspace_name, w.slug AS workspace_slug,
    w.owner_user_id, w.plan, w.onboarding_completed AS workspace_onboarding_completed,
    w.google_drive_connection_status, w.created_at AS workspace_created_at,
    w.updated_at AS workspace_updated_at, w.status AS workspace_status,
    wm.id AS membership_id, wm.role, wm.status AS membership_status,
    wm.joined_at, wm.created_at AS membership_created_at,
    wm.updated_at AS membership_updated_at
  FROM users u
  JOIN workspace_members wm ON wm.user_id = u.id AND wm.status = 'ACTIVE'
  JOIN workspaces w ON w.id = wm.workspace_id AND w.status = 'ACTIVE'
  WHERE u.id = ? AND u.status = 'ACTIVE'
  ORDER BY wm.joined_at ASC, wm.id ASC
  LIMIT 1
`;

function mapContext(row: ContextRow): WorkspaceContext {
  return {
    user: {
      id: row.user_id,
      googleSub: row.google_sub,
      email: row.email,
      googleName: row.google_name,
      displayName: row.display_name,
      profileImageUrl: row.profile_image_url,
      jobTitle: row.job_title,
      onboardingCompleted: row.user_onboarding_completed === 1,
      createdAt: row.user_created_at,
      updatedAt: row.user_updated_at,
      lastLoginAt: row.last_login_at,
      status: row.user_status,
    },
    workspace: {
      id: row.workspace_id,
      name: row.workspace_name,
      slug: row.workspace_slug,
      ownerUserId: row.owner_user_id,
      plan: row.plan,
      onboardingCompleted: row.workspace_onboarding_completed === 1,
      googleDriveConnectionStatus: row.google_drive_connection_status,
      createdAt: row.workspace_created_at,
      updatedAt: row.workspace_updated_at,
      status: row.workspace_status,
    },
    membership: {
      id: row.membership_id,
      workspaceId: row.workspace_id,
      userId: row.user_id,
      role: row.role,
      status: row.membership_status,
      joinedAt: row.joined_at,
      createdAt: row.membership_created_at,
      updatedAt: row.membership_updated_at,
    },
  };
}

export async function findActiveWorkspaceContext(userId: string): Promise<WorkspaceContext | null> {
  const row = await (await getDb()).prepare(contextQuery).bind(userId).first<ContextRow>();
  return row ? mapContext(row) : null;
}

export function toWorkspaceIdentity(context: WorkspaceContext): WorkspaceIdentity {
  return {
    displayName: getServiceDisplayName(context.user),
    email: context.user.email,
    profileImageUrl: context.user.profileImageUrl,
    jobTitle: context.user.jobTitle,
    workspaceName: context.workspace.name,
  };
}

function publicKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function shortCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(9));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function ensureConsultationShortCode(workspaceId: string): Promise<string> {
  const db = await getDb();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = shortCode();
    try {
      await db.prepare(`UPDATE workspaces SET consultation_short_code=COALESCE(consultation_short_code, ?), updated_at=datetime('now') WHERE id=? AND status='ACTIVE'`).bind(code, workspaceId).run();
      const row = await db.prepare(`SELECT consultation_short_code FROM workspaces WHERE id=? AND status='ACTIVE'`).bind(workspaceId).first<{ consultation_short_code:string|null }>();
      if (row?.consultation_short_code) return row.consultation_short_code;
    } catch (error) {
      if (error instanceof Error && error.message.includes("consultation_short_code")) continue;
      throw error;
    }
  }
  throw new Error("short_code_unavailable");
}

export async function ensureConsultationPublicKey(workspaceId: string): Promise<string> {
  const db = await getDb();
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const key = publicKey();
    try {
      await db.prepare(`UPDATE workspaces SET consultation_public_key=COALESCE(consultation_public_key, ?), updated_at=datetime('now') WHERE id=? AND status='ACTIVE'`).bind(key, workspaceId).run();
      const row = await db.prepare(`SELECT consultation_public_key FROM workspaces WHERE id=? AND status='ACTIVE'`).bind(workspaceId).first<{ consultation_public_key:string|null }>();
      if (row?.consultation_public_key) return row.consultation_public_key;
    } catch (error) {
      if (error instanceof Error && error.message.includes("consultation_public_key")) continue;
      throw error;
    }
  }
  throw new Error("public_key_unavailable");
}

export async function findWorkspaceByPublicKey(key:string): Promise<{id:string;name:string}|null> {
  if (!/^[a-f0-9]{48}$/.test(key)) return null;
  return (await getDb()).prepare(`SELECT id,name FROM workspaces WHERE consultation_public_key=? AND status='ACTIVE' AND onboarding_completed=1 LIMIT 1`).bind(key).first<{id:string;name:string}>();
}

export async function findWorkspaceByShortCode(code:string): Promise<{id:string;name:string}|null> {
  if (!/^[A-Za-z0-9_-]{12}$/.test(code)) return null;
  return (await getDb()).prepare(`SELECT id,name FROM workspaces WHERE consultation_short_code=? AND status='ACTIVE' AND onboarding_completed=1 LIMIT 1`).bind(code).first<{id:string;name:string}>();
}

function slugBase(name: string): string {
  const normalized = name.normalize("NFKD").toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return normalized || "workspace";
}

function slugCandidate(name: string): string {
  return `${slugBase(name)}-${crypto.randomUUID().slice(0, 8)}`;
}

export interface CompleteOnboardingInput {
  userId: string;
  workspaceName: string;
  displayName: string;
  jobTitle: string | null;
}

export async function completeOnboarding(input: CompleteOnboardingInput): Promise<WorkspaceContext> {
  const db = await getDb();
  const current = await db.prepare(`
    SELECT u.onboarding_completed,
      EXISTS(SELECT 1 FROM workspace_members wm WHERE wm.user_id = u.id AND wm.status = 'ACTIVE') AS has_membership
    FROM users u WHERE u.id = ? AND u.status = 'ACTIVE'
  `).bind(input.userId).first<{ onboarding_completed: number; has_membership: number }>();

  if (!current) throw new Error("user_unavailable");
  if (current.onboarding_completed === 1 || current.has_membership === 1) {
    const existing = await findActiveWorkspaceContext(input.userId);
    if (existing) return existing;
    throw new Error("invalid_onboarding_state");
  }

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const workspaceId = crypto.randomUUID();
    const membershipId = crypto.randomUUID();
    const slug = slugCandidate(input.workspaceName);
    try {
      await db.batch([
        db.prepare(`
          INSERT INTO workspaces (id, name, slug, owner_user_id, onboarding_completed)
          SELECT ?, ?, ?, id, 1 FROM users
          WHERE id = ? AND status = 'ACTIVE' AND onboarding_completed = 0
        `).bind(workspaceId, input.workspaceName, slug, input.userId),
        db.prepare(`
          INSERT INTO workspace_members (id, workspace_id, user_id, role, status)
          VALUES (?, ?, ?, 'OWNER', 'ACTIVE')
        `).bind(membershipId, workspaceId, input.userId),
        db.prepare(`
          UPDATE users SET display_name = ?, job_title = ?, onboarding_completed = 1, updated_at = datetime('now')
          WHERE id = ? AND status = 'ACTIVE' AND onboarding_completed = 0
        `).bind(input.displayName, input.jobTitle, input.userId),
      ]);
      const context = await findActiveWorkspaceContext(input.userId);
      if (!context) throw new Error("workspace_context_missing");
      return context;
    } catch (error) {
      if (error instanceof Error && error.message.includes("workspaces.slug") && attempt < 4) continue;
      throw error;
    }
  }
  throw new Error("workspace_slug_unavailable");
}
