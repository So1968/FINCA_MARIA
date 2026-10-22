#!/usr/bin/env sh
set -eu

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.finca.yml}"
COMPOSE_OVERRIDE_FILE="${COMPOSE_OVERRIDE_FILE:-}"
FINCA_HTTP_PORT="${FINCA_HTTP_PORT:-18080}"
BASE_URL="${BASE_URL:-http://127.0.0.1:${FINCA_HTTP_PORT}}"
export FINCA_HTTP_PORT

: "${APP_ORIGIN:?APP_ORIGIN obligatoire}"
: "${POSTGRES_PASSWORD:?POSTGRES_PASSWORD obligatoire}"
: "${FINCA_BOOTSTRAP_ADMIN_EMAIL:?FINCA_BOOTSTRAP_ADMIN_EMAIL obligatoire}"
: "${FINCA_BOOTSTRAP_ADMIN_PASSWORD:?FINCA_BOOTSTRAP_ADMIN_PASSWORD obligatoire}"
: "${BACKUP_ENCRYPTION_PASSPHRASE:?BACKUP_ENCRYPTION_PASSPHRASE obligatoire}"

COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-finca_ci_${GITHUB_RUN_ID:-$$}}"
export COMPOSE_PROJECT_NAME

compose() {
  if [ -n "$COMPOSE_OVERRIDE_FILE" ]; then
    docker compose -f "$COMPOSE_FILE" -f "$COMPOSE_OVERRIDE_FILE" "$@"
  else
    docker compose -f "$COMPOSE_FILE" "$@"
  fi
}

TMP_DIR="$(mktemp -d)"
cleanup() {
  compose down -v --remove-orphans >/dev/null 2>&1 || true
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT INT TERM

fail() {
  echo "❌ $1" >&2
  compose ps >&2 || true
  compose logs --tail=120 finca-api finca-web finca-db finca-backup >&2 || true
  exit 1
}

pass() {
  echo "✅ $1"
}

echo "Démarrage de la pile FINCA MARIA pour test runtime…"
echo "Compose testé : $COMPOSE_FILE${COMPOSE_OVERRIDE_FILE:+ + $COMPOSE_OVERRIDE_FILE}"
compose up -d --build

ready=0
for _ in $(seq 1 60); do
  if curl -fsS "$BASE_URL/healthz" >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 2
done
[ "$ready" = "1" ] || fail "le frontend n'est pas devenu disponible"
pass "frontend disponible"

api_code="$(curl -sS -o "$TMP_DIR/api-health" -w '%{http_code}' "$BASE_URL/api/healthz" || true)"
[ "$api_code" = "200" ] || fail "API healthz = $api_code"
pass "API disponible"

login_page_code="$(curl -sS -o "$TMP_DIR/login-page" -D "$TMP_DIR/login-page-headers" -w '%{http_code}' "$BASE_URL/login.html" || true)"
[ "$login_page_code" = "200" ] || fail "page de connexion = $login_page_code"
grep -qi '^X-Content-Type-Options: nosniff' "$TMP_DIR/login-page-headers" || fail "en-tête nosniff absent"
grep -qi '^X-Frame-Options: DENY' "$TMP_DIR/login-page-headers" || fail "protection anti-iframe absente"
grep -qi '^Referrer-Policy: no-referrer' "$TMP_DIR/login-page-headers" || fail "Referrer-Policy absent"
grep -qi '^X-Robots-Tag: noindex, nofollow, noarchive' "$TMP_DIR/login-page-headers" || fail "protection robots absente"
grep -qi "^Content-Security-Policy: .*script-src 'self'" "$TMP_DIR/login-page-headers" || fail "CSP script-src stricte absente"
if grep -qi "^Content-Security-Policy: .*script-src[^;]*'unsafe-inline'" "$TMP_DIR/login-page-headers"; then
  fail "CSP autorise encore les scripts inline"
fi
pass "en-têtes de sécurité HTTP"

root_code="$(curl -sS -o /dev/null -D "$TMP_DIR/root-headers" -w '%{http_code}' "$BASE_URL/" || true)"
case "$root_code" in
  301|302|303|307|308) ;;
  *) fail "la racine sans session retourne $root_code" ;;
esac
pass "application protégée sans session"

unauth_bootstrap_code="$(curl -sS -o /dev/null -w '%{http_code}' "$BASE_URL/api/bootstrap" || true)"
[ "$unauth_bootstrap_code" = "401" ] || fail "API privée accessible sans session ($unauth_bootstrap_code)"
pass "API privée bloquée sans session"

