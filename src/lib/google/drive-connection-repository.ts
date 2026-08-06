import { getDb } from "@/lib/db/client";
import type { PublicWorkspaceGoogleConnection, WorkspaceGoogleConnection } from "@/types/workspace";
import type { EncryptedToken } from "./token-encryption";

interface ConnectionRow {
  id: string;
  workspace_id: string;
  connected_by_user_id: string;
  google_account_email: string;
  encrypted_refresh_token: string | null;
  token_iv: string | null;
  token_auth_tag: string | null;
  granted_scopes: string;
  drive_root_folder_id: string | null;
  connection_status: WorkspaceGoogleConnection["connectionStatus"];
  connected_at: string;
  updated_at: string;
  revoked_at: string | null;
}

function mapConnection(row: ConnectionRow): WorkspaceGoogleConnection {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    connectedByUserId: row.connected_by_user_id,
    googleAccountEmail: row.google_account_email,
    encryptedRefreshToken: row.encrypted_refresh_token,
    tokenIv: row.token_iv,
    tokenAuthTag: row.token_auth_tag,
    grantedScopes: row.granted_scopes.split(" ").filter(Boolean),
    driveRootFolderId: row.drive_root_folder_id,
    connectionStatus: row.connection_status,
    connectedAt: row.connected_at,
    updatedAt: row.updated_at,
    revokedAt: row.revoked_at,
  };
}

export async function findDriveConnection(workspaceId: string): Promise<WorkspaceGoogleConnection | null> {
  const row = await (await getDb()).prepare(`
    SELECT * FROM workspace_google_connections WHERE workspace_id = ? LIMIT 1
  `).bind(workspaceId).first<ConnectionRow>();
  return row ? mapConnection(row) : null;
}

export async function findPublicDriveConnection(workspaceId: string): Promise<PublicWorkspaceGoogleConnection | null> {
  const connection = await findDriveConnection(workspaceId);
  if (!connection) return null;
  return {
    id: connection.id,
    workspaceId: connection.workspaceId,
    connectedByUserId: connection.connectedByUserId,
    googleAccountEmail: connection.googleAccountEmail,
    grantedScopes: connection.grantedScopes,
    driveRootFolderId: connection.driveRootFolderId,
    connectionStatus: connection.connectionStatus,
    connectedAt: connection.connectedAt,
    updatedAt: connection.updatedAt,
    revokedAt: connection.revokedAt,
  };
}

interface SaveConnectionInput {
  workspaceId: string;
  userId: string;
  email: string;
  token: EncryptedToken;
  grantedScopes: string[];
  folderId: string;
}

export async function saveConnectedDrive(input: SaveConnectionInput): Promise<void> {
  const db = await getDb();
  await db.batch([
    db.prepare(`
      INSERT INTO workspace_google_connections (
        id, workspace_id, connected_by_user_id, google_account_email,
        encrypted_refresh_token, token_iv, token_auth_tag, granted_scopes,
        drive_root_folder_id, connection_status, connected_at, updated_at, revoked_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'CONNECTED', datetime('now'), datetime('now'), NULL)
      ON CONFLICT(workspace_id) DO UPDATE SET
        connected_by_user_id = excluded.connected_by_user_id,
        google_account_email = excluded.google_account_email,
        encrypted_refresh_token = excluded.encrypted_refresh_token,
        token_iv = excluded.token_iv,
        token_auth_tag = excluded.token_auth_tag,
        granted_scopes = excluded.granted_scopes,
        drive_root_folder_id = excluded.drive_root_folder_id,
        connection_status = 'CONNECTED',
        connected_at = datetime('now'), updated_at = datetime('now'), revoked_at = NULL
    `).bind(
      crypto.randomUUID(), input.workspaceId, input.userId, input.email,
      input.token.ciphertext, input.token.iv, input.token.authTag,
      input.grantedScopes.join(" "), input.folderId,
    ),
    db.prepare(`
      UPDATE workspaces SET google_drive_connection_status = 'CONNECTED', updated_at = datetime('now')
      WHERE id = ? AND status = 'ACTIVE'
    `).bind(input.workspaceId),
  ]);
}

export async function markDriveRevoked(workspaceId: string): Promise<void> {
  const db = await getDb();
  await db.batch([
    db.prepare(`
      UPDATE workspace_google_connections
      SET encrypted_refresh_token = NULL, token_iv = NULL, token_auth_tag = NULL,
        connection_status = 'REVOKED', revoked_at = datetime('now'), updated_at = datetime('now')
      WHERE workspace_id = ?
    `).bind(workspaceId),
    db.prepare(`
      UPDATE workspaces SET google_drive_connection_status = 'DISCONNECTED', updated_at = datetime('now')
      WHERE id = ? AND status = 'ACTIVE'
    `).bind(workspaceId),
  ]);
}
