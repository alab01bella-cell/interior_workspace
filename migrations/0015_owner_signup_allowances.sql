CREATE TABLE owner_signup_allowances (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  status TEXT NOT NULL DEFAULT 'ALLOWED' CHECK (status IN ('ALLOWED', 'COMPLETED', 'CANCELLED')),
  allowed_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  completed_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  completed_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_owner_signup_allowances_status_created
  ON owner_signup_allowances(status, created_at DESC);