login_body=$(printf '{"email":"%s","password":"%s"}' "$FINCA_BOOTSTRAP_ADMIN_EMAIL" "$FINCA_BOOTSTRAP_ADMIN_PASSWORD")
bad_origin_code="$(curl -sS -o "$TMP_DIR/bad-origin" -w '%{http_code}' \
  -H 'Origin: https://origine-interdite.example' \
  -H 'Content-Type: application/json' \
  --data "$login_body" \
  "$BASE_URL/api/auth/login" || true)"
[ "$bad_origin_code" = "403" ] || fail "une origine étrangère n'est pas refusée ($bad_origin_code)"
pass "origine étrangère refusée"

login_code="$(curl -sS -o "$TMP_DIR/login-body" -D "$TMP_DIR/login-headers" -w '%{http_code}' \
  -H "Origin: $APP_ORIGIN" \
  -H 'Content-Type: application/json' \
  --data "$login_body" \
  "$BASE_URL/api/auth/login" || true)"
[ "$login_code" = "200" ] || fail "connexion administrateur = $login_code"

COOKIE="$(awk 'BEGIN{IGNORECASE=1} /^Set-Cookie:/ {gsub(/\r/,""); sub(/^Set-Cookie:[[:space:]]*/,""); split($0,a,";"); if (a[1] ~ /^finca_session=/){print a[1]; exit}}' "$TMP_DIR/login-headers")"
[ -n "$COOKIE" ] || fail "cookie de session absent"
grep -qi '^Set-Cookie: .*HttpOnly' "$TMP_DIR/login-headers" || fail "cookie de session sans HttpOnly"
grep -qi '^Set-Cookie: .*SameSite=Strict' "$TMP_DIR/login-headers" || fail "cookie de session sans SameSite=Strict"
grep -qi '^Set-Cookie: .*Secure' "$TMP_DIR/login-headers" || fail "cookie de session sans Secure"
pass "connexion administrateur et cookie sécurisé"

# Parcours Réunions et conseils de famille.

# Historique : import en lot, conservation de la source, anti-doublon et registre
HISTORIC_BODY='{"items":[{"title":"Conseil historique CI","date":"2024-05-12","originalText":"Conseil du 12/05/2024\nDécision : refaire le toit.","candidates":["Décision : refaire le toit."]}]}'
historic_code="$(curl -sS -o "$TMP_DIR/historic-import" -w '%{http_code}' -X POST \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H "Content-Type: application/json" \
  --data "$HISTORIC_BODY" "$BASE_URL/api/meetings/import-historic" || true)"
[ "$historic_code" = "200" ] || fail "import historique = $historic_code"
historic_again_code="$(curl -sS -o "$TMP_DIR/historic-duplicate" -w '%{http_code}' -X POST \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H "Content-Type: application/json" \
  --data "$HISTORIC_BODY" "$BASE_URL/api/meetings/import-historic" || true)"
[ "$historic_again_code" = "200" ] || fail "réimport historique = $historic_again_code"
curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/meetings/decision-register" > "$TMP_DIR/historic-register"
node --input-type=module - "$TMP_DIR/historic-import" "$TMP_DIR/historic-duplicate" "$TMP_DIR/historic-register" <<'JS'
import assert from "node:assert/strict";
import fs from "node:fs";
const first = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const second = JSON.parse(fs.readFileSync(process.argv[3], "utf8"));
const register = JSON.parse(fs.readFileSync(process.argv[4], "utf8"));
assert.equal(first.imported, 1);
assert.equal(first.duplicates, 0);
assert.equal(second.imported, 0);
assert.equal(second.duplicates, 1);
const item = register.decisions.find(x => x.title === "Conseil historique CI");
assert.ok(item);
assert.equal(item.classification, "a_valider");
assert.equal(item.date, "2024-05-12");
JS
pass "archives : import unique, anti-doublon et registre à valider"

meeting_create_code="$(curl -sS -o "$TMP_DIR/meeting-create" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"title":"Conseil de famille CI","date":"2026-10-21","meetingType":"Conseil de famille","theme":"Test intégration","objective":"Valider le parcours complet sans inventer de décision","agenda":["Ouverture","Travaux","Validation"],"previousRecap":"Aucune décision précédente à reprendre.","recordingNotice":"Participants informés pour le test CI.","participants":[{"name":"Sofia","presence":"present","role":"Animatrice","isFacilitator":true},{"name":"Marie","presence":"excused","role":"Membre de la famille"}]}' \
  "$BASE_URL/api/meetings" || true)"
[ "$meeting_create_code" = "201" ] || fail "création réunion = $meeting_create_code"
MEETING_ID="$(node --input-type=module -e 'import fs from "node:fs"; console.log(JSON.parse(fs.readFileSync(process.argv[1],"utf8")).meeting.id)' "$TMP_DIR/meeting-create")"
[ -n "$MEETING_ID" ] || fail "identifiant réunion absent"

