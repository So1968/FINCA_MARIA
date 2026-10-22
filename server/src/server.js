import http from "node:http";
import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { createMeetingRouter } from "./meetings.js";
import { createTrashRouter } from "./trash.js";

const { Pool } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL;
const APP_ORIGIN = String(process.env.APP_ORIGIN || "").replace(/\/+$/, "");
const COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "finca_session";
const COOKIE_SECURE = process.env.COOKIE_SECURE !== "false";
const SESSION_HOURS = Math.max(1, Math.min(168, Number(process.env.SESSION_HOURS || 12)));
const MAX_BODY = 2 * 1024 * 1024;
const MAX_BAUL_FILE = 120 * 1024 * 1024;
const MAX_BAUL_BODY = 170 * 1024 * 1024;
const BAUL_ROOT = path.resolve(process.env.BAUL_ROOT || "/data/baul");
const ADMIN_ROLES = new Set(["admin-projet", "admin-secretariat"]);
const ACCOUNT_ADMIN_ROLES = new Set(["admin-projet"]);
const FAMILY_ROLES = new Set(["heritier", "admin-projet", "admin-secretariat", "conseil", "contributeur-familial"]);
const BAUL_CATEGORIES = new Set(["factures", "cooperative", "pac", "pelaez", "terrain", "casa", "reunions", "messages", "plans", "verifier"]);
const SHARED_KEYS = new Set([
  "finca_maria_maison_notes_v1",
  "finca_maria_jardin_suivi_v1",
  "finca_maria_lieux_vacanciers_v1",
  "finca_maria_sejour_checklist_v1",
  "finca_maria_entretien_maison_v1",
  "finca_maria_couchages_plan_v1",
  "finca_maria_inventaire_maison_v1",
  "cortijo_action_logs_v1",
  "cortijo_action_facts_v1",
  "cortijo_followups_v1",
  "cortijo_action_assignments_v1",
  "cortijo_action_contacts_v1",
  "cortijo_team_v1",
  "cortijo_custom_missions_v1",
  "finca_maria_questions_v44_20260913",
  "finca_maria_anomalies_v44_20260913",
  "finca_maria_family_checks_v42_20260818",
  "cortijo_terrain_mission_2026_08",
  "cortijo_terrain_olive_markers_v2_30"
]);

const FAMILY_SHARED_KEYS = new Set([
  "finca_maria_maison_notes_v1",
  "finca_maria_jardin_suivi_v1",
  "finca_maria_lieux_vacanciers_v1",
  "finca_maria_sejour_checklist_v1",
  "finca_maria_entretien_maison_v1",
  "finca_maria_couchages_plan_v1",
  "finca_maria_inventaire_maison_v1"
]);

if (!DATABASE_URL) throw new Error("DATABASE_URL est obligatoire");

const pool = new Pool({
  connectionString: DATABASE_URL,
  max: Number(process.env.PGPOOL_MAX || 10),
  idleTimeoutMillis: 30000
});

pool.on("error", (error) => console.error("Erreur PostgreSQL sur une connexion inactive", error));

function json(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    ...headers
  });
  res.end(payload);
}

function noContent(res, status = 204, headers = {}) {
  res.writeHead(status, { "Cache-Control": "no-store", ...headers });
  res.end();
}

