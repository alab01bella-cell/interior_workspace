PRAGMA foreign_keys = ON;

CREATE TABLE workspace_invitations (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email TEXT NOT NULL COLLATE NOCASE,
  role TEXT NOT NULL DEFAULT 'MEMBER' CHECK (role = 'MEMBER'),
  token_hash TEXT NOT NULL UNIQUE,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED')),
  expires_at TEXT NOT NULL,
  accepted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_workspace_invitations_pending_email
  ON workspace_invitations(workspace_id, email)
  WHERE status = 'PENDING';
CREATE INDEX idx_workspace_invitations_workspace_status
  ON workspace_invitations(workspace_id, status, created_at DESC);

ALTER TABLE consultations ADD COLUMN assigned_user_id TEXT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX idx_consultations_workspace_assignee
  ON consultations(workspace_id, assigned_user_id, submitted_at DESC);

ALTER TABLE consultation_events RENAME TO consultation_events_v6;

CREATE TABLE consultation_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CONSULTATION_RECEIVED',
    'RESERVATION_CREATED',
    'RESERVATION_UPDATED',
    'RESERVATION_CANCELLED',
    'STATUS_CHANGED',
    'ASSIGNEE_CHANGED'
  )),
  event_payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(event_payload_json)),
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (consultation_id, idempotency_key)
);

INSERT INTO consultation_events
  (id, workspace_id, consultation_id, event_type, event_payload_json, actor_user_id, idempotency_key, created_at)
SELECT id, workspace_id, consultation_id, event_type, event_payload_json, actor_user_id, idempotency_key, created_at
FROM consultation_events_v6;

DROP TABLE consultation_events_v6;
CREATE INDEX idx_consultation_events_consultation_created
  ON consultation_events(consultation_id, created_at DESC);
CREATE INDEX idx_consultation_events_workspace_created
  ON consultation_events(workspace_id, created_at DESC);