for marker in \
  '{"id":"ci-decision-marker","type":"decision","timeSeconds":12.5,"note":"Proposition à confirmer"}' \
  '{"id":"ci-action-marker","type":"action","timeSeconds":24.0,"note":"Appeler la coopérative"}' \
  '{"id":"ci-document-marker","type":"document_evoque","timeSeconds":31.0,"note":"Document BAÚL évoqué"}'
do
  code="$(curl -sS -o /dev/null -w '%{http_code}' \
    -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
    --data "$marker" "$BASE_URL/api/meetings/$MEETING_ID/markers" || true)"
  [ "$code" = "201" ] || fail "création marqueur réunion = $code"
done

curl -fsS -o "$TMP_DIR/meeting-action-update" -X PUT \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"note":"Appeler la coopérative","classification":"action_confirmee","responsible":"Sofia","dueDate":"2026-11-15"}' \
  "$BASE_URL/api/meetings/$MEETING_ID/markers/ci-action-marker"

printf 'CI AUDIO CHUNK FOR FINCA MEETING' > "$TMP_DIR/meeting-audio.part"
audio_chunk_code="$(curl -sS -o "$TMP_DIR/meeting-audio-chunk" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: audio/webm' \
  --data-binary @"$TMP_DIR/meeting-audio.part" \
  "$BASE_URL/api/meetings/$MEETING_ID/audio/chunks/0" || true)"
[ "$audio_chunk_code" = "201" ] || fail "sauvegarde progressive audio = $audio_chunk_code"

audio_duplicate_code="$(curl -sS -o "$TMP_DIR/meeting-audio-duplicate" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: audio/webm' \
  --data-binary @"$TMP_DIR/meeting-audio.part" \
  "$BASE_URL/api/meetings/$MEETING_ID/audio/chunks/0" || true)"
[ "$audio_duplicate_code" = "200" ] || fail "reprise idempotente du bloc audio = $audio_duplicate_code"
grep -q '"duplicate":true' "$TMP_DIR/meeting-audio-duplicate" || fail "bloc audio identique non reconnu"

finalize_code="$(curl -sS -o "$TMP_DIR/meeting-finalize" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"mimeType":"audio/webm","originalName":"conseil-ci.webm","recordingNotice":"Participants informés pour le test CI."}' \
  "$BASE_URL/api/meetings/$MEETING_ID/audio/finalize" || true)"
[ "$finalize_code" = "200" ] || fail "finalisation audio réunion = $finalize_code"

range_code="$(curl -sS -o "$TMP_DIR/meeting-range" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H 'Range: bytes=0-3' \
  "$BASE_URL/api/meetings/$MEETING_ID/audio" || true)"
[ "$range_code" = "206" ] || fail "lecture audio horodatée/range = $range_code"
[ "$(wc -c < "$TMP_DIR/meeting-range" | tr -d ' ')" = "4" ] || fail "plage audio incorrecte"

curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/meetings/transcription/health" > "$TMP_DIR/meeting-transcription-health"
node --input-type=module - "$TMP_DIR/meeting-transcription-health" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const status = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.equal(status.localOnly, true);
assert.equal(status.externalVerificationEnabled, false);
assert.equal(typeof status.localEngineReady, 'boolean');
assert.equal(status.whisperModel, 'large-v3-turbo');
JS

transcribe_base_code="$(curl -sS -o "$TMP_DIR/meeting-transcribe-base" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/meetings/$MEETING_ID/transcribe" || true)"
[ "$transcribe_base_code" = "503" ] || fail "instance sans moteur local ne refuse pas proprement la transcription ($transcribe_base_code)"
grep -q 'LOCAL_TRANSCRIPTION_NOT_READY' "$TMP_DIR/meeting-transcribe-base" || fail "absence du moteur local non explicitée"

meeting_update_code="$(curl -sS -o "$TMP_DIR/meeting-update" -w '%{http_code}' -X PUT \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"stage":"Validation","reportDraft":{"summary":"Brouillon CI sans transformation automatique des propositions.","subjects":"Test intégration"}}' \
  "$BASE_URL/api/meetings/$MEETING_ID" || true)"
[ "$meeting_update_code" = "200" ] || fail "sauvegarde brouillon compte rendu = $meeting_update_code"

validate_code="$(curl -sS -o "$TMP_DIR/meeting-validate" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/meetings/$MEETING_ID/validate" || true)"
[ "$validate_code" = "200" ] || fail "validation compte rendu = $validate_code"

action_code="$(curl -sS -o "$TMP_DIR/meeting-action-create" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"confirmed":true}' "$BASE_URL/api/meetings/$MEETING_ID/markers/ci-action-marker/create-action" || true)"
[ "$action_code" = "201" ] || fail "création action confirmée depuis réunion = $action_code"