function clientIp(req) {
  return String(req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
    .split(",")[0]
    .trim()
    .slice(0, 120);
}

function cookies(req) {
  const output = {};
  for (const chunk of String(req.headers.cookie || "").split(";")) {
    const index = chunk.indexOf("=");
    if (index < 0) continue;
    const key = chunk.slice(0, index).trim();
    const value = chunk.slice(index + 1).trim();
    if (key) output[key] = decodeURIComponent(value);
  }
  return output;
}

function sessionCookie(token, maxAgeSeconds) {
  const parts = [
    `${COOKIE_NAME}=${encodeURIComponent(token)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Strict",
    `Max-Age=${Math.max(0, Math.floor(maxAgeSeconds))}`
  ];
  if (COOKIE_SECURE) parts.push("Secure");
  return parts.join("; ");
}

function clearSessionCookie() {
  return sessionCookie("", 0);
}

function tokenHash(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

async function readBody(req, maxBytes = MAX_BODY) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) {
      const error = new Error("Corps de requête trop volumineux");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    const error = new Error("JSON invalide");
    error.status = 400;
    throw error;
  }
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function validatePassword(password) {
  const value = String(password || "");
  if (value.length < 12) throw Object.assign(new Error("Le mot de passe doit contenir au moins 12 caractères"), { status: 400 });
  if (value.length > 200) throw Object.assign(new Error("Mot de passe trop long"), { status: 400 });
  return value;
}

function scryptAsync(password, salt) {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }, (error, derived) => {
      if (error) reject(error);
      else resolve(derived);
    });
  });
}

async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = await scryptAsync(validatePassword(password), salt);
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

async function verifyPassword(password, encoded) {
  const [kind, salt, expectedHex] = String(encoded || "").split("$");
  if (kind !== "scrypt" || !salt || !expectedHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = await scryptAsync(String(password || ""), salt);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function enforceOrigin(req) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return;
  if (!APP_ORIGIN) return;
  const origin = String(req.headers.origin || "").replace(/\/+$/, "");
  if (origin !== APP_ORIGIN) {
    const error = new Error("Origine refusée");
    error.status = 403;
    throw error;
  }
}

function cleanFileName(value, fallback = "document") {
  const name = path.basename(String(value || "")).replace(/[\u0000-\u001f<>:"/\\|?*]+/g, "_").trim();
  return (name || fallback).slice(0, 180);
}

function cleanLogicalName(value) {
  const name = cleanFileName(value, "");
  if (!name || name === "." || name === "..") throw Object.assign(new Error("Nom de classement invalide"), { status: 400 });
  return name;
}

function baulAbsolute(relativePath) {
  const resolved = path.resolve(BAUL_ROOT, relativePath);
  if (resolved !== BAUL_ROOT && !resolved.startsWith(`${BAUL_ROOT}${path.sep}`)) {
    throw Object.assign(new Error("Chemin BAÚL invalide"), { status: 400 });
  }
  return resolved;
}

function documentView(row) {
  return {
    id: row.id,
    originalName: row.original_name,
    logicalName: row.logical_name || "",
    mimeType: row.mime_type || "application/octet-stream",
    size: Number(row.size_bytes || 0),
    sha256: row.sha256,
    batchId: row.batch_id || "",
    category: row.category || row.requested_category || "",
    suggestedCategory: row.suggested_category || "verifier",
    status: row.status,
    receivedAt: row.received_at,
    validatedAt: row.validated_at
  };
}

async function baulStatus() {
  const [countsResult, pendingResult] = await Promise.all([
    pool.query(`SELECT COUNT(*)::int AS total,
                       COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='pending')::int AS pending,
                       COUNT(*) FILTER (WHERE deleted_at IS NULL AND status='validated')::int AS validated
                  FROM baul_documents WHERE deleted_at IS NULL`),
    pool.query(`SELECT * FROM baul_documents WHERE deleted_at IS NULL AND status='pending' ORDER BY received_at DESC LIMIT 250`)
  ]);
  const counts = countsResult.rows[0] || { total: 0, pending: 0, validated: 0 };
  return {
    ok: true,
    root: "BAÚL privé du serveur FINCA MARIA",
    counts: { total: Number(counts.total || 0), pending: Number(counts.pending || 0), validated: Number(counts.validated || 0) },
    pending: pendingResult.rows.map(documentView)
  };
}

async function ensureBaulDirectories() {
  await Promise.all([
    fs.mkdir(baulAbsolute("pending"), { recursive: true }),
    fs.mkdir(baulAbsolute("classified"), { recursive: true }),
    fs.mkdir(baulAbsolute("exports"), { recursive: true })
  ]);
}

async function runMigrations() {
  const sqlDir = path.join(__dirname, "../sql");
  const files = (await fs.readdir(sqlDir))
    .filter((name) => /^\d+_.+\.sql$/u.test(name))
    .sort();
  for (const name of files) {
    const sql = await fs.readFile(path.join(sqlDir, name), "utf8");
    await pool.query(sql);
  }
}

async function rolesForUser(userId, client = pool) {
  const result = await client.query(
    "SELECT role_id FROM user_roles WHERE user_id = $1 ORDER BY role_id",
    [userId]
  );
  return result.rows.map((row) => row.role_id);
}

async function ensureBootstrapAdmin() {
  const current = await pool.query(
    `SELECT u.id
       FROM users u
       JOIN user_roles ur ON ur.user_id = u.id
      WHERE u.active = TRUE AND ur.role_id IN ('admin-projet','admin-secretariat')
      LIMIT 1`
  );
  if (current.rowCount) return;

  const email = normalizeEmail(process.env.FINCA_BOOTSTRAP_ADMIN_EMAIL);
  const password = process.env.FINCA_BOOTSTRAP_ADMIN_PASSWORD;
  const name = String(process.env.FINCA_BOOTSTRAP_ADMIN_NAME || "Administrateur FINCA MARIA").trim();
  if (!email || !password) {
    throw new Error("Aucun administrateur actif. Définir FINCA_BOOTSTRAP_ADMIN_EMAIL et FINCA_BOOTSTRAP_ADMIN_PASSWORD pour le premier démarrage.");
  }

  const passwordHash = await hashPassword(password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query(
      `INSERT INTO users (email, display_name, password_hash)
       VALUES ($1,$2,$3)
       ON CONFLICT (email) DO UPDATE SET display_name = EXCLUDED.display_name, password_hash = EXCLUDED.password_hash, active = TRUE, updated_at = NOW()
       RETURNING id, email, display_name`,
      [email, name || "Administrateur FINCA MARIA", passwordHash]
    );
    await client.query(
      `INSERT INTO user_roles (user_id, role_id) VALUES ($1,'admin-projet')
       ON CONFLICT DO NOTHING`,
      [user.rows[0].id]
    );
    await client.query("COMMIT");
    console.log(`Administrateur initial prêt : ${user.rows[0].email}`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getSession(req) {
  const token = cookies(req)[COOKIE_NAME];
  if (!token) return null;
  const hash = tokenHash(token);
  const result = await pool.query(
    `SELECT s.token_hash, s.expires_at, u.id, u.email, u.display_name
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1 AND s.expires_at > NOW() AND u.active = TRUE`,
    [hash]
  );
  if (!result.rowCount) return null;
  const row = result.rows[0];
  const roles = await rolesForUser(row.id);
  pool.query("UPDATE sessions SET last_seen_at = NOW() WHERE token_hash = $1", [hash]).catch(() => {});
  return { tokenHash: hash, id: row.id, email: row.email, name: row.display_name, roles, expiresAt: row.expires_at };
}

async function requireUser(req) {
  const user = await getSession(req);
  if (!user) throw Object.assign(new Error("Authentification requise"), { status: 401 });
  return user;
}

function isAdmin(user) {
  return user.roles.some((role) => ADMIN_ROLES.has(role));
}

async function requireAdmin(req) {
  const user = await requireUser(req);
  if (!isAdmin(user)) throw Object.assign(new Error("Accès administrateur requis"), { status: 403 });
  return user;
}
async function requireAccountAdmin(req) {
  const user = await requireUser(req);
  if (!user.roles.some(role => ACCOUNT_ADMIN_ROLES.has(role))) throw Object.assign(new Error("Administration des utilisateurs interdite"), { status: 403 });
  return user;
}

function isFamilyUser(user) {
  return user.roles.some((role) => FAMILY_ROLES.has(role));
}

async function requireFamilyUser(req) {
  const user = await requireUser(req);
  if (!isFamilyUser(user)) throw Object.assign(new Error("Accès famille requis"), { status: 403 });
  return user;
}

async function audit(user, req, action, objectType, objectId, beforeValue = null, afterValue = null, result = "ok", client = pool) {
  await client.query(
    `INSERT INTO audit_log (actor_id, actor_email, actor_roles, action, object_type, object_id, before_value, after_value, result, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [user?.id || null, user?.email || null, user?.roles || [], action, objectType, objectId || null, beforeValue, afterValue, result, clientIp(req)]
  );
}

const loginAttempts = new Map();
function loginAllowed(req, identifier) {
  const key = `${clientIp(req)}|${identifier}`;
  const now = Date.now();
  const previous = loginAttempts.get(key) || { count: 0, first: now, blockedUntil: 0 };
  if (previous.blockedUntil > now) return { allowed: false, retryAfter: Math.ceil((previous.blockedUntil - now) / 1000) };
  if (now - previous.first > 15 * 60 * 1000) loginAttempts.delete(key);
  return { allowed: true, key };
}
function recordLoginFailure(key) {
  const now = Date.now();
  const entry = loginAttempts.get(key) || { count: 0, first: now, blockedUntil: 0 };
  entry.count += 1;
  if (entry.count >= 8) entry.blockedUntil = now + 15 * 60 * 1000;
  loginAttempts.set(key, entry);
}
function clearLoginFailures(key) {
  loginAttempts.delete(key);
}

function pruneLoginAttempts() {
  const now = Date.now();
  for (const [key, entry] of loginAttempts.entries()) {
    const reference = Math.max(Number(entry.first || 0), Number(entry.blockedUntil || 0));
    if (!reference || now - reference > 30 * 60 * 1000) loginAttempts.delete(key);
  }
}

const maintenanceTimer = setInterval(() => {
  pruneLoginAttempts();
  pool.query("DELETE FROM sessions WHERE expires_at <= NOW()")
    .catch((error) => console.error("Nettoyage des sessions impossible", error));
}, 30 * 60 * 1000);
maintenanceTimer.unref?.();

async function handleLogin(req, res) {
  const body = await readBody(req);
  const identifier = normalizeEmail(body.email || body.name);
  const password = String(body.password || body.code || "");
  const gate = loginAllowed(req, identifier);
  if (!gate.allowed) return json(res, 429, { error: "Trop de tentatives. Réessayer plus tard.", retryAfter: gate.retryAfter });

  const result = await pool.query(
    `SELECT id, email, display_name, password_hash
       FROM users
      WHERE active = TRUE AND (email = $1 OR LOWER(display_name) = LOWER($2))
      LIMIT 1`,
    [identifier, String(body.name || "").trim()]
  );
  const row = result.rows[0];
  const valid = row ? await verifyPassword(password, row.password_hash) : false;
  if (!valid) {
    recordLoginFailure(gate.key);
    await audit(null, req, "login_failed", "session", identifier || "inconnu", null, null, "refused");
    return json(res, 401, { error: "Identifiant ou mot de passe incorrect" });
  }
  clearLoginFailures(gate.key);

  const roles = await rolesForUser(row.id);
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_HOURS * 60 * 60 * 1000);
  await pool.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at, user_agent, ip_address)
     VALUES ($1,$2,$3,$4,$5)`,
    [tokenHash(token), row.id, expiresAt, String(req.headers["user-agent"] || "").slice(0, 500), clientIp(req)]
  );
  const user = { id: row.id, email: row.email, name: row.display_name, roles };
  await audit(user, req, "login", "session", tokenHash(token).slice(0, 16), null, { expiresAt });
  return json(res, 200, { user, name: user.name, expiresAt: expiresAt.getTime() }, {
    "Set-Cookie": sessionCookie(token, SESSION_HOURS * 3600)
  });
}

async function handleLogout(req, res) {
  const user = await getSession(req);
  const token = cookies(req)[COOKIE_NAME];
  if (token) await pool.query("DELETE FROM sessions WHERE token_hash = $1", [tokenHash(token)]);
  if (user) await audit(user, req, "logout", "session", null);
  return noContent(res, 204, { "Set-Cookie": clearSessionCookie() });
}

async function bootstrap(req, res) {
  await requireUser(req);
  const [reservations, rooms, state] = await Promise.all([
    pool.query("SELECT id, name, place, arrival::text, departure::text, note FROM reservations WHERE deleted_at IS NULL ORDER BY arrival, place"),
    pool.query("SELECT room, ready, updated_at FROM room_ready ORDER BY room"),
    pool.query("SELECT key, value, version, updated_at FROM shared_state WHERE key = ANY($1::text[]) ORDER BY key", [[...SHARED_KEYS]])
  ]);
  const roomReady = Object.fromEntries(rooms.rows.map((row) => [row.room, row.ready]));
  const sharedState = Object.fromEntries(state.rows.map((row) => [row.key, { value: row.value, version: Number(row.version), updatedAt: row.updated_at }]));
  return json(res, 200, { reservations: reservations.rows, roomReady, sharedState });
}

async function familyBootstrap(req, res) {
  await requireFamilyUser(req);
  const [reservations, rooms, state] = await Promise.all([
    pool.query("SELECT id, name, place, arrival::text, departure::text, note FROM reservations WHERE deleted_at IS NULL ORDER BY arrival, place"),
    pool.query("SELECT room, ready, updated_at FROM room_ready ORDER BY room"),
    pool.query("SELECT key, value, version, updated_at FROM shared_state WHERE key = ANY($1::text[]) ORDER BY key", [[...FAMILY_SHARED_KEYS]])
  ]);
  const roomReady = Object.fromEntries(rooms.rows.map((row) => [row.room, Boolean(row.ready)]));
  const sharedState = Object.fromEntries(state.rows.map((row) => [
    row.key,
    { value: row.value, version: Number(row.version), updatedAt: row.updated_at }
  ]));
  return json(res, 200, { reservations: reservations.rows, roomReady, sharedState });
}

async function saveReservation(req, res) {
  const user = await requireUser(req);
  const body = await readBody(req);
  const id = String(body.id || "").trim();
  const name = String(body.name || "").trim();
  const place = String(body.place || "").trim();
  const arrival = String(body.arrival || "").trim();
  const departure = String(body.departure || "").trim();
  const note = String(body.note || "").trim().slice(0, 1000) || null;
  if (!id || !name || !place || !/^\d{4}-\d{2}-\d{2}$/.test(arrival) || !/^\d{4}-\d{2}-\d{2}$/.test(departure) || departure <= arrival) {
    return json(res, 400, { error: "Réservation invalide" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const conflict = await client.query(
      `SELECT id, name, arrival::text, departure::text
         FROM reservations
        WHERE deleted_at IS NULL AND place = $1 AND id <> $2 AND arrival < $4::date AND departure > $3::date
        LIMIT 1
        FOR UPDATE`,
      [place, id, arrival, departure]
    );
    if (conflict.rowCount) {
      await client.query("ROLLBACK");
      return json(res, 409, { error: "Cette chambre est déjà réservée sur une partie de cette période", conflict: conflict.rows[0] });
    }
    const before = await client.query("SELECT * FROM reservations WHERE id = $1", [id]);
    if (before.rowCount && before.rows[0].deleted_at) {
      await client.query("ROLLBACK");
      return json(res, 409, { error: "Élément dans la corbeille" });
    }
    const saved = await client.query(
      `INSERT INTO reservations (id, name, place, arrival, departure, note, updated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, place=EXCLUDED.place, arrival=EXCLUDED.arrival, departure=EXCLUDED.departure, note=EXCLUDED.note, updated_at=NOW(), updated_by=EXCLUDED.updated_by
       RETURNING id, name, place, arrival::text, departure::text, note`,
      [id, name.slice(0, 160), place.slice(0, 160), arrival, departure, note, user.id]
    );
    await audit(user, req, before.rowCount ? "reservation_update" : "reservation_create", "reservation", id, before.rows[0] || null, saved.rows[0], "ok", client);
    await client.query("COMMIT");
    return json(res, 200, saved.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function deleteReservation(req, res, id) {
  const user = await requireAdmin(req);
  // Compatibilité avec l'ancienne interface : ne détruit plus jamais une réservation.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query("SELECT * FROM reservations WHERE id=$1 AND deleted_at IS NULL FOR UPDATE", [id]);
    if (!before.rowCount) { await client.query("ROLLBACK"); return json(res,404,{error:"Réservation active introuvable"}); }
    const result = await client.query("UPDATE reservations SET deleted_at=NOW(),deleted_by=$2 WHERE id=$1 RETURNING *", [id,user.id]);
    await audit(user,req,"reservation_soft_delete","reservation",id,before.rows[0],result.rows[0],"ok",client);
    await client.query("COMMIT");
    return noContent(res);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}

async function saveRoomReady(req, res, room) {
  const user = await requireUser(req);
  const body = await readBody(req);
  const before = await pool.query("SELECT * FROM room_ready WHERE room = $1", [room]);
  const saved = await pool.query(
    `INSERT INTO room_ready (room, ready, updated_by) VALUES ($1,$2,$3)
     ON CONFLICT (room) DO UPDATE SET ready=EXCLUDED.ready, updated_at=NOW(), updated_by=EXCLUDED.updated_by
     RETURNING room, ready, updated_at`,
    [room.slice(0, 160), Boolean(body.ready), user.id]
  );
  await audit(user, req, "room_ready_update", "room_ready", room, before.rows[0] || null, saved.rows[0]);
  return json(res, 200, saved.rows[0]);
}

async function saveState(req, res, key) {
  const user = await requireUser(req);
  if (!SHARED_KEYS.has(key)) return json(res, 400, { error: "Clé d'état non autorisée" });
  const body = await readBody(req);
  if (!("value" in body)) return json(res, 400, { error: "Valeur manquante" });
  const expectedVersion = body.expectedVersion === undefined ? null : Number(body.expectedVersion);
  if (expectedVersion !== null && (!Number.isInteger(expectedVersion) || expectedVersion < 0)) {
    return json(res, 400, { error: "Version attendue invalide" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const before = await client.query("SELECT key, value, version FROM shared_state WHERE key = $1 FOR UPDATE", [key]);
    const current = before.rows[0] || null;
    const currentVersion = current ? Number(current.version) : 0;
    if (expectedVersion !== null && expectedVersion !== currentVersion) {
      await client.query("ROLLBACK");
      return json(res, 409, {
        error: "Ces données ont été modifiées depuis la dernière synchronisation",
        conflict: { key, version: currentVersion, value: current?.value ?? null }
      });
    }

    const saved = current
      ? await client.query(
          `UPDATE shared_state
              SET value=$2::jsonb, version=version+1, updated_at=NOW(), updated_by=$3
            WHERE key=$1
            RETURNING key, value, version, updated_at`,
          [key, JSON.stringify(body.value), user.id]
        )
      : await client.query(
          `INSERT INTO shared_state (key, value, updated_by)
           VALUES ($1,$2::jsonb,$3)
           RETURNING key, value, version, updated_at`,
          [key, JSON.stringify(body.value), user.id]
        );
    await audit(user, req, "state_update", "shared_state", key, current, saved.rows[0], "ok", client);
    await client.query("COMMIT");
    return json(res, 200, saved.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleBaulStatus(req, res) {
  await requireAdmin(req);
  return json(res, 200, await baulStatus());
}

async function handleBaulCheck(req, res) {
  await requireAdmin(req);
  const body = await readBody(req);
  const hashes = [...new Set((Array.isArray(body.files) ? body.files : [])
    .map((item) => String(item?.sha256 || "").toLowerCase())
    .filter((hash) => /^[a-f0-9]{64}$/.test(hash)))];
  if (!hashes.length) return json(res, 200, { ok: true, duplicates: [] });
  const result = await pool.query("SELECT * FROM baul_documents WHERE sha256 = ANY($1::text[])", [hashes]);
  return json(res, 200, {
    ok: true,
    duplicates: result.rows.map((row) => ({ sha256: row.sha256, existing: documentView(row) }))
  });
}

async function handleBaulUpload(req, res) {
  const user = await requireAdmin(req);
  const body = await readBody(req, MAX_BAUL_BODY);
  const originalName = cleanFileName(body.name, "document");
  const mimeType = String(body.type || "application/octet-stream").slice(0, 200);
  const requestedSize = Number(body.size || 0);
  const requestedHash = String(body.sha256 || "").toLowerCase();
  const requestedCategory = String(body.category || "auto");
  const batchId = String(body.batchId || "").slice(0, 160);
  if (!Number.isFinite(requestedSize) || requestedSize < 0 || requestedSize > MAX_BAUL_FILE) return json(res, 413, { ok: false, error: "Fichier trop volumineux" });
  if (!/^[a-f0-9]{64}$/.test(requestedHash)) return json(res, 400, { ok: false, error: "Empreinte SHA-256 invalide" });
  if (requestedCategory !== "auto" && !BAUL_CATEGORIES.has(requestedCategory)) return json(res, 400, { ok: false, error: "Catégorie BAÚL invalide" });

  const existing = await pool.query("SELECT * FROM baul_documents WHERE sha256=$1", [requestedHash]);
  if (existing.rowCount) return json(res, 200, { ok: true, duplicate: true, existing: documentView(existing.rows[0]) });

  const contentBase64 = String(body.contentBase64 || "");
  let buffer;
  try {
    buffer = Buffer.from(contentBase64, "base64");
  } catch {
    return json(res, 400, { ok: false, error: "Contenu du fichier invalide" });
  }
  if (buffer.length > MAX_BAUL_FILE || (requestedSize && buffer.length !== requestedSize)) return json(res, 400, { ok: false, error: "Taille du fichier incohérente" });
  const actualHash = crypto.createHash("sha256").update(buffer).digest("hex");
  if (actualHash !== requestedHash) return json(res, 400, { ok: false, error: "Empreinte du fichier incohérente" });

  const id = crypto.randomUUID();
  const relativePath = path.join("pending", `${id}__${originalName}`);
  const absolutePath = baulAbsolute(relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, buffer, { flag: "wx" });

  const suggestedCategory = requestedCategory === "auto" ? "verifier" : requestedCategory;
  try {
    const inserted = await pool.query(
      `INSERT INTO baul_documents
       (id, original_name, mime_type, size_bytes, sha256, batch_id, requested_category, suggested_category, storage_path, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [id, originalName, mimeType, buffer.length, actualHash, batchId || null, requestedCategory, suggestedCategory, relativePath, user.id]
    );
    await audit(user, req, "baul_upload", "baul_document", id, null, { originalName, sha256: actualHash, size: buffer.length });
    return json(res, 201, { ok: true, duplicate: false, document: documentView(inserted.rows[0]) });
  } catch (error) {
    await fs.unlink(absolutePath).catch(() => {});
    if (error.code === "23505") {
      const duplicate = await pool.query("SELECT * FROM baul_documents WHERE sha256=$1", [actualHash]);
      return json(res, 200, { ok: true, duplicate: true, existing: duplicate.rowCount ? documentView(duplicate.rows[0]) : null });
    }
    throw error;
  }
}

