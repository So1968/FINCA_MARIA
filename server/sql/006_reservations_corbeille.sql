BEGIN;
ALTER TABLE reservations
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS reservations_deleted_at_idx ON reservations(deleted_at) WHERE deleted_at IS NOT NULL;
COMMIT;