action_again_code="$(curl -sS -o "$TMP_DIR/meeting-action-again" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"confirmed":true}' "$BASE_URL/api/meetings/$MEETING_ID/markers/ci-action-marker/create-action" || true)"
[ "$action_again_code" = "200" ] || fail "anti-doublon action réunion = $action_again_code"
grep -q '"duplicate":true' "$TMP_DIR/meeting-action-again" || fail "action réunion dupliquée"

curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/bootstrap" > "$TMP_DIR/meeting-bootstrap"
node --input-type=module - "$TMP_DIR/meeting-bootstrap" "$MEETING_ID" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const meetingId = process.argv[3];
const missions = payload.sharedState.cortijo_custom_missions_v1?.value || [];
const matches = missions.filter(item => item.sourceMeetingId === meetingId && item.sourceMarkerId === 'ci-action-marker');
assert.equal(matches.length, 1);
assert.equal(matches[0].assignedTo, 'Sofia');
assert.equal(matches[0].dueAt, '2026-11-15');
JS

curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/meetings/$MEETING_ID" > "$TMP_DIR/meeting-detail"
node --input-type=module - "$TMP_DIR/meeting-detail" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const meeting = JSON.parse(fs.readFileSync(process.argv[2], 'utf8')).meeting;
assert.equal(meeting.hasAudio, true);
assert.equal(meeting.participants.filter(p => p.presence === 'present').length, 1);
assert.equal(meeting.markers.length, 3);
assert.equal(meeting.validatedVersions[0].version, 1);
assert.equal(meeting.status, 'validated');
assert.equal(meeting.stage, 'Clôture');
JS
pass "réunions : préparation, marqueurs, audio progressif, validation et action sans doublon"

admin_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $COOKIE" "$BASE_URL/api/auth/check-admin" || true)"
[ "$admin_code" = "204" ] || fail "contrôle administrateur = $admin_code"
pass "rôle administrateur actif"

NONADMIN_EMAIL="heritier-ci@example.test"
NONADMIN_PASSWORD="CI_Heritier_password_123456789"
create_nonadmin_body=$(printf '{"email":"%s","name":"Heritier CI","password":"%s","roles":["heritier"]}' "$NONADMIN_EMAIL" "$NONADMIN_PASSWORD")
create_nonadmin_code="$(curl -sS -o "$TMP_DIR/nonadmin-create" -w '%{http_code}' \
  -H "Cookie: $COOKIE" \
  -H "Origin: $APP_ORIGIN" \
  -H 'Content-Type: application/json' \
  --data "$create_nonadmin_body" \
  "$BASE_URL/api/admin/users" || true)"
[ "$create_nonadmin_code" = "201" ] || fail "création compte non administrateur = $create_nonadmin_code"

nonadmin_login_body=$(printf '{"email":"%s","password":"%s"}' "$NONADMIN_EMAIL" "$NONADMIN_PASSWORD")
nonadmin_login_code="$(curl -sS -o "$TMP_DIR/nonadmin-login-body" -D "$TMP_DIR/nonadmin-login-headers" -w '%{http_code}' \
  -H "Origin: $APP_ORIGIN" \
  -H 'Content-Type: application/json' \
  --data "$nonadmin_login_body" \
  "$BASE_URL/api/auth/login" || true)"
[ "$nonadmin_login_code" = "200" ] || fail "connexion compte non administrateur = $nonadmin_login_code"
NONADMIN_COOKIE="$(awk 'BEGIN{IGNORECASE=1} /^Set-Cookie:/ {gsub(/\r/,""); sub(/^Set-Cookie:[[:space:]]*/,""); split($0,a,";"); if (a[1] ~ /^finca_session=/){print a[1]; exit}}' "$TMP_DIR/nonadmin-login-headers")"
[ -n "$NONADMIN_COOKIE" ] || fail "cookie compte non administrateur absent"

nonadmin_bootstrap_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/api/bootstrap" || true)"
[ "$nonadmin_bootstrap_code" = "403" ] || fail "un compte héritier accède au bootstrap administrateur ($nonadmin_bootstrap_code)"
pass "bootstrap administrateur bloqué pour le rôle héritier"

meeting_nonadmin_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/api/meetings/$MEETING_ID" || true)"
[ "$meeting_nonadmin_code" = "200" ] || fail "un cohéritier ne peut pas consulter la réunion ($meeting_nonadmin_code)"
pass "enregistrements de réunion réservés aux droits administrateur"

family_page_code="$(curl -sS -o "$TMP_DIR/family-page" -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/family/" || true)"
[ "$family_page_code" = "200" ] || fail "vue héritiers inaccessible ($family_page_code)"

family_me_code="$(curl -sS -o "$TMP_DIR/family-me" -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/family-api/me" || true)"
[ "$family_me_code" = "200" ] || fail "session héritier inaccessible ($family_me_code)"

