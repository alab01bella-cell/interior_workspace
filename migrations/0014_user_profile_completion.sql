ALTER TABLE users ADD COLUMN profile_completed INTEGER NOT NULL DEFAULT 0
  CHECK (profile_completed IN (0, 1));

-- Existing active accounts keep their current login flow. Future invited users
-- remain incomplete until they explicitly save a name and job title.
UPDATE users
SET profile_completed = 1
WHERE onboarding_completed = 1;

CREATE INDEX idx_users_status_profile_completed
  ON users(status, profile_completed);
