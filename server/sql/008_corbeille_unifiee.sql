BEGIN;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE reservations ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE meetings ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE baul_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE baul_documents ADD COLUMN IF NOT EXISTS deleted_by BIGINT REFERENCES users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS reservations_trash_idx ON reservations(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS meetings_trash_idx ON meetings(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS baul_trash_idx ON baul_documents(deleted_at) WHERE deleted_at IS NOT NULL;
CREATE TABLE IF NOT EXISTS trash_purge_receipts (
 id BIGSERIAL PRIMARY KEY,
 kind TEXT NOT NULL CHECK (kind IN ('reservation','meeting','document')),
 object_id TEXT NOT NULL,
 deleted_by BIGINT,
 purged_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
 purged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 item_summary TEXT NOT NULL
);
COMMIT;
