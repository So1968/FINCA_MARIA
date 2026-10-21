BEGIN;

CREATE TABLE IF NOT EXISTS meetings (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE NOT NULL,
  meeting_type TEXT NOT NULL DEFAULT 'Conseil de famille',
  theme TEXT NOT NULL DEFAULT '',
  objective TEXT NOT NULL DEFAULT '',
  agenda JSONB NOT NULL DEFAULT '[]'::jsonb,
  previous_recap TEXT NOT NULL DEFAULT '',
  stage TEXT NOT NULL DEFAULT 'Ouverture',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','recording','ready','transcribing','review','validated','failed')),
  recording_notice TEXT NOT NULL DEFAULT '',
  recording_notice_confirmed_at TIMESTAMPTZ,
  audio_original_name TEXT,
  audio_mime_type TEXT,
  audio_size_bytes BIGINT,
  audio_sha256 TEXT,
  audio_storage_path TEXT,
  transcription_state TEXT NOT NULL DEFAULT 'not_started' CHECK (transcription_state IN ('not_started','queued','running','done','error')),
  transcription_error TEXT,
  transcription_cache_key TEXT,
  transcription_engine TEXT,
  transcript JSONB,
  speaker_overrides JSONB NOT NULL DEFAULT '{}'::jsonb,
  report_draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meetings_date_idx ON meetings(meeting_date DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS meetings_status_idx ON meetings(status, updated_at DESC);
CREATE INDEX IF NOT EXISTS meetings_audio_hash_idx ON meetings(audio_sha256) WHERE audio_sha256 IS NOT NULL;

CREATE TABLE IF NOT EXISTS meeting_participants (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  presence TEXT NOT NULL DEFAULT 'present' CHECK (presence IN ('present','absent','excused')),
  role TEXT NOT NULL DEFAULT '',
  is_facilitator BOOLEAN NOT NULL DEFAULT FALSE,
  added_during BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meeting_participants_meeting_idx ON meeting_participants(meeting_id, sort_order, created_at);

CREATE TABLE IF NOT EXISTS meeting_markers (
  id TEXT PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  marker_type TEXT NOT NULL,
  time_seconds DOUBLE PRECISION NOT NULL DEFAULT 0 CHECK (time_seconds >= 0),
  note TEXT NOT NULL DEFAULT '',
  classification TEXT NOT NULL DEFAULT 'declaration',
  responsible TEXT NOT NULL DEFAULT '',
  due_date DATE,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS meeting_markers_meeting_idx ON meeting_markers(meeting_id, time_seconds, created_at);

CREATE TABLE IF NOT EXISTS meeting_audio_chunks (
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  seq INTEGER NOT NULL CHECK (seq >= 0),
  mime_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  sha256 TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (meeting_id, seq)
);

CREATE TABLE IF NOT EXISTS meeting_report_versions (
  id BIGSERIAL PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  version INTEGER NOT NULL CHECK (version > 0),
  snapshot JSONB NOT NULL,
  validated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  validated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, version)
);
CREATE INDEX IF NOT EXISTS meeting_report_versions_meeting_idx ON meeting_report_versions(meeting_id, version DESC);

CREATE TABLE IF NOT EXISTS meeting_links (
  id BIGSERIAL PRIMARY KEY,
  meeting_id TEXT NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  marker_id TEXT REFERENCES meeting_markers(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('action','document')),
  target_ref TEXT NOT NULL,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(meeting_id, kind, target_ref)
);
CREATE INDEX IF NOT EXISTS meeting_links_meeting_idx ON meeting_links(meeting_id, created_at);

COMMIT;
