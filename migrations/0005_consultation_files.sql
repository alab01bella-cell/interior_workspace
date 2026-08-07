PRAGMA foreign_keys = ON;

CREATE TABLE consultation_drive_folders (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  file_category TEXT NOT NULL CHECK (file_category IN ('FIELD_PHOTO', 'BEFORE', 'AFTER', 'DOCUMENT')),
  drive_folder_id TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (consultation_id, file_category)
);

CREATE TABLE consultation_files (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  drive_file_id TEXT NOT NULL UNIQUE,
  drive_folder_id TEXT NOT NULL,
  file_category TEXT NOT NULL CHECK (file_category IN ('CHECKLIST_ORIGINAL', 'FIELD_PHOTO', 'BEFORE', 'AFTER', 'DOCUMENT')),
  original_file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size >= 0),
  uploaded_by_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  idempotency_key TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_consultation_files_original
  ON consultation_files(consultation_id, file_category)
  WHERE file_category = 'CHECKLIST_ORIGINAL';
CREATE UNIQUE INDEX idx_consultation_files_upload_key
  ON consultation_files(consultation_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX idx_consultation_files_consultation_category_created
  ON consultation_files(consultation_id, file_category, created_at DESC);
CREATE INDEX idx_consultation_files_workspace_consultation
  ON consultation_files(workspace_id, consultation_id);
CREATE INDEX idx_consultation_drive_folders_workspace_consultation
  ON consultation_drive_folders(workspace_id, consultation_id);