async function handleBaulConfirm(req, res) {
  const user = await requireAdmin(req);
  const body = await readBody(req);
  const id = String(body.id || "");
  const category = String(body.category || "");
  const logicalName = cleanLogicalName(body.logicalName);
  if (!BAUL_CATEGORIES.has(category)) return json(res, 400, { ok: false, error: "Catégorie BAÚL invalide" });

  const current = await pool.query("SELECT * FROM baul_documents WHERE id=$1", [id]);
  if (!current.rowCount) return json(res, 404, { ok: false, error: "Document BAÚL introuvable" });
  const before = current.rows[0];
  if (before.deleted_at) return json(res, 409, { ok: false, error: "Document en corbeille" });
  if (before.status === "validated") return json(res, 200, { ok: true, document: documentView(before), status: await baulStatus() });

  const source = baulAbsolute(before.storage_path);
  const destinationRelative = path.join("classified", category, `${id.slice(0, 8)}__${logicalName}`);
  const destination = baulAbsolute(destinationRelative);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.rename(source, destination);

  try {
    const updated = await pool.query(
      `UPDATE baul_documents
          SET logical_name=$1, category=$2, status='validated', storage_path=$3, validated_at=NOW(), validated_by=$4
        WHERE id=$5 RETURNING *`,
      [logicalName, category, destinationRelative, user.id, id]
    );
    await audit(user, req, "baul_validate", "baul_document", id, documentView(before), documentView(updated.rows[0]));
    return json(res, 200, { ok: true, document: documentView(updated.rows[0]), status: await baulStatus() });
  } catch (error) {
    await fs.rename(destination, source).catch(() => {});
    throw error;
  }
}

