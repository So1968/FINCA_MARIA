import http from 'node:http';
import { createHash, createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { Pool } from 'pg';

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || '';
const FAMILY_CODE = process.env.FINCA_FAMILY_CODE || '';
const SESSION_SECRET = process.env.FINCA_SESSION_SECRET || '';
const SESSION_DAYS = Number(process.env.FINCA_SESSION_DAYS || 30);
const ALLOWED_ORIGINS = new Set(
  (process.env.FINCA_ALLOWED_ORIGINS || 'http://127.0.0.1:5173,http://localhost:5173')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);

const ROOMS = new Set([
  'La Hera',
  'La Golondrina',
  'La Matrimoniala',
  'Las Alemanitas / Alemanitos',
  'La Cueva'
]);

const SHARED_STATE_KEYS = new Set([
  'finca_maria_maison_notes_v1',
  'finca_maria_jardin_suivi_v1',
  'finca_maria_lieux_vacanciers_v1',
  'finca_maria_sejour_checklist_v1',
  'finca_maria_entretien_maison_v1',
  'finca_maria_couchages_plan_v1'
]);

if (!DATABASE_URL) throw new Error('DATABASE_URL est obligatoire');
if (!FAMILY_CODE) throw new Error('FINCA_FAMILY_CODE est obligatoire');
if (SESSION_SECRET.length < 32) throw new Error('FINCA_SESSION_SECRET doit contenir au moins 32 caractères');

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.PGPOOL_MAX || 10)
});

const loginAttempts = new Map();

