PRAGMA foreign_keys = ON;

ALTER TABLE workspaces ADD COLUMN consultation_public_key TEXT;
UPDATE workspaces
SET consultation_public_key = lower(hex(randomblob(24)))
WHERE consultation_public_key IS NULL;
CREATE UNIQUE INDEX idx_workspaces_consultation_public_key
  ON workspaces(consultation_public_key) WHERE consultation_public_key IS NOT NULL;

CREATE TABLE workspace_google_resources (
  workspace_id TEXT PRIMARY KEY REFERENCES workspaces(id) ON DELETE CASCADE,
  consultation_parent_folder_id TEXT,
  consultation_spreadsheet_id TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE consultations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  idempotency_key TEXT NOT NULL,
  client_name TEXT NOT NULL,
  contact_method TEXT NOT NULL,
  contact_value TEXT NOT NULL,
  region TEXT NOT NULL,
  area TEXT NOT NULL,
  budget_amount INTEGER NOT NULL CHECK (budget_amount >= 0),
  preferred_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RECEIVED'
    CHECK (status IN ('RECEIVED', 'RESERVED', 'COMPLETED', 'CONTRACTED')),
  form_version TEXT NOT NULL,
  form_payload_json TEXT NOT NULL CHECK (json_valid(form_payload_json)),
  drive_folder_id TEXT,
  external_sync_status TEXT NOT NULL DEFAULT 'PENDING'
    CHECK (external_sync_status IN ('PENDING', 'PARTIAL', 'FAILED', 'SYNCED', 'PERMISSION_REQUIRED')),
  sheet_synced_at TEXT,
  sync_error_code TEXT,
  submitted_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (workspace_id, idempotency_key)
);

CREATE INDEX idx_consultations_workspace_created
  ON consultations(workspace_id, created_at DESC);
CREATE INDEX idx_consultations_workspace_status_created
  ON consultations(workspace_id, status, created_at DESC);
CREATE INDEX idx_consultations_external_sync
  ON consultations(workspace_id, external_sync_status, updated_at);