allowed_family_state_code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"value":{"ciFamily":"visible"}}' "$BASE_URL/api/state/finca_maria_maison_notes_v1" || true)"
[ "$allowed_family_state_code" = "200" ] || fail "préparation donnée famille = $allowed_family_state_code"

private_state_code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"value":{"ciPrivate":"must-not-leak"}}' "$BASE_URL/api/state/cortijo_action_logs_v1" || true)"
[ "$private_state_code" = "200" ] || fail "préparation donnée interne = $private_state_code"

family_bootstrap_code="$(curl -sS -o "$TMP_DIR/family-bootstrap" -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/family-api/bootstrap" || true)"
[ "$family_bootstrap_code" = "200" ] || fail "bootstrap héritiers inaccessible ($family_bootstrap_code)"

node --input-type=module - "$TMP_DIR/family-bootstrap" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const payload = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.ok(Array.isArray(payload.reservations));
assert.equal(typeof payload.roomReady, 'object');
assert.equal(payload.sharedState.finca_maria_maison_notes_v1.value.ciFamily, 'visible');
assert.equal(payload.sharedState.cortijo_action_logs_v1, undefined);
for (const key of Object.keys(payload.sharedState)) {
  assert.ok([
    'finca_maria_maison_notes_v1',
    'finca_maria_jardin_suivi_v1',
    'finca_maria_lieux_vacanciers_v1',
    'finca_maria_sejour_checklist_v1',
    'finca_maria_entretien_maison_v1',
    'finca_maria_couchages_plan_v1',
    'finca_maria_inventaire_maison_v1'
  ].includes(key), `clé non autorisée dans la vue héritiers: ${key}`);
}
JS

family_write_code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
  -H "Cookie: $NONADMIN_COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"value":{"attempt":"blocked"}}' "$BASE_URL/api/state/finca_maria_maison_notes_v1" || true)"
[ "$family_write_code" = "403" ] || fail "un héritier peut écrire via l’API administrateur ($family_write_code)"

family_admin_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/api/admin/users" || true)"
[ "$family_admin_code" = "403" ] || fail "un héritier atteint l’administration ($family_admin_code)"
pass "vue héritiers : lecture serveur autorisée, données internes filtrées, écriture et administration bloquées"

app_code="$(curl -sS -o "$TMP_DIR/app" -w '%{http_code}' -H "Cookie: $COOKIE" "$BASE_URL/" || true)"
[ "$app_code" = "200" ] || fail "application authentifiée = $app_code"
pass "logiciel complet accessible à l'administrateur"

bootstrap_code="$(curl -sS -o "$TMP_DIR/bootstrap" -w '%{http_code}' -H "Cookie: $COOKIE" "$BASE_URL/api/bootstrap" || true)"
[ "$bootstrap_code" = "200" ] || fail "bootstrap = $bootstrap_code"
pass "PostgreSQL et état partagé accessibles"

secretariat_code="$(curl -sS -o "$TMP_DIR/secretariat-create" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"email":"secretariat-ci@example.test","name":"Secretariat CI","password":"CI_Secretariat_password_123456789","roles":["admin-secretariat"]}' \
  "$BASE_URL/api/admin/users")"
[ "$secretariat_code" = "201" ] || fail "création second administrateur = $secretariat_code"
secretariat_login="$(curl -sS -o /dev/null -D "$TMP_DIR/secretariat-headers" -w '%{http_code}' \
  -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"email":"secretariat-ci@example.test","password":"CI_Secretariat_password_123456789"}' \
  "$BASE_URL/api/auth/login")"
[ "$secretariat_login" = "200" ] || fail "connexion second administrateur = $secretariat_login"
SECOND_COOKIE="$(sed -n 's/^[Ss]et-[Cc]ookie: \(finca_session=[^;]*\).*/\1/p' "$TMP_DIR/secretariat-headers" | head -1)"
[ -n "$SECOND_COOKIE" ] || fail "cookie second administrateur absent"
for endpoint in / /api/bootstrap /api/admin/users /api/admin/audit /api/baul/status; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $SECOND_COOKIE" "$BASE_URL$endpoint")"
  if [ "$endpoint" = "/api/admin/users" ]; then
    [ "$code" = "403" ] || fail "la secrétaire accède aux comptes utilisateurs ($code)"
  else
    [ "$code" = "200" ] || fail "secrétariat : $endpoint = $code"
  fi
done
pass "accès secrétariat sans gestion des comptes"

for key in finca_maria_questions_v44_20260913 finca_maria_anomalies_v44_20260913 finca_maria_family_checks_v42_20260818 cortijo_terrain_mission_2026_08 cortijo_terrain_olive_markers_v2_30; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
    -H "Cookie: $SECOND_COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
    --data '{"value":{"ciShared":"visible-to-both-admins"}}' "$BASE_URL/api/state/$key")"
  [ "$code" = "200" ] || fail "écriture partagée $key = $code"