async function handleBaulPreview(req, res, url) {
  await requireFamilyUser(req);
  const id = String(url.searchParams.get("id") || "");
  const result = await pool.query("SELECT * FROM baul_documents WHERE id=$1", [id]);
  if (!result.rowCount) return json(res, 404, { error: "Document BAÚL introuvable" });
  const row = result.rows[0];
  if (row.deleted_at) return json(res, 404, { error: "Document en corbeille" });
  const absolutePath = baulAbsolute(row.storage_path);
  let stat;
  try { stat = await fs.stat(absolutePath); } catch { return json(res, 404, { error: "Fichier BAÚL introuvable" }); }
  res.writeHead(200, {
    "Content-Type": row.mime_type || "application/octet-stream",
    "Content-Length": stat.size,
    "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(row.logical_name || row.original_name)}`,
    "Cache-Control": "private, no-store",
    "X-Content-Type-Options": "nosniff"
  });
  fsSync.createReadStream(absolutePath).pipe(res);
}

async function handleBaulOpen(req, res) {
  await requireAdmin(req);
  return json(res, 409, { ok: false, error: "Sur le serveur, le BAÚL reste privé et se consulte depuis FINCA MARIA ; aucun dossier système n’est ouvert à distance." });
}

async function handleBaulExport(req, res) {
  const user = await requireAdmin(req);
  const result = await pool.query("SELECT * FROM baul_documents ORDER BY received_at");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const relativePath = path.join("exports", `baul-index-${stamp}.json`);
  const payload = {
    generatedAt: new Date().toISOString(),
    documents: result.rows.map(documentView)
  };
  await fs.writeFile(baulAbsolute(relativePath), JSON.stringify(payload, null, 2), "utf8");
  await audit(user, req, "baul_export_index", "baul", "index", null, { path: relativePath, count: result.rowCount });
  return json(res, 200, { ok: true, path: `BAÚL serveur/${relativePath}`, count: result.rowCount });
}

