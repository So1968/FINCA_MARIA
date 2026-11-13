BEGIN;
ALTER TABLE meeting_participants DROP CONSTRAINT IF EXISTS meeting_participants_presence_check;
ALTER TABLE meeting_participants ADD CONSTRAINT meeting_participants_presence_check CHECK (presence IN ('present','absent','excused','unknown'));
ALTER TABLE meeting_participants ALTER COLUMN presence SET DEFAULT 'unknown';
CREATE TABLE IF NOT EXISTS meeting_sources (
 id TEXT PRIMARY KEY,
 meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
 name TEXT NOT NULL,
 sha256 TEXT NOT NULL,
 content BYTEA NOT NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 UNIQUE(meeting_id,sha256)
);
CREATE TABLE IF NOT EXISTS meeting_structure_reviews (
 meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
 review_hash TEXT NOT NULL,
 reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 reviewed_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
 PRIMARY KEY(meeting_id,review_hash)
);
COMMIT;