done
curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/bootstrap" > "$TMP_DIR/shared-bootstrap"
node --input-type=module - "$TMP_DIR/shared-bootstrap" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { sharedState } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
for (const key of ['finca_maria_questions_v44_20260913', 'finca_maria_anomalies_v44_20260913', 'finca_maria_family_checks_v42_20260818', 'cortijo_terrain_mission_2026_08', 'cortijo_terrain_olive_markers_v2_30']) {
  assert.equal(sharedState[key].value.ciShared, 'visible-to-both-admins');
}
assert.equal(sharedState.cortijo_notification_stamps_v1, undefined);
JS
notification_code="$(curl -sS -o /dev/null -w '%{http_code}' -X PUT \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{"value":{}}' "$BASE_URL/api/state/cortijo_notification_stamps_v1")"
[ "$notification_code" = "400" ] || fail "notifications appareil acceptées par le serveur"
pass "données partagées entre administrateurs et notifications locales"

curl -fsS -H "Cookie: $SECOND_COOKIE" "$BASE_URL/api/admin/audit?limit=invalid" > "$TMP_DIR/audit"
node --input-type=module - "$TMP_DIR/audit" <<'JS'
import fs from 'node:fs';
import assert from 'node:assert/strict';
const { events } = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
assert.ok(events.some(event => event.action === 'state_update'));
for (const event of events) {
  for (const field of ['before_value', 'after_value', 'ip_address', 'password_hash']) assert.equal(field in event, false);
}
JS
pass "audit consultable sans valeurs sensibles brutes"

printf 'FINCA MARIA CI\n' > "$TMP_DIR/baul-test.txt"
FILE_SIZE="$(wc -c < "$TMP_DIR/baul-test.txt" | tr -d ' ')"
FILE_HASH="$(sha256sum "$TMP_DIR/baul-test.txt" | awk '{print $1}')"
FILE_B64="$(base64 -w0 "$TMP_DIR/baul-test.txt")"
upload_body=$(printf '{"name":"baul-test-ci.txt","type":"text/plain","size":%s,"sha256":"%s","category":"verifier","batchId":"ci-runtime","contentBase64":"%s"}' "$FILE_SIZE" "$FILE_HASH" "$FILE_B64")

upload_code="$(curl -sS -o "$TMP_DIR/upload" -w '%{http_code}' \
  -H "Cookie: $COOKIE" \
  -H "Origin: $APP_ORIGIN" \
  -H 'Content-Type: application/json' \
  --data "$upload_body" \
  "$BASE_URL/api/baul/upload" || true)"
[ "$upload_code" = "201" ] || fail "import BAÚL = $upload_code"
pass "import BAÚL privé"

duplicate_code="$(curl -sS -o "$TMP_DIR/duplicate" -w '%{http_code}' \
  -H "Cookie: $COOKIE" \
  -H "Origin: $APP_ORIGIN" \
  -H 'Content-Type: application/json' \
  --data "$upload_body" \
  "$BASE_URL/api/baul/upload" || true)"
[ "$duplicate_code" = "200" ] || fail "contrôle doublon BAÚL = $duplicate_code"
grep -q '"duplicate":true' "$TMP_DIR/duplicate" || fail "le doublon BAÚL n'a pas été signalé"
pass "anti-doublon BAÚL"

DOCUMENT_ID="$(node --input-type=module -e 'import fs from "node:fs"; console.log(JSON.parse(fs.readFileSync(process.argv[1], "utf8")).document.id)' "$TMP_DIR/upload")"
preview_code="$(curl -sS -o "$TMP_DIR/preview" -D "$TMP_DIR/preview-headers" -w '%{http_code}' \
  -H "Cookie: $SECOND_COOKIE" "$BASE_URL/api/baul/preview?id=$DOCUMENT_ID")"
[ "$preview_code" = "200" ] || fail "prévisualisation par le secrétariat = $preview_code"
heir_preview_code="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $NONADMIN_COOKIE" "$BASE_URL/api/baul/preview?id=$DOCUMENT_ID" || true)"
[ "$heir_preview_code" = "200" ] || fail "cohéritier exclu de la consultation du document ($heir_preview_code)"
cmp "$TMP_DIR/baul-test.txt" "$TMP_DIR/preview" || fail "contenu prévisualisé incorrect"
grep -qi '^X-Frame-Options: SAMEORIGIN' "$TMP_DIR/preview-headers" || fail "aperçu BAÚL bloqué dans FINCA MARIA"
grep -qi "^Content-Security-Policy: .*script-src 'none'" "$TMP_DIR/preview-headers" || fail "scripts des documents non bloqués"
grep -qi "^Content-Security-Policy: .*frame-ancestors 'self'" "$TMP_DIR/preview-headers" || fail "aperçu autorisé hors FINCA MARIA"
pass "prévisualisation privée sans scripts de document"

