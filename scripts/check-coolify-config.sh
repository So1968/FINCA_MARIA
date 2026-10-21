#!/bin/sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.coolify.yml}"

fail() {
  echo "ERREUR : $*" >&2
  exit 1
}

pass() {
  echo "OK : $*"
}

[ -f "$COMPOSE_FILE" ] || fail "fichier Compose introuvable : $COMPOSE_FILE"
command -v docker >/dev/null 2>&1 || fail "Docker est requis"
docker compose version >/dev/null 2>&1 || fail "Docker Compose v2 est requis"

: "${APP_ORIGIN:?APP_ORIGIN obligatoire}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD obligatoire}"
: "${FINCA_BOOTSTRAP_ADMIN_EMAIL:?FINCA_BOOTSTRAP_ADMIN_EMAIL obligatoire}"
: "${FINCA_BOOTSTRAP_ADMIN_PASSWORD:?FINCA_BOOTSTRAP_ADMIN_PASSWORD obligatoire}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE obligatoire}"

case "$APP_ORIGIN" in
  https://*) ;;
  *) fail "APP_ORIGIN doit commencer par https://" ;;
esac

[ "${#POSTGRES_PASSWORD}" -ge 24 ] || fail "POSTGRES_PASSWORD doit contenir au moins 24 caractères"
[ "${#FINCA_BOOTSTRAP_ADMIN_PASSWORD}" -ge 16 ] || fail "FINCA_BOOTSTRAP_ADMIN_PASSWORD doit contenir au moins 16 caractères"
[ "${#BACKUP_ENCRYPTION_PASSPHRASE}" -ge 32 ] || fail "BACKUP_ENCRYPTION_PASSPHRASE doit contenir au moins 32 caractères"
[ "$POSTGRES_PASSWORD" != "$FINCA_BOOTSTRAP_ADMIN_PASSWORD" ] || fail "le mot de passe PostgreSQL et le mot de passe administrateur doivent être différents"
[ "$POSTGRES_PASSWORD" != "$BACKUP_ENCRYPTION_PASSPHRASE" ] || fail "le mot de passe PostgreSQL et la clé de sauvegarde doivent être différents"
[ "$FINCA_BOOTSTRAP_ADMIN_PASSWORD" != "$BACKUP_ENCRYPTION_PASSPHRASE" ] || fail "le mot de passe administrateur et la clé de sauvegarde doivent être différents"

case "$POSTGRES_PASSWORD" in
  *[!A-Za-z0-9._~-]*) fail "POSTGRES_PASSWORD doit utiliser uniquement A-Z a-z 0-9 . _ ~ -" ;;
esac

case "$FINCA_BOOTSTRAP_ADMIN_EMAIL" in
  *@*.*) ;;
  *) fail "FINCA_BOOTSTRAP_ADMIN_EMAIL ne ressemble pas à une adresse email" ;;
esac

docker compose -f "$COMPOSE_FILE" config --quiet
pass "Docker Compose est valide"

services="$(docker compose -f "$COMPOSE_FILE" config --services)"
for service in finca-web finca-api finca-db finca-backup; do
  printf '%s\n' "$services" | grep -qx "$service" || fail "service manquant : $service"
done
pass "les 4 services FINCA MARIA sont présents"

volumes="$(docker compose -f "$COMPOSE_FILE" config --volumes)"
for volume in finca_postgres finca_baul finca_backups; do
  printf '%s\n' "$volumes" | grep -qx "$volume" || fail "volume persistant manquant : $volume"
done
pass "les 3 volumes persistants sont présents"

pass "préparation Coolify validée sans afficher aucun secret"