function json(res, status, payload, origin = '') {
  setCors(res, origin);
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

function setCors(res, origin) {
  if (origin && (ALLOWED_ORIGINS.has(origin) || ALLOWED_ORIGINS.has('*'))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
}

function sha256(value) {
  return createHash('sha256').update(String(value)).digest();
}

function sameSecret(a, b) {
  const left = sha256(a);
  const right = sha256(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

function base64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signToken(payload) {
  const body = base64urlJson(payload);
  const signature = createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  return `${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || !token.includes('.')) return null;
  const [body, signature] = token.split('.');
  const expected = createHmac('sha256', SESSION_SECRET).update(body).digest('base64url');
  const sigBuffer = Buffer.from(signature || '');
  const expBuffer = Buffer.from(expected);
  if (sigBuffer.length !== expBuffer.length || !timingSafeEqual(sigBuffer, expBuffer)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!payload?.name || !payload?.exp || Date.now() >= payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

function getBearer(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : '';
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

function loginAllowed(ip) {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  const current = loginAttempts.get(ip) || [];
  const recent = current.filter((timestamp) => now - timestamp < windowMs);
  if (recent.length >= 10) {
    loginAttempts.set(ip, recent);
    return false;
  }
  recent.push(now);
  loginAttempts.set(ip, recent);
  return true;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 1024 * 1024) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw new Error('INVALID_JSON');
  }
}

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));
}

function reservationRow(row) {
  return {
    id: row.id,
    name: row.name,
    arrival: row.arrival,
    departure: row.departure,
    place: row.room,
    note: row.note || '',
    updatedAt: row.updated_at,
    updatedBy: row.updated_by
  };
}

async function initDb() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS finca_reservations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      room TEXT NOT NULL,
      arrival DATE NOT NULL,
      departure DATE NOT NULL,
      note TEXT NOT NULL DEFAULT '',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS finca_reservations_room_dates_idx
      ON finca_reservations (room, arrival, departure);

    CREATE TABLE IF NOT EXISTS finca_room_ready (
      room TEXT PRIMARY KEY,
      ready BOOLEAN NOT NULL DEFAULT FALSE,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS finca_shared_state (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      revision BIGINT NOT NULL DEFAULT 1,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_by TEXT NOT NULL
    );
  `);
}

async function waitForDatabase() {
  let lastError;
  for (let attempt = 1; attempt <= 20; attempt += 1) {
    try {
      await pool.query('SELECT 1');
      await initDb();
      return;
    } catch (error) {
      lastError = error;
      console.error(`Base indisponible (tentative ${attempt}/20):`, error.message);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
  throw lastError;
}

async function getBootstrap(user) {
  const [reservationsResult, readyResult, stateResult] = await Promise.all([
    pool.query('SELECT id, name, room, arrival::text, departure::text, note, updated_at, updated_by FROM finca_reservations ORDER BY arrival, room, name'),
    pool.query('SELECT room, ready, updated_at, updated_by FROM finca_room_ready ORDER BY room'),
    pool.query('SELECT key, value, revision, updated_at, updated_by FROM finca_shared_state ORDER BY key')
  ]);

  const roomReady = {};
  for (const row of readyResult.rows) roomReady[row.room] = Boolean(row.ready);

  const sharedState = {};
  for (const row of stateResult.rows) {
    sharedState[row.key] = {
      value: row.value,
      revision: Number(row.revision),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    };
  }

  return {
    user: user.name,
    serverTime: new Date().toISOString(),
    reservations: reservationsResult.rows.map(reservationRow),
    roomReady,
    sharedState
  };
}

async function upsertReservation(body, user) {
  const id = String(body.id || `presence-${randomUUID()}`).trim();
  const name = String(body.name || '').trim().slice(0, 80);
  const room = String(body.place || body.room || '').trim();
  const arrival = String(body.arrival || '');
  const departure = String(body.departure || '');
  const note = String(body.note || '').trim().slice(0, 500);

  if (!id || !name || !ROOMS.has(room) || !isIsoDate(arrival) || !isIsoDate(departure) || arrival >= departure) {
    const error = new Error('INVALID_RESERVATION');
    error.status = 400;
    throw error;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [room]);
    const conflict = await client.query(
      `SELECT id, name, room, arrival::text, departure::text
       FROM finca_reservations
       WHERE room = $1 AND id <> $2 AND arrival < $4::date AND departure > $3::date
       LIMIT 1`,
      [room, id, arrival, departure]
    );
    if (conflict.rows.length) {
      await client.query('ROLLBACK');
      const error = new Error('ROOM_CONFLICT');
      error.status = 409;
      error.conflict = conflict.rows[0];
      throw error;
    }

    const result = await client.query(
      `INSERT INTO finca_reservations (id, name, room, arrival, departure, note, updated_by)
       VALUES ($1, $2, $3, $4::date, $5::date, $6, $7)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         room = EXCLUDED.room,
         arrival = EXCLUDED.arrival,
         departure = EXCLUDED.departure,
         note = EXCLUDED.note,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by
       RETURNING id, name, room, arrival::text, departure::text, note, updated_at, updated_by`,
      [id, name, room, arrival, departure, note, user.name]
    );
    await client.query('COMMIT');
    return reservationRow(result.rows[0]);
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally {
    client.release();
  }
}

async function route(req, res) {
  const origin = String(req.headers.origin || '');
  if (req.method === 'OPTIONS') {
    setCors(res, origin);
    res.statusCode = 204;
    res.end();
    return;
  }

  const url = new URL(req.url || '/', 'http://localhost');

  if (req.method === 'GET' && url.pathname === '/health') {
    try {
      await pool.query('SELECT 1');
      json(res, 200, { ok: true, service: 'finca-maria-api' }, origin);
    } catch {
      json(res, 503, { ok: false }, origin);
    }
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/auth/login') {
    if (!loginAllowed(clientIp(req))) {
      json(res, 429, { error: 'Trop de tentatives. Réessayer plus tard.' }, origin);
      return;
    }
    const body = await readBody(req);
    const name = String(body.name || '').trim().slice(0, 80);
    const code = String(body.code || '');
    if (!name || !sameSecret(code, FAMILY_CODE)) {
      json(res, 401, { error: 'Prénom ou code familial incorrect.' }, origin);
      return;
    }
    const expiresAt = Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000;
    const token = signToken({ name, exp: expiresAt });
    json(res, 200, { token, name, expiresAt }, origin);
    return;
  }

  const user = verifyToken(getBearer(req));
  if (!user) {
    json(res, 401, { error: 'Connexion familiale requise.' }, origin);
    return;
  }

  if (req.method === 'GET' && url.pathname === '/api/bootstrap') {
    json(res, 200, await getBootstrap(user), origin);
    return;
  }

  if (req.method === 'POST' && url.pathname === '/api/reservations') {
    try {
      const saved = await upsertReservation(await readBody(req), user);
      json(res, 200, { reservation: saved }, origin);
    } catch (error) {
      if (error.status === 409) {
        json(res, 409, { error: 'Cette chambre est déjà réservée sur une partie de cette période.', conflict: error.conflict }, origin);
      } else if (error.status === 400) {
        json(res, 400, { error: 'Réservation invalide.' }, origin);
      } else {
        throw error;
      }
    }
    return;
  }

  if (req.method === 'DELETE' && url.pathname.startsWith('/api/reservations/')) {
    const id = decodeURIComponent(url.pathname.slice('/api/reservations/'.length));
    await pool.query('DELETE FROM finca_reservations WHERE id = $1', [id]);
    json(res, 200, { ok: true }, origin);
    return;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/room-ready/')) {
    const room = decodeURIComponent(url.pathname.slice('/api/room-ready/'.length));
    if (!ROOMS.has(room)) {
      json(res, 400, { error: 'Chambre inconnue.' }, origin);
      return;
    }
    const body = await readBody(req);
    const ready = Boolean(body.ready);
    await pool.query(
      `INSERT INTO finca_room_ready (room, ready, updated_by)
       VALUES ($1, $2, $3)
       ON CONFLICT (room) DO UPDATE SET ready = EXCLUDED.ready, updated_at = NOW(), updated_by = EXCLUDED.updated_by`,
      [room, ready, user.name]
    );
    json(res, 200, { room, ready }, origin);
    return;
  }

  if (req.method === 'PUT' && url.pathname.startsWith('/api/state/')) {
    const key = decodeURIComponent(url.pathname.slice('/api/state/'.length));
    if (!SHARED_STATE_KEYS.has(key)) {
      json(res, 400, { error: 'Cette donnée ne fait pas partie de la synchronisation familiale.' }, origin);
      return;
    }
    const body = await readBody(req);
    const result = await pool.query(
      `INSERT INTO finca_shared_state (key, value, updated_by)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO UPDATE SET
         value = EXCLUDED.value,
         revision = finca_shared_state.revision + 1,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by
       RETURNING key, value, revision, updated_at, updated_by`,
      [key, JSON.stringify(body.value ?? null), user.name]
    );
    const row = result.rows[0];
    json(res, 200, {
      key: row.key,
      value: row.value,
      revision: Number(row.revision),
      updatedAt: row.updated_at,
      updatedBy: row.updated_by
    }, origin);
    return;
  }

  json(res, 404, { error: 'Route inconnue.' }, origin);
}

await waitForDatabase();

const server = http.createServer((req, res) => {
  route(req, res).catch((error) => {
    console.error(error);
    const origin = String(req.headers.origin || '');
    if (error.message === 'BODY_TOO_LARGE') json(res, 413, { error: 'Données trop volumineuses.' }, origin);
    else if (error.message === 'INVALID_JSON') json(res, 400, { error: 'JSON invalide.' }, origin);
    else json(res, 500, { error: 'Erreur interne.' }, origin);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`FINCA MARIA API écoute sur le port ${PORT}`);
});

async function shutdown() {
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
