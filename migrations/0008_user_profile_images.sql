PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN google_profile_image_url TEXT;
ALTER TABLE users ADD COLUMN custom_profile_drive_file_id TEXT;
ALTER TABLE users ADD COLUMN custom_profile_workspace_id TEXT REFERENCES workspaces(id) ON DELETE SET NULL;

UPDATE users
SET google_profile_image_url = profile_image_url
WHERE google_profile_image_url IS NULL;

CREATE INDEX idx_users_custom_profile_workspace
  ON users(custom_profile_workspace_id)
  WHERE custom_profile_drive_file_id IS NOT NULL;