# Sauvegarde chiffrée puis restauration isolée.
compose exec -T finca-backup /usr/local/bin/backup-finca
compose exec -T finca-backup sh -ec '
  cd /backups
  manifest=$(ls -t complete-*.sha256 | sed -n "1p")
  sha256sum -c "$manifest"
  sql=$(sed -n "1s/.*  //p" "$manifest")
  archive=$(sed -n "2s/.*  //p" "$manifest")
  case "$sql" in *.gpg) ;; *) exit 21 ;; esac
  case "$archive" in *.gpg) ;; *) exit 22 ;; esac
  ! find . -maxdepth 1 -type f \( -name "postgres-*.sql.gz" -o -name "baul-*.tar.gz" \) | grep -q .
  passfile=$(mktemp /tmp/finca-ci-pass-XXXXXX)
  trap "rm -f $passfile /tmp/finca-restore.sql.gz /tmp/finca-restore-baul.tar.gz" EXIT
  chmod 600 "$passfile"
  printf "%s" "$BACKUP_ENCRYPTION_PASSPHRASE" > "$passfile"
  createdb -h finca-db -U "$POSTGRES_USER" finca_restore_ci
  gpg --batch --yes --quiet --no-symkey-cache --pinentry-mode loopback --passphrase-file "$passfile" --output /tmp/finca-restore.sql.gz --decrypt "$sql"
  gzip -dc /tmp/finca-restore.sql.gz > /tmp/finca-restore.sql
  psql -h finca-db -U "$POSTGRES_USER" -d finca_restore_ci -v ON_ERROR_STOP=1 -f /tmp/finca-restore.sql >/dev/null
  count=$(psql -h finca-db -U "$POSTGRES_USER" -d finca_restore_ci -Atc "SELECT COUNT(*) FROM shared_state")
  [ "$count" -ge 5 ]
  mkdir /tmp/finca-restore-baul
  gpg --batch --yes --quiet --no-symkey-cache --pinentry-mode loopback --passphrase-file "$passfile" --output /tmp/finca-restore-baul.tar.gz --decrypt "$archive"
  tar -xzf /tmp/finca-restore-baul.tar.gz -C /tmp/finca-restore-baul
  find /tmp/finca-restore-baul -type f -exec sha256sum {} \;
' > "$TMP_DIR/restored-baul"
grep -q "$FILE_HASH" "$TMP_DIR/restored-baul" || fail "document BAÚL non retrouvé après restauration"
pass "sauvegarde chiffrée et restauration isolée PostgreSQL + BAÚL"

# Test complet de corbeille dans une base et un BAÚL isolés de CI.
TRASH_RESERVATION_ID="ci-reservation-trash-001"
reserve_code="$(curl -sS -o "$TMP_DIR/trash-reservation-new" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data "{\"id\":\"$TRASH_RESERVATION_ID\",\"name\":\"Réservation fictive CI\",\"place\":\"Chambre fictive CI\",\"arrival\":\"2028-04-01\",\"departure\":\"2028-04-03\"}" \
  "$BASE_URL/api/reservations" || true)"
[ "$reserve_code" = "200" ] || fail "création réservation test = $reserve_code"
trash_reserve_code="$(curl -sS -o "$TMP_DIR/trash-reservation-deleted" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/reservation/$TRASH_RESERVATION_ID/delete" || true)"
[ "$trash_reserve_code" = "200" ] || fail "mise corbeille réservation = $trash_reserve_code"
curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/trash" > "$TMP_DIR/trash-list"
grep -q "$TRASH_RESERVATION_ID" "$TMP_DIR/trash-list" || fail "réservation absente de la corbeille"
restore_reserve_code="$(curl -sS -o "$TMP_DIR/trash-reservation-restored" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/reservation/$TRASH_RESERVATION_ID/restore" || true)"
[ "$restore_reserve_code" = "200" ] || fail "restauration réservation = $restore_reserve_code"
pass "réservation supprimée, visible et restaurée"

trash_document_code="$(curl -sS -o "$TMP_DIR/trash-document-deleted" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/document/$DOCUMENT_ID/delete" || true)"
[ "$trash_document_code" = "200" ] || fail "mise en corbeille document = $trash_document_code"
hidden_document_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Cookie: $COOKIE" "$BASE_URL/api/baul/preview?id=$DOCUMENT_ID" || true)"
[ "$hidden_document_code" = "404" ] || fail "document supprimé encore visible = $hidden_document_code"
restore_document_code="$(curl -sS -o "$TMP_DIR/trash-document-restored" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/document/$DOCUMENT_ID/restore" || true)"
[ "$restore_document_code" = "200" ] || fail "restauration document = $restore_document_code"
curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/baul/preview?id=$DOCUMENT_ID" > "$TMP_DIR/trash-doc-restored-file"
cmp "$TMP_DIR/baul-test.txt" "$TMP_DIR/trash-doc-restored-file" || fail "octets document restauré différents"
pass "document BAÚL supprimé, invisible, restauré intact"