async function listUsers(req, res) {
  await requireAccountAdmin(req);
  const result = await pool.query(
    `SELECT u.id, u.email, u.display_name, u.active, u.created_at, u.updated_at,
            COALESCE(array_agg(ur.role_id ORDER BY ur.role_id) FILTER (WHERE ur.role_id IS NOT NULL), '{}') AS roles
       FROM users u
       LEFT JOIN user_roles ur ON ur.user_id = u.id
      GROUP BY u.id
      ORDER BY u.display_name, u.email`
  );
  return json(res, 200, { users: result.rows });
}

async function createUser(req, res) {
  const actor = await requireAccountAdmin(req);
  const body = await readBody(req);
  const email = normalizeEmail(body.email);
  const name = String(body.name || body.displayName || "").trim();
  const roles = Array.isArray(body.roles) ? [...new Set(body.roles.map(String))] : [];
  if (!email.includes("@") || !name) return json(res, 400, { error: "Nom et email valides requis" });
  const roleRows = await pool.query("SELECT id FROM roles WHERE id = ANY($1::text[])", [roles]);
  if (roleRows.rowCount !== roles.length) return json(res, 400, { error: "Un ou plusieurs rôles sont invalides" });
  const passwordHash = await hashPassword(body.password);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const user = await client.query(
      `INSERT INTO users (email, display_name, password_hash) VALUES ($1,$2,$3)
       RETURNING id, email, display_name, active, created_at`,
      [email, name.slice(0, 160), passwordHash]
    );
    for (const role of roles) await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)", [user.rows[0].id, role]);
    await audit(actor, req, "user_create", "user", String(user.rows[0].id), null, { ...user.rows[0], roles }, "ok", client);
    await client.query("COMMIT");
    return json(res, 201, { user: { ...user.rows[0], roles } });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return json(res, 409, { error: "Cette adresse email existe déjà" });
    throw error;
  } finally {
    client.release();
  }
}

