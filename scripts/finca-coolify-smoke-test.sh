#!/usr/bin/env sh
set -eu

: "${FINCA_URL:?Définir FINCA_URL, ex. https://finca.exemple.fr}"
: "${FINCA_ADMIN_EMAIL:?Définir FINCA_ADMIN_EMAIL}"
: "${FINCA_ADMIN_PASSWORD:?Définir FINCA_ADMIN_PASSWORD}"

BASE="${FINCA_URL%/}"
COOKIE_FILE="${TMPDIR:-/tmp}/finca-smoke-cookies-$$.txt"
trap 'rm -f "$COOKIE_FILE"' EXIT

say() { printf '%s\n' "$1"; }
fail() { printf 'ECHEC: %s\n' "$1" >&2; exit 1; }

say "1/7 healthz"
HEALTH="$(curl -fsS "$BASE/healthz")" || fail "healthz inaccessible"
[ "$HEALTH" = "ok" ] || fail "healthz inattendu"

say "2/7 application protégée"
STATUS="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE/")"
[ "$STATUS" = "302" ] || [ "$STATUS" = "303" ] || fail "la racine ne redirige pas sans session (HTTP $STATUS)"

say "3/7 page de connexion"
curl -fsS "$BASE/login.html" | grep -q "FINCA MARIA" || fail "page de connexion invalide"

say "4/7 connexion administrateur"
LOGIN_PAYLOAD=$(printf '{"email":"%s","password":"%s"}' \
  "$(printf '%s' "$FINCA_ADMIN_EMAIL" | sed 's/\\/\\\\/g; s/"/\\"/g')" \
  "$(printf '%s' "$FINCA_ADMIN_PASSWORD" | sed 's/\\/\\\\/g; s/"/\\"/g')")
LOGIN_STATUS="$(curl -sS -o /tmp/finca-login-$$.json -w '%{http_code}' \
  -c "$COOKIE_FILE" \
  -H 'Content-Type: application/json' \
  -H "Origin: $BASE" \
  -X POST \
  --data "$LOGIN_PAYLOAD" \
  "$BASE/api/auth/login")"
trap 'rm -f "$COOKIE_FILE" /tmp/finca-login-$$.json' EXIT
[ "$LOGIN_STATUS" = "200" ] || fail "connexion refusée (HTTP $LOGIN_STATUS)"

say "5/7 session et accès administrateur"
curl -fsS -b "$COOKIE_FILE" "$BASE/api/auth/me" | grep -q '"roles"' || fail "session non reconnue"
ADMIN_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' -b "$COOKIE_FILE" "$BASE/api/auth/check-admin")"
[ "$ADMIN_STATUS" = "204" ] || fail "rôle administrateur non reconnu (HTTP $ADMIN_STATUS)"

say "6/7 données partagées"
curl -fsS -b "$COOKIE_FILE" "$BASE/api/bootstrap" | grep -q '"sharedState"' || fail "bootstrap serveur indisponible"

say "7/7 déconnexion"
LOGOUT_STATUS="$(curl -sS -o /dev/null -w '%{http_code}' \
  -b "$COOKIE_FILE" \
  -H 'Content-Type: application/json' \
  -H "Origin: $BASE" \
  -X POST --data '{}' "$BASE/api/auth/logout")"
[ "$LOGOUT_STATUS" = "204" ] || fail "déconnexion incorrecte (HTTP $LOGOUT_STATUS)"

say "FINCA MARIA: test Coolify réussi"
