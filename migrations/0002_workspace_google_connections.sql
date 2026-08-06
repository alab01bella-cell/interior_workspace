PRAGMA foreign_keys = ON;

CREATE TABLE workspace_google_connections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  connected_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  google_account_email TEXT NOT NULL,
  encrypted_refresh_token TEXT,
  token_iv TEXT,
  token_auth_tag TEXT,
  granted_scopes TEXT NOT NULL,
  drive_root_folder_id TEXT,
  connection_status TEXT NOT NULL DEFAULT 'CONNECTED'
    CHECK (connection_status IN ('CONNECTED', 'REVOKED', 'ERROR')),
  connected_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  revoked_at TEXT,
  CHECK (
    connection_status = 'REVOKED'
    OR (encrypted_refresh_token IS NOT NULL AND token_iv IS NOT NULL AND token_auth_tag IS NOT NULL)
  )
);

CREATE INDEX idx_workspace_google_connections_status
  ON workspace_google_connections(connection_status, updated_at);
CREATE INDEX idx_workspace_google_connections_connected_by
  ON workspace_google_connections(connected_by_user_id);
