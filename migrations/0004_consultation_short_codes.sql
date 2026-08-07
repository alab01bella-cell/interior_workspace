PRAGMA foreign_keys = ON;

ALTER TABLE workspaces ADD COLUMN consultation_short_code TEXT;

CREATE UNIQUE INDEX idx_workspaces_consultation_short_code
  ON workspaces(consultation_short_code)
  WHERE consultation_short_code IS NOT NULL;
