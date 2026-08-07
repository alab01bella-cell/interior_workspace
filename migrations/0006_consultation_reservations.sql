PRAGMA foreign_keys = ON;

ALTER TABLE consultations ADD COLUMN scheduled_at TEXT;
ALTER TABLE consultations ADD COLUMN scheduled_note TEXT;
ALTER TABLE consultations ADD COLUMN status_updated_at TEXT;

UPDATE consultations
SET status_updated_at = COALESCE(updated_at, created_at)
WHERE status_updated_at IS NULL;

CREATE INDEX idx_consultations_workspace_scheduled
  ON consultations(workspace_id, scheduled_at)
  WHERE scheduled_at IS NOT NULL;

CREATE TABLE consultation_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CONSULTATION_RECEIVED',
    'RESERVATION_CREATED',
    'RESERVATION_UPDATED',
    'RESERVATION_CANCELLED',
    'STATUS_CHANGED'
  )),
  event_payload_json TEXT NOT NULL DEFAULT '{}' CHECK (json_valid(event_payload_json)),
  actor_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (consultation_id, idempotency_key)
);

CREATE INDEX idx_consultation_events_consultation_created
  ON consultation_events(consultation_id, created_at DESC);
CREATE INDEX idx_consultation_events_workspace_created
  ON consultation_events(workspace_id, created_at DESC);
