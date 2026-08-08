PRAGMA foreign_keys = ON;

ALTER TABLE consultations ADD COLUMN quote_status TEXT NOT NULL DEFAULT 'NOT_CREATED'
  CHECK (quote_status IN ('NOT_CREATED', 'DRAFT', 'SENT'));
ALTER TABLE consultations ADD COLUMN quote_amount INTEGER CHECK (quote_amount IS NULL OR quote_amount >= 0);
ALTER TABLE consultations ADD COLUMN quote_sent_at TEXT;
ALTER TABLE consultations ADD COLUMN quote_note TEXT;
ALTER TABLE consultations ADD COLUMN quote_file_id TEXT REFERENCES consultation_files(id) ON DELETE SET NULL;
ALTER TABLE consultations ADD COLUMN contract_outcome TEXT NOT NULL DEFAULT 'PENDING'
  CHECK (contract_outcome IN ('PENDING', 'CONTRACTED', 'LOST'));
ALTER TABLE consultations ADD COLUMN contract_decided_at TEXT;
ALTER TABLE consultations ADD COLUMN lost_reason TEXT
  CHECK (lost_reason IS NULL OR lost_reason IN ('PRICE', 'SCHEDULE', 'COMPETITOR', 'SCOPE_MISMATCH', 'CUSTOMER_PLAN_CHANGED', 'NO_RESPONSE', 'ON_HOLD', 'OTHER'));
ALTER TABLE consultations ADD COLUMN lost_reason_note TEXT;

UPDATE consultations
SET contract_outcome = 'CONTRACTED', contract_decided_at = COALESCE(status_updated_at, updated_at, created_at)
WHERE status = 'CONTRACTED';

CREATE INDEX idx_consultations_workspace_quote_status
  ON consultations(workspace_id, quote_status, quote_sent_at DESC);
CREATE INDEX idx_consultations_workspace_contract_outcome
  ON consultations(workspace_id, contract_outcome, contract_decided_at DESC);

ALTER TABLE consultation_events RENAME TO consultation_events_v7;

CREATE TABLE consultation_events (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'CONSULTATION_RECEIVED', 'RESERVATION_CREATED', 'RESERVATION_UPDATED',
    'RESERVATION_CANCELLED', 'STATUS_CHANGED', 'ASSIGNEE_CHANGED',
    'QUOTE_CREATED', 'QUOTE_UPDATED', 'QUOTE_SENT', 'CONTRACT_OUTCOME_CHANGED'
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
FROM consultation_events_v7;

DROP TABLE consultation_events_v7;
CREATE INDEX idx_consultation_events_consultation_created ON consultation_events(consultation_id, created_at DESC);
CREATE INDEX idx_consultation_events_workspace_created ON consultation_events(workspace_id, created_at DESC);