async function updateUser(req, res, userId) {
  const actor = await requireAccountAdmin(req);
  const body = await readBody(req);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const beforeResult = await client.query("SELECT id, email, display_name, active FROM users WHERE id = $1 FOR UPDATE", [userId]);
    if (!beforeResult.rowCount) {
      await client.query("ROLLBACK");
      return json(res, 404, { error: "Compte introuvable" });
    }
    const before = beforeResult.rows[0];
    const beforeRoles = await rolesForUser(userId, client);
    const email = body.email === undefined ? before.email : normalizeEmail(body.email);
    const name = body.name === undefined && body.displayName === undefined ? before.display_name : String(body.name || body.displayName || "").trim();
    const active = body.active === undefined ? before.active : Boolean(body.active);
    await client.query("UPDATE users SET email=$1, display_name=$2, active=$3, updated_at=NOW() WHERE id=$4", [email, name, active, userId]);

    let roles = beforeRoles;
    if (Array.isArray(body.roles)) {
      roles = [...new Set(body.roles.map(String))];
      const roleRows = await client.query("SELECT id FROM roles WHERE id = ANY($1::text[])", [roles]);
      if (roleRows.rowCount !== roles.length) throw Object.assign(new Error("Un ou plusieurs rôles sont invalides"), { status: 400 });
      if (Number(userId) === Number(actor.id) && !roles.some((role) => ADMIN_ROLES.has(role))) {
        throw Object.assign(new Error("Un administrateur ne peut pas retirer son propre dernier rôle administrateur"), { status: 400 });
      }
      await client.query("DELETE FROM user_roles WHERE user_id=$1", [userId]);
      for (const role of roles) await client.query("INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2)", [userId, role]);
    }
    if (body.password) {
      const passwordHash = await hashPassword(body.password);
      await client.query("UPDATE users SET password_hash=$1, updated_at=NOW() WHERE id=$2", [passwordHash, userId]);
      await client.query("DELETE FROM sessions WHERE user_id=$1 AND token_hash <> $2", [userId, actor.tokenHash]);
    }
    if (!active) await client.query("DELETE FROM sessions WHERE user_id=$1", [userId]);
    const afterResult = await client.query("SELECT id, email, display_name, active, updated_at FROM users WHERE id=$1", [userId]);
    const after = { ...afterResult.rows[0], roles };
    await audit(actor, req, "user_update", "user", String(userId), { ...before, roles: beforeRoles }, after, "ok", client);
    await client.query("COMMIT");
    return json(res, 200, { user: after });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return json(res, 409, { error: "Cette adresse email existe déjà" });
    throw error;
  } finally {
    client.release();
  }
}

