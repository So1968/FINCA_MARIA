#!/usr/bin/env sh
set -eu

BASE_URL="${1:-${APP_ORIGIN:-}}"
if [ -z "$BASE_URL" ]; then
  echo "Usage: $0 https://finca.exemple.fr" >&2
  exit 2
fi
BASE_URL="${BASE_URL%/}"

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

fail() {
  echo "❌ $1" >&2
  exit 1
}

pass() {
  echo "✅ $1"
}

health="$(curl -fsS "$BASE_URL/healthz" 2>/dev/null || true)"
[ "$health" = "ok" ] || fail "/healthz ne répond pas correctement"
pass "healthz"

api_health_code="$(curl -sS -o "$TMP_DIR/api-health" -w '%{http_code}' "$BASE_URL/api/healthz" || true)"
[ "$api_health_code" = "200" ] || fail "/api/healthz retourne $api_health_code"
pass "API healthz"

login_code="$(curl -sS -o "$TMP_DIR/login" -D "$TMP_DIR/login-headers" -w '%{http_code}' "$BASE_URL/login.html" || true)"
[ "$login_code" = "200" ] || fail "/login.html retourne $login_code"
pass "page de connexion publique"

root_code="$(curl -sS -o /dev/null -D "$TMP_DIR/root-headers" -w '%{http_code}' "$BASE_URL/" || true)"
case "$root_code" in
  301|302|303|307|308) ;;
  *) fail "la racine non authentifiée retourne $root_code au lieu d'une redirection" ;;
esac

grep -Eiq '^location:[[:space:]]*/login\.html([[:space:]]|$)' "$TMP_DIR/root-headers" || fail "la racine ne redirige pas vers /login.html"
pass "application protégée sans session"

auth_code="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/auth/check-admin" || true)"
[ "$auth_code" = "401" ] || fail "/api/auth/check-admin sans session retourne $auth_code au lieu de 401"
pass "contrôle administrateur"

grep -Eiq '^x-frame-options:[[:space:]]*DENY' "$TMP_DIR/login-headers" || fail "en-tête X-Frame-Options manquant"
grep -Eiq '^x-content-type-options:[[:space:]]*nosniff' "$TMP_DIR/login-headers" || fail "en-tête X-Content-Type-Options manquant"
grep -Eiq '^content-security-policy:' "$TMP_DIR/login-headers" || fail "Content-Security-Policy manquante"
pass "en-têtes de sécurité"

echo ""
echo "FINCA MARIA : contrôles publics Coolify OK pour $BASE_URL"
echo "Reste à tester manuellement : connexion admin, persistance PostgreSQL, synchronisation entre 2 navigateurs, import BAÚL, sauvegarde et restauration."
