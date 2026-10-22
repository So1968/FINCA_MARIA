BEGIN;
CREATE TABLE IF NOT EXISTS trash_file_cleanup (
  id BIGSERIAL PRIMARY KEY,
  kind TEXT NOT NULL CHECK (kind IN ('meeting','document')),
  object_id TEXT NOT NULL,
  relative_path TEXT NOT NULL,
  file_kind TEXT NOT NULL CHECK (file_kind IN ('file','directory')),
  queued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  last_error TEXT,
  UNIQUE(kind, object_id, relative_path)
);
CREATE INDEX IF NOT EXISTS trash_cleanup_pending_idx
  ON trash_file_cleanup(queued_at) WHERE processed_at IS NULL;
COMMIT;
