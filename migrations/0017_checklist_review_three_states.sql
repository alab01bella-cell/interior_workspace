ALTER TABLE consultation_checklist_reviews
ADD COLUMN is_checked INTEGER NOT NULL DEFAULT 0 CHECK (is_checked IN (0, 1));

UPDATE consultation_checklist_reviews
SET is_checked = 1
WHERE is_confirmed = 1;