trash_meeting_code="$(curl -sS -o "$TMP_DIR/trash-meeting-deleted" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/meeting/$MEETING_ID/delete" || true)"
[ "$trash_meeting_code" = "200" ] || fail "mise en corbeille réunion = $trash_meeting_code"
hidden_meeting_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Cookie: $COOKIE" "$BASE_URL/api/meetings/$MEETING_ID" || true)"
[ "$hidden_meeting_code" = "404" ] || fail "réunion supprimée encore consultable = $hidden_meeting_code"
restore_meeting_code="$(curl -sS -o "$TMP_DIR/trash-meeting-restored" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/meeting/$MEETING_ID/restore" || true)"
[ "$restore_meeting_code" = "200" ] || fail "restauration réunion = $restore_meeting_code"
curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/meetings/$MEETING_ID" > "$TMP_DIR/trash-meeting-after-restore"
grep -q '"validatedVersions"' "$TMP_DIR/trash-meeting-after-restore" || fail "versions réunion perdues"
pass "réunion supprimée puis restaurée avec versions"

# Une purge de document ne peut pas être lancée sans contrôle des sauvegardes.
curl -fsS -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/document/$DOCUMENT_ID/delete" >/dev/null
deny_purge_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data "{\"kind\":\"document\",\"itemId\":\"$DOCUMENT_ID\",\"reviewed\":true,\"confirmation\":\"VIDER DEFINITIVEMENT\"}" \
  "$BASE_URL/api/trash/document/$DOCUMENT_ID/purge" || true)"
[ "$deny_purge_code" = "400" ] || fail "purge sans contrôle sauvegarde autorisée = $deny_purge_code"
purge_document_code="$(curl -sS -o "$TMP_DIR/trash-doc-purged" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data "{\"kind\":\"document\",\"itemId\":\"$DOCUMENT_ID\",\"reviewed\":true,\"backupReviewed\":true,\"confirmation\":\"VIDER DEFINITIVEMENT\"}" \
  "$BASE_URL/api/trash/document/$DOCUMENT_ID/purge" || true)"
[ "$purge_document_code" = "200" ] || fail "purge physique document = $purge_document_code"
grep -q '"pendingCleanup":false' "$TMP_DIR/trash-doc-purged" || fail "purge document encore en attente"
pass "suppression physique du document après confirmation administrateur"

curl -fsS -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data '{}' "$BASE_URL/api/trash/meeting/$MEETING_ID/delete" >/dev/null
purge_meeting_code="$(curl -sS -o "$TMP_DIR/trash-meeting-purged" -w '%{http_code}' \
  -H "Cookie: $COOKIE" -H "Origin: $APP_ORIGIN" -H 'Content-Type: application/json' \
  --data "{\"kind\":\"meeting\",\"itemId\":\"$MEETING_ID\",\"reviewed\":true,\"backupReviewed\":true,\"confirmation\":\"VIDER DEFINITIVEMENT\"}" \
  "$BASE_URL/api/trash/meeting/$MEETING_ID/purge" || true)"
[ "$purge_meeting_code" = "200" ] || fail "purge physique réunion = $purge_meeting_code"
grep -q '"pendingCleanup":false' "$TMP_DIR/trash-meeting-purged" || fail "purge réunion encore en attente"
curl -fsS -H "Cookie: $COOKIE" "$BASE_URL/api/trash/history" > "$TMP_DIR/trash-history"
grep -q "$MEETING_ID" "$TMP_DIR/trash-history" || fail "purge de la réunion absente de l'historique"
grep -q "$DOCUMENT_ID" "$TMP_DIR/trash-history" || fail "purge document absente de l'historique"
pass "purges définitives avec historique consultable"

logout_code="$(curl -sS -o /dev/null -w '%{http_code}' \
  -H "Cookie: $COOKIE" \
  -H "Origin: $APP_ORIGIN" \
  -H 'Content-Type: application/json' \
  --data '{}' \
  "$BASE_URL/api/auth/logout" || true)"
[ "$logout_code" = "204" ] || fail "déconnexion = $logout_code"

after_logout="$(curl -sS -o /dev/null -w '%{http_code}' -H "Cookie: $COOKIE" "$BASE_URL/api/auth/check-admin" || true)"
[ "$after_logout" = "401" ] || fail "la session reste valide après déconnexion ($after_logout)"
pass "déconnexion invalide la session"

echo "FINCA MARIA : test runtime complet OK"
