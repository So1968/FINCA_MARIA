#!/bin/sh
# Sauvegarde FINCA MARIA : les archives publiées sont toujours chiffrées.
set -eu
set -o pipefail
umask 077

BACKUP_DIR="${BACKUP_DIR:-/backups}"
BAUL_DIR="${BAUL_DIR:-/data/baul}"
PGHOST="${PGHOST:-finca-db}"
export PGHOST
: "${POSTGRES_USER:?POSTGRES_USER obligatoire}"
: "${POSTGRES_DB:?POSTGRES_DB obligatoire}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE obligatoire}"

if [ "${#BACKUP_ENCRYPTION_PASSPHRASE}" -lt 32 ]; then
  echo "BACKUP_ENCRYPTION_PASSPHRASE doit contenir au moins 32 caractères" >&2
  exit 1
fi

GNUPGHOME="${GNUPGHOME:-/tmp/finca-gnupg}"
export GNUPGHOME
mkdir -p "$GNUPGHOME" "$BACKUP_DIR"
chmod 700 "$GNUPGHOME"

make_passfile() {
  passfile=$(mktemp /tmp/finca-backup-pass-XXXXXX)
  chmod 600 "$passfile"
  printf '%s' "$BACKUP_ENCRYPTION_PASSPHRASE" > "$passfile"
  printf '%s' "$passfile"
}

gpg_encrypt() {
  passfile="$1"
  output="$2"
  gpg --batch --yes --quiet --no-symkey-cache --pinentry-mode loopback \
    --passphrase-file "$passfile" --cipher-algo AES256 --compress-algo none \
    --symmetric --output "$output"
}

gpg_decrypt() {
  passfile="$1"
  input="$2"
  gpg --batch --yes --quiet --no-symkey-cache --pinentry-mode loopback \
    --passphrase-file "$passfile" --decrypt "$input"
}

backup_once() (
  set -eu
  set -o pipefail
  staging=$(mktemp -d "$BACKUP_DIR/.pending-XXXXXXXX")
  passfile=$(make_passfile)
  cleanup() {
    rm -f "$passfile"
    rm -rf "$staging"
  }
  trap cleanup EXIT HUP INT TERM

  stamp="$(date -u +%Y%m%dT%H%M%SZ)-${staging##*-}"
  sql_enc="$staging/postgres-$stamp.sql.gz.gpg"
  baul_enc="$staging/baul-$stamp.tar.gz.gpg"
  manifest="$staging/complete-$stamp.sha256"

  # Aucun dump PostgreSQL ni fichier BAÚL en clair n'est écrit dans le volume de sauvegarde.
  pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" | gzip -c | gpg_encrypt "$passfile" "$sql_enc"
  tar -czf - -C "$BAUL_DIR/.." "${BAUL_DIR##*/}" | gpg_encrypt "$passfile" "$baul_enc"

  # Vérifier que le chiffrement est réellement déchiffrable avant publication.
  gpg_decrypt "$passfile" "$sql_enc" | gzip -t
  gpg_decrypt "$passfile" "$baul_enc" | tar -tzf - >/dev/null

  (cd "$staging" && sha256sum "postgres-$stamp.sql.gz.gpg" "baul-$stamp.tar.gz.gpg" > "complete-$stamp.sha256")

  mv "$sql_enc" "$BACKUP_DIR/"
  mv "$baul_enc" "$BACKUP_DIR/"
  mv "$manifest" "$BACKUP_DIR/"
  echo "Sauvegarde chiffrée complète FINCA MARIA : $stamp"

  find "$BACKUP_DIR" -maxdepth 1 -type f \( \
    -name 'postgres-*.sql.gz.gpg' -o \
    -name 'baul-*.tar.gz.gpg' -o \
    -name 'complete-*.sha256' \
  \) -mtime "+${BACKUP_RETENTION_DAYS:-14}" -exec rm -f {} \;
)

if [ "${1:-}" = "--loop" ]; then
  while true; do
    backup_once
    sleep "${BACKUP_INTERVAL_SECONDS:-86400}"
  done
else
  backup_once
fi