async function listAudit(req, res, url) {
  await requireAdmin(req);
  const requestedLimit = Number(url.searchParams.get("limit") || 100);
  const limit = Number.isFinite(requestedLimit) ? Math.min(200, Math.max(10, Math.trunc(requestedLimit))) : 100;
  const result = await pool.query(
    `SELECT id, actor_id, actor_email, actor_roles, action, object_type, object_id, result, created_at
       FROM audit_log ORDER BY id DESC LIMIT $1`,
    [limit]
  );
  return json(res, 200, { events: result.rows });
}

const trashRoute = createTrashRouter({ pool, requireAdmin, requireFamilyUser, audit, readBody, json, baulRoot: BAUL_ROOT });

const meetingRoute = createMeetingRouter({
  pool,
  requireAdmin,
  requireFamilyUser,
  audit,
  readBody,
  json,
  baulRoot: BAUL_ROOT
});

async function route(req, res) {
  const url = new URL(req.url, "http://localhost");
  if (url.pathname === "/healthz" || url.pathname === "/api/healthz") return json(res, 200, { ok: true });
  if (req.method === "OPTIONS") return noContent(res, 204);
  enforceOrigin(req);

  if (url.pathname === "/api/auth/login" && req.method === "POST") return handleLogin(req, res);
  if (url.pathname === "/api/auth/logout" && req.method === "POST") return handleLogout(req, res);
  if (url.pathname === "/api/auth/me" && req.method === "GET") {
    const user = await requireUser(req);
    return json(res, 200, { user: { id: user.id, email: user.email, name: user.name, roles: user.roles }, expiresAt: new Date(user.expiresAt).getTime() });
  }
  if (url.pathname === "/api/auth/check" && req.method === "GET") {
    await requireUser(req);
    return noContent(res);
  }
  if (url.pathname === "/api/auth/check-admin" && req.method === "GET") {
    await requireAdmin(req);
    return noContent(res);
  }
  if (url.pathname === "/api/auth/check-family" && req.method === "GET") {
    await requireFamilyUser(req);
    return noContent(res);
  }

  if (url.pathname === "/api/family/bootstrap" && req.method === "GET") return familyBootstrap(req, res);
  if (url.pathname === "/api/bootstrap" && req.method === "GET") return bootstrap(req, res);
  if (url.pathname === "/api/reservations" && req.method === "POST") return saveReservation(req, res);
  const reservationMatch = url.pathname.match(/^\/api\/reservations\/([^/]+)$/);
  if (reservationMatch && req.method === "DELETE") return deleteReservation(req, res, decodeURIComponent(reservationMatch[1]));
  const roomMatch = url.pathname.match(/^\/api\/room-ready\/([^/]+)$/);
  if (roomMatch && req.method === "PUT") return saveRoomReady(req, res, decodeURIComponent(roomMatch[1]));
  const stateMatch = url.pathname.match(/^\/api\/state\/([^/]+)$/);
  if (stateMatch && req.method === "PUT") return saveState(req, res, decodeURIComponent(stateMatch[1]));

  if (url.pathname === "/api/baul/status" && req.method === "GET") return handleBaulStatus(req, res);
  if (url.pathname === "/api/baul/check" && req.method === "POST") return handleBaulCheck(req, res);
  if (url.pathname === "/api/baul/upload" && req.method === "POST") return handleBaulUpload(req, res);
  if (url.pathname === "/api/baul/confirm" && req.method === "POST") return handleBaulConfirm(req, res);
  if (url.pathname === "/api/baul/preview" && req.method === "GET") return handleBaulPreview(req, res, url);
  if (url.pathname === "/api/baul/open" && req.method === "POST") return handleBaulOpen(req, res);
  if (url.pathname === "/api/baul/export" && req.method === "POST") return handleBaulExport(req, res);

  if (url.pathname === "/api/admin/users" && req.method === "GET") return listUsers(req, res);
  if (url.pathname === "/api/admin/users" && req.method === "POST") return createUser(req, res);
  const userMatch = url.pathname.match(/^\/api\/admin\/users\/(\d+)$/);
  if (userMatch && req.method === "PUT") return updateUser(req, res, Number(userMatch[1]));
  if (url.pathname === "/api/admin/audit" && req.method === "GET") return listAudit(req, res, url);

  if (await trashRoute(req, res, url)) return;
  if (await meetingRoute(req, res, url)) return;

  return json(res, 404, { error: "Route inconnue" });
}

const server = http.createServer(async (req, res) => {
  try {
    await route(req, res);
  } catch (error) {
    const status = Number(error.status || 500);
    if (status >= 500) console.error(error);
    json(res, status, { error: status >= 500 ? "Erreur interne" : error.message });
  }
});

async function start() {
  await runMigrations();
  await ensureBaulDirectories();
  await meetingRoute.ensureRoot();
  await pool.query("DELETE FROM sessions WHERE expires_at <= NOW()");
  await ensureBootstrapAdmin();
  server.listen(PORT, "0.0.0.0", () => console.log(`FINCA MARIA API prête sur :${PORT}`));
}

start().catch((error) => {
  console.error("Démarrage impossible", error);
  process.exit(1);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`Arrêt FINCA MARIA demandé (${signal})`);
  clearInterval(maintenanceTimer);
  const forceTimer = setTimeout(() => server.closeAllConnections?.(), 10_000);
  forceTimer.unref?.();
  await new Promise((resolve) => server.close(resolve));
  clearTimeout(forceTimer);
  await pool.end().catch(() => {});
  process.exit(0);
}

for (const signal of ["SIGTERM", "SIGINT"]) {
  process.on(signal, () => shutdown(signal));
}
