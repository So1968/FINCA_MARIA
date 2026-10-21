BEGIN;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL
);

INSERT INTO roles (id, label) VALUES
  ('admin-projet', 'Administrateur projet'),
  ('admin-secretariat', 'Administration complète'),
  ('secretaire', 'Secrétaire'),
  ('heritier', 'Héritier'),
  ('contributeur-familial', 'Contributeur familial'),
  ('conseil', 'Conseil / expert')
ON CONFLICT (id) DO UPDATE SET label = EXCLUDED.label;

CREATE TABLE IF NOT EXISTS user_roles (
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_agent TEXT,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions(expires_at);

CREATE TABLE IF NOT EXISTS shared_state (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  version BIGINT NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  place TEXT NOT NULL,
  arrival DATE NOT NULL,
  departure DATE NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT reservations_dates CHECK (departure > arrival)
);
CREATE INDEX IF NOT EXISTS reservations_place_dates_idx ON reservations(place, arrival, departure);

CREATE TABLE IF NOT EXISTS room_ready (
  room TEXT PRIMARY KEY,
  ready BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS baul_documents (
  id TEXT PRIMARY KEY,
  original_name TEXT NOT NULL,
  logical_name TEXT,
  mime_type TEXT,
  size_bytes BIGINT NOT NULL,
  sha256 TEXT NOT NULL UNIQUE,
  batch_id TEXT,
  requested_category TEXT,
  suggested_category TEXT NOT NULL DEFAULT 'verifier',
  category TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','validated')),
  storage_path TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  validated_at TIMESTAMPTZ,
  created_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
  validated_by BIGINT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS baul_documents_status_idx ON baul_documents(status, received_at DESC);
CREATE INDEX IF NOT EXISTS baul_documents_category_idx ON baul_documents(category, validated_at DESC);

CREATE TABLE IF NOT EXISTS audit_log (
  id BIGSERIAL PRIMARY KEY,
  actor_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT,
  actor_roles TEXT[] NOT NULL DEFAULT '{}',
  action TEXT NOT NULL,
  object_type TEXT NOT NULL,
  object_id TEXT,
  before_value JSONB,
  after_value JSONB,
  result TEXT NOT NULL DEFAULT 'ok',
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS audit_log_actor_id_idx ON audit_log(actor_id);

COMMIT;
