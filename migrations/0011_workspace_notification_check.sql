ALTER TABLE workspace_members ADD COLUMN last_notification_checked_at TEXT;

CREATE INDEX idx_consultations_workspace_submitted
  ON consultations(workspace_id, submitted_at DESC);
