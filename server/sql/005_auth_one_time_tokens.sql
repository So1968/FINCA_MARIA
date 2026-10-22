-- Préparation des invitations et récupérations : aucune émission de lien ni activation de compte.
-- Migration additive et idempotente, compatible avec les données existantes.
BEGIN;

CREATE TABLE IF NOT EXISTS auth_one_time_tokens (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('invite', 'password_reset')),
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  requested_ip INET,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS auth_one_time_tokens_user_purpose_idx
  ON auth_one_time_tokens(user_id, purpose, created_at DESC);

CREATE INDEX IF NOT EXISTS auth_one_time_tokens_expiry_idx
  ON auth_one_time_tokens(expires_at)
  WHERE used_at IS NULL;

COMMIT;
