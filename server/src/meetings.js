import crypto from "node:crypto";
import fsSync from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { decisionRegisterQuery } from "./decision-register-query.js";
import { createArchiveRouter } from "./archive-router.js";
import { meetingListQuery } from "./meeting-list.js";
import {
  CLASSIFICATIONS,
  MARKER_TYPES,
  MEETING_STAGES,
  applySpeakerOverrides,
  buildConfirmedAction,
  buildSpeakerTurns,
  cleanSpeakerMapping,
  defaultClassification,
  finalizeTurns
} from "./meeting-domain.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TRANSCRIPTION_DIR = path.resolve(__dirname, "../transcription");
const TRANSCRIBE_SCRIPT = path.join(TRANSCRIPTION_DIR, "local_transcribe.py");
const DIARIZE_SCRIPT = path.join(TRANSCRIPTION_DIR, "local_diarize.py");
const PYTHON_BIN = process.env.FINCA_PYTHON_BIN || "python3";
const LOCAL_MODEL = process.env.FINCA_WHISPER_MODEL || "large-v3-turbo";
const DIARIZATION_MODEL = "pyannote/speaker-diarization-community-1";
const MAX_AUDIO_CHUNK = 12 * 1024 * 1024;
const MAX_AUDIO_IMPORT = 250 * 1024 * 1024;
const ACTIONS_KEY = "cortijo_custom_missions_v1";
const MEETING_ID_RE = /^[A-Za-z0-9_-]{8,80}$/;

function safeText(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function safeDate(value, fallback = "") {
  const source = value || fallback;
  const date = source instanceof Date
    ? source.toISOString().slice(0, 10)
    : String(source || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : "";
}

function safeMeetingId(value) {
  const id = String(value || "").trim();
  if (!MEETING_ID_RE.test(id)) throw Object.assign(new Error("Identifiant de réunion invalide"), { status: 400 });
  return id;
}

function mimeExtension(mime) {
  const value = String(mime || "").toLowerCase();
  if (value.includes("webm")) return ".webm";
  if (value.includes("ogg")) return ".ogg";
  if (value.includes("wav")) return ".wav";
  if (value.includes("mpeg") || value.includes("mp3")) return ".mp3";
  if (value.includes("mp4") || value.includes("m4a")) return ".m4a";
  return ".audio";
}

async function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  await new Promise((resolve, reject) => {
    const stream = fsSync.createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolve);
  });
  return hash.digest("hex");
}

async function readRaw(req, maxBytes) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw Object.assign(new Error("Bloc audio trop volumineux"), { status: 413 });
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function writeRequest(req, filePath, maxBytes) {
  const handle = await fs.open(filePath, "wx");
  let size = 0;
  try {
    for await (const chunk of req) {
      size += chunk.length;
      if (size > maxBytes) throw Object.assign(new Error("Enregistrement trop volumineux"), { status: 413 });
      await handle.write(chunk);
    }
    await handle.sync();
    return size;
  } catch (error) {
    await fs.unlink(filePath).catch(() => {});
    throw error;
  } finally {
    await handle.close().catch(() => {});
  }
}

function normalizeAgenda(value) {
  if (Array.isArray(value)) return value.map((item) => safeText(item, 500)).filter(Boolean).slice(0, 50);
  return String(value || "").split(/\n+/u).map((item) => item.replace(/^[-•]\s*/u, "").trim()).filter(Boolean).slice(0, 50);
}

function participantInput(item, index = 0) {
  return {
    id: safeText(item?.id, 80) || crypto.randomUUID(),
    name: safeText(item?.name, 180),
    presence: ["present", "absent", "excused", "unknown"].includes(item?.presence) ? item.presence : "unknown",
    role: safeText(item?.role, 300),
    isFacilitator: Boolean(item?.isFacilitator),
    addedDuring: Boolean(item?.addedDuring),
    sortOrder: Number.isInteger(Number(item?.sortOrder)) ? Number(item.sortOrder) : index
  };
}

function meetingSummary(row) {
  return {
    id: row.id,
    title: row.title,
    date: safeDate(row.meeting_date),
    meetingType: row.meeting_type,
    theme: row.theme,
    objective: row.objective,
    agenda: row.agenda || [],
    previousRecap: row.previous_recap || "",
    stage: row.stage,
    status: row.status,
    recordingNotice: row.recording_notice || "",
    recordingNoticeConfirmedAt: row.recording_notice_confirmed_at,
    hasAudio: Boolean(row.audio_storage_path),
    audioOriginalName: row.audio_original_name || "",
    audioMimeType: row.audio_mime_type || "",
    audioSizeBytes: Number(row.audio_size_bytes || 0),
    audioSha256: row.audio_sha256 || "",
    transcriptionState: row.transcription_state,
    transcriptionError: row.transcription_error || "",
    transcriptionEngine: row.transcription_engine || "",
    reportDraft: row.report_draft || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function markerView(row) {
  return {
    id: row.id,
    type: row.marker_type,
    timeSeconds: Number(row.time_seconds || 0),
    note: row.note || "",
    classification: row.classification,
    responsible: row.responsible || "",
    dueDate: safeDate(row.due_date),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function participantView(row) {
  return {
    id: row.id,
    name: row.name,
    presence: row.presence,
    role: row.role || "",
    isFacilitator: Boolean(row.is_facilitator),
    addedDuring: Boolean(row.added_during),
    sortOrder: Number(row.sort_order || 0)
  };
}

function parseJsonLineEvents(child, onEvent) {
  let buffer = "";
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buffer += chunk;
    let index;
    while ((index = buffer.indexOf("\n")) >= 0) {
      const line = buffer.slice(0, index).trim();
      buffer = buffer.slice(index + 1);
      if (!line) continue;
      try { onEvent(JSON.parse(line)); } catch {}
    }
  });
  child.stdout.on("end", () => {
    const line = buffer.trim();
    if (line) {
      try { onEvent(JSON.parse(line)); } catch {}
    }
  });
}

function runJsonLines(command, args, env = {}) {
  return new Promise((resolve, reject) => {
    const events = [];
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...env }
    });
    let stderr = "";
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk) => { stderr += chunk; });
    parseJsonLineEvents(child, (event) => events.push(event));
    child.on("error", reject);
    child.on("close", (code) => {
      const errorEvent = [...events].reverse().find((event) => event.type === "error");
      if (code !== 0) reject(new Error(errorEvent?.message || stderr.trim() || `Moteur local arrêté (code ${code})`));
      else resolve(events);
    });
  });
}

function localEngineAvailable() {
  return process.env.FINCA_TRANSCRIPTION_ENABLED === "1"
    && fsSync.existsSync(TRANSCRIBE_SCRIPT);
}

function formatTranscriptText(transcript) {
  const clock = (seconds) => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const h = Math.floor(value / 3600);
    const m = Math.floor((value % 3600) / 60);
    const s = value % 60;
    return [h, m, s].map((part) => String(part).padStart(2, "0")).join(":");
  };
  return (transcript?.segments || []).map((segment) => `[${clock(segment.start)}] ${segment.speaker} — ${segment.text}`).join("\n\n");
}

export function createMeetingRouter({ pool, requireAdmin, requireFamilyUser, audit, readBody, json, baulRoot }) {
  const meetingsRoot = path.resolve(baulRoot, "meetings");

  function absoluteMeetingPath(relativePath) {
    const resolved = path.resolve(baulRoot, relativePath);
    if (resolved !== baulRoot && !resolved.startsWith(`${baulRoot}${path.sep}`)) {
      throw Object.assign(new Error("Chemin audio invalide"), { status: 400 });
    }
    return resolved;
  }

  function meetingDir(id) {
    safeMeetingId(id);
    const dir = path.join(meetingsRoot, id);
    if (!dir.startsWith(meetingsRoot + path.sep)) throw Object.assign(new Error("Chemin de réunion invalide"), { status: 400 });
    return dir;
  }

  async function ensureRoot() {
    await fs.mkdir(meetingsRoot, { recursive: true });
  }

  async function fullMeeting(id, client = pool) {
    const safeId = safeMeetingId(id);
    const [meeting, participants, markers, versions, links] = await Promise.all([
      client.query("SELECT m.*, (SELECT COUNT(*) FROM meeting_audio_chunks c WHERE c.meeting_id=m.id)::int AS audio_chunk_count FROM meetings m WHERE m.id=$1", [safeId]),
      client.query("SELECT * FROM meeting_participants WHERE meeting_id=$1 ORDER BY sort_order, created_at", [safeId]),
      client.query("SELECT * FROM meeting_markers WHERE meeting_id=$1 ORDER BY time_seconds, created_at", [safeId]),
      client.query("SELECT id, version, snapshot, validated_at, validated_by FROM meeting_report_versions WHERE meeting_id=$1 ORDER BY version DESC", [safeId]),
      client.query("SELECT id, marker_id, kind, target_ref, created_at FROM meeting_links WHERE meeting_id=$1 ORDER BY created_at", [safeId])
    ]);
    if (!meeting.rowCount) throw Object.assign(new Error("Réunion introuvable"), { status: 404 });
    const row = meeting.rows[0];
    const sources = await client.query("SELECT id,name,sha256 FROM meeting_sources WHERE meeting_id=$1 ORDER BY created_at", [safeId]);
    return {
      sources: sources.rows,
      ...meetingSummary(row),
      audioChunkCount: Number(row.audio_chunk_count || 0),
      participants: participants.rows.map(participantView),
      markers: markers.rows.map(markerView),
      transcript: row.transcript || null,
      speakerOverrides: row.speaker_overrides || {},
      transcriptText: formatTranscriptText(row.transcript),
      validatedVersions: versions.rows.map((item) => ({
        id: item.id,
        version: Number(item.version),
        snapshot: item.snapshot,
        validatedAt: item.validated_at,
        validatedBy: item.validated_by
      })),
      links: links.rows.map((item) => ({
        id: item.id,
        markerId: item.marker_id,
        kind: item.kind,
        targetRef: item.target_ref,
        createdAt: item.created_at
      }))
    };
  }

  async function listMeetings(req, res, url) {
    await requireFamilyUser(req);
    const query = meetingListQuery(url.searchParams);
    const totalResult = await pool.query(`SELECT COUNT(*)::int AS total FROM meetings m WHERE ${query.where}`, query.values);
    const result = await pool.query(`
      SELECT m.*,
        (SELECT COUNT(*) FROM meeting_participants p WHERE p.meeting_id=m.id AND p.presence='present') AS present_count,
        (SELECT COUNT(*) FROM meeting_participants p WHERE p.meeting_id=m.id) AS participant_count,
        (SELECT COUNT(*) FROM meeting_participants p WHERE p.meeting_id=m.id AND p.presence='unknown') AS unknown_count,
        (SELECT COUNT(*) FROM meeting_markers x WHERE x.meeting_id=m.id) AS marker_count,
        (SELECT MAX(version) FROM meeting_report_versions v WHERE v.meeting_id=m.id) AS validated_version
      FROM meetings m WHERE ${query.where}
      ORDER BY meeting_date DESC, created_at DESC, m.id
      LIMIT $${query.values.length + 1} OFFSET $${query.values.length + 2}
    `, [...query.values, query.limit, query.offset]);
    const total = Number(totalResult.rows[0].total);
    return json(res, 200, {
      total,
      hasMore: query.offset + result.rows.length < total,
      meetings: result.rows.map((row) => ({
        ...meetingSummary(row),
        presentCount: Number(row.present_count || 0),
        participantCount: Number(row.participant_count || 0),
        unknownCount: Number(row.unknown_count || 0),
        markerCount: Number(row.marker_count || 0),
        validatedVersion: Number(row.validated_version || 0)
      }))
    });
  }



  async function decisionRegister(req, res, url) {
    await requireFamilyUser(req);
    const query = decisionRegisterQuery(url.searchParams);
    const result = await pool.query(`SELECT k.id,k.meeting_id,k.note,k.classification,k.responsible,k.due_date,m.title,m.theme,m.report_draft->>'subjects' AS subjects,m.report_draft->>'summary' AS summary,m.meeting_date,m.meeting_type FROM meeting_markers k JOIN meetings m ON m.id=k.meeting_id WHERE ${query.where} ORDER BY m.meeting_date DESC,k.created_at DESC,k.id LIMIT 5001`,query.values);
    return json(res, 200, {
      hasMore: result.rows.length > 5000,
      decisions: result.rows.slice(0,5000).map((row) => ({
        id: row.id, meetingId: row.meeting_id, note: row.note,
        classification: row.classification, responsible: row.responsible,
        dueDate: safeDate(row.due_date), title: row.title,
        date: safeDate(row.meeting_date), meetingType: row.meeting_type, theme: row.theme, subjects: row.subjects, summary: row.summary
      }))
    });
  }

  async function importHistoricMeetings(req, res) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const items = body.items;
    if (!Array.isArray(items) || !items.length || items.length > 50) {
      return json(res, 400, { error: "Importer entre 1 et 50 comptes rendus par lot." });
    }
    const normalized = [];
    for (const [index, item] of items.entries()) {
      const originalText = String(item?.originalText || "").trim();
      const date = safeDate(item?.date);
      if (!originalText || originalText.length > 100000 || !date) {
        return json(res, 400, { error: "Compte rendu " + (index + 1) + " : texte et date exacte obligatoires." });
      }
      const hash = crypto.createHash("sha256").update(originalText.normalize("NFC")).digest("hex");
      const candidates = (Array.isArray(item?.candidates) ? item.candidates : []).map((value) => safeText(value, 2500)).filter(Boolean).slice(0, 100);
      normalized.push({ originalText, hash, date, title: safeText(item?.title, 240) || "Compte rendu historique", candidates });
    }
    const results = [];
    for (const item of normalized) {
      const id = crypto.randomUUID();
      const draft = {
        historicImport: true,
        historicHash: item.hash,
        historicOriginal: item.originalText,
        historicCandidateCount: item.candidates.length,
        historicImportNote: "Archive originale conservée. Extraits automatiques non validés."
      };
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const existing = await client.query("SELECT id FROM meetings WHERE report_draft->>'historicHash'=$1 LIMIT 1", [item.hash]);
        if (existing.rowCount) {
          await client.query("COMMIT");
          results.push({ id: existing.rows[0].id, title: item.title, duplicate: true, candidates: item.candidates.length });
          continue;
        }
        await client.query(
          "INSERT INTO meetings (id,title,meeting_date,meeting_type,stage,status,report_draft,created_by,updated_by) VALUES ($1,$2,$3,'Conseil de famille · archive','Clôture','review',$4::jsonb,$5,$5)",
          [id, item.title, item.date, JSON.stringify(draft), user.id]
        );
        for (const candidate of item.candidates) {
          await client.query(
            "INSERT INTO meeting_markers (id,meeting_id,marker_type,time_seconds,note,classification,created_by) VALUES ($1,$2,'decision',0,$3,'a_valider',$4)",
            [crypto.randomUUID(), id, candidate, user.id]
          );
        }
        await audit(user, req, "meeting_historic_import", "meeting", id, null, { hash: item.hash, candidates: item.candidates.length }, "ok", client);
        await client.query("COMMIT");
        results.push({ id, title: item.title, duplicate: false, candidates: item.candidates.length });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }
    return json(res, 200, { imported: results.filter((x) => !x.duplicate).length, duplicates: results.filter((x) => x.duplicate).length, results });
  }

  async function createMeeting(req, res) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const title = safeText(body.title, 240);
    const date = safeDate(body.date);
    if (!title || !date) return json(res, 400, { error: "Titre et date obligatoires" });
    const id = crypto.randomUUID();
    const participants = (Array.isArray(body.participants) ? body.participants : []).map(participantInput).filter((item) => item.name);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `INSERT INTO meetings
          (id,title,meeting_date,meeting_type,theme,objective,agenda,previous_recap,stage,status,recording_notice,created_by,updated_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,'Ouverture','draft',$9,$10,$10)`,
        [
          id,
          title,
          date,
          safeText(body.meetingType, 120) || "Conseil de famille",
          safeText(body.theme, 500),
          safeText(body.objective, 5000),
          JSON.stringify(normalizeAgenda(body.agenda)),
          safeText(body.previousRecap, 10000),
          safeText(body.recordingNotice, 2000),
          user.id
        ]
      );
      for (const participant of participants) {
        await client.query(
          `INSERT INTO meeting_participants
            (id,meeting_id,name,presence,role,is_facilitator,added_during,sort_order)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [participant.id, id, participant.name, participant.presence, participant.role, participant.isFacilitator, participant.addedDuring, participant.sortOrder]
        );
      }
      await audit(user, req, "meeting_create", "meeting", id, null, { title, date, participantCount: participants.length }, "ok", client);
      await client.query("COMMIT");
      await fs.mkdir(meetingDir(id), { recursive: true });
      return json(res, 201, { meeting: await fullMeeting(id) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function updateMeeting(req, res, id) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const current = await pool.query("SELECT * FROM meetings WHERE id=$1", [safeMeetingId(id)]);
    if (!current.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    const before = current.rows[0];
    const stage = body.stage === undefined ? before.stage : String(body.stage);
    if (!MEETING_STAGES.includes(stage)) return json(res, 400, { error: "Étape de trame invalide" });
    const date = body.date === undefined ? before.meeting_date : safeDate(body.date);
    if (!date) return json(res, 400, { error: "Date invalide" });
    const reportDraft = body.reportDraft === undefined ? before.report_draft : { ...body.reportDraft };
    for (const key of ["historicOriginal", "historicHash", "archiveSourceHash", "archiveCanonicalHash"]) {
      if (before.report_draft?.[key] !== undefined) reportDraft[key] = before.report_draft[key];
    }
    const saved = await pool.query(
      `UPDATE meetings SET
        title=$2, meeting_date=$3, meeting_type=$4, theme=$5, objective=$6, agenda=$7::jsonb,
        previous_recap=$8, stage=$9, report_draft=$10::jsonb, updated_by=$11, updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [
        id,
        body.title === undefined ? before.title : safeText(body.title, 240),
        date,
        body.meetingType === undefined ? before.meeting_type : safeText(body.meetingType, 120),
        body.theme === undefined ? before.theme : safeText(body.theme, 500),
        body.objective === undefined ? before.objective : safeText(body.objective, 5000),
        JSON.stringify(body.agenda === undefined ? before.agenda : normalizeAgenda(body.agenda)),
        body.previousRecap === undefined ? before.previous_recap : safeText(body.previousRecap, 10000),
        stage,
        JSON.stringify(reportDraft && typeof reportDraft === "object" ? reportDraft : {}),
        user.id
      ]
    );
    await audit(user, req, "meeting_update", "meeting", id, meetingSummary(before), meetingSummary(saved.rows[0]));
    return json(res, 200, { meeting: await fullMeeting(id) });
  }

  async function addParticipant(req, res, id) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const participant = participantInput(body);
    if (!participant.name) return json(res, 400, { error: "Nom du participant obligatoire" });
    const meeting = await pool.query("SELECT id FROM meetings WHERE id=$1", [safeMeetingId(id)]);
    if (!meeting.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    await pool.query(
      `INSERT INTO meeting_participants
        (id,meeting_id,name,presence,role,is_facilitator,added_during,sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [participant.id, id, participant.name, participant.presence, participant.role, participant.isFacilitator, participant.addedDuring, participant.sortOrder]
    );
    await audit(user, req, "meeting_participant_add", "meeting", id, null, { name: participant.name, presence: participant.presence });
    return json(res, 201, { meeting: await fullMeeting(id) });
  }

  async function updateParticipant(req, res, id, participantId) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const current = await pool.query("SELECT * FROM meeting_participants WHERE id=$1 AND meeting_id=$2", [participantId, safeMeetingId(id)]);
    if (!current.rowCount) return json(res, 404, { error: "Participant introuvable" });
    const before = current.rows[0];
    const presence = body.presence === undefined ? before.presence : String(body.presence);
    if (!["present", "absent", "excused", "unknown"].includes(presence)) return json(res, 400, { error: "Présence invalide" });
    await pool.query(
      `UPDATE meeting_participants SET name=$3,presence=$4,role=$5,is_facilitator=$6,updated_at=NOW()
       WHERE id=$1 AND meeting_id=$2`,
      [
        participantId,
        id,
        body.name === undefined ? before.name : safeText(body.name, 180),
        presence,
        body.role === undefined ? before.role : safeText(body.role, 300),
        body.isFacilitator === undefined ? before.is_facilitator : Boolean(body.isFacilitator)
      ]
    );
    await audit(user, req, "meeting_participant_update", "meeting", id, participantView(before), { participantId });
    return json(res, 200, { meeting: await fullMeeting(id) });
  }

  async function addMarker(req, res, id) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const type = String(body.type || "");
    if (!MARKER_TYPES.has(type)) return json(res, 400, { error: "Type de marqueur invalide" });
    const markerId = safeText(body.id, 80) || crypto.randomUUID();
    const seconds = Math.max(0, Math.min(24 * 3600, Number(body.timeSeconds || 0)));
    const meeting = await pool.query("SELECT id FROM meetings WHERE id=$1", [safeMeetingId(id)]);
    if (!meeting.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    await pool.query(
      `INSERT INTO meeting_markers
        (id,meeting_id,marker_type,time_seconds,note,classification,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT (id) DO NOTHING`,
      [markerId, id, type, seconds, safeText(body.note, 3000), defaultClassification(type), user.id]
    );
    return json(res, 201, { meeting: await fullMeeting(id) });
  }

  async function updateMarker(req, res, id, markerId) {
    const user = await requireAdmin(req);
    const body = await readBody(req);
    const current = await pool.query("SELECT * FROM meeting_markers WHERE id=$1 AND meeting_id=$2", [markerId, safeMeetingId(id)]);
    if (!current.rowCount) return json(res, 404, { error: "Marqueur introuvable" });
    const before = current.rows[0];
    const classification = body.classification === undefined ? before.classification : String(body.classification);
    if (!CLASSIFICATIONS.has(classification)) return json(res, 400, { error: "Qualification invalide" });
    const dueDate = body.dueDate === undefined ? before.due_date : (safeDate(body.dueDate) || null);
    const saved = await pool.query(
      `UPDATE meeting_markers SET note=$3,classification=$4,responsible=$5,due_date=$6,updated_at=NOW()
       WHERE id=$1 AND meeting_id=$2 RETURNING *`,
      [
        markerId,
        id,
        body.note === undefined ? before.note : safeText(body.note, 3000),
        classification,
        body.responsible === undefined ? before.responsible : safeText(body.responsible, 180),
        dueDate
      ]
    );
    await audit(user, req, "meeting_marker_update", "meeting_marker", markerId, markerView(before), markerView(saved.rows[0]));
    return json(res, 200, { meeting: await fullMeeting(id) });
  }

  async function confirmRecordingNotice(req, res, id) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    const body = await readBody(req);
    if (body.informed !== true) return json(res, 400, { error: "Confirmation explicite de l’information des participants requise" });
    const notice = safeText(body.notice, 2000);
    if (!notice) return json(res, 400, { error: "Texte d’information manquant" });
    const saved = await pool.query(
      `UPDATE meetings SET recording_notice=$2,recording_notice_confirmed_at=NOW(),updated_by=$3,updated_at=NOW()
       WHERE id=$1 RETURNING id,recording_notice,recording_notice_confirmed_at`,
      [safeId, notice, user.id]
    );
    if (!saved.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    await audit(user, req, "meeting_recording_notice_confirm", "meeting", safeId, null, { informed: true });
    return json(res, 200, {
      ok: true,
      recordingNotice: saved.rows[0].recording_notice,
      confirmedAt: saved.rows[0].recording_notice_confirmed_at
    });
  }

  async function saveAudioChunk(req, res, id, seqRaw) {
    const user = await requireAdmin(req);
    await ensureRoot();
    const safeId = safeMeetingId(id);
    const seq = Number(seqRaw);
    if (!Number.isInteger(seq) || seq < 0 || seq > 100000) return json(res, 400, { error: "Numéro de bloc invalide" });
    const meeting = await pool.query("SELECT id FROM meetings WHERE id=$1", [safeId]);
    if (!meeting.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    const buffer = await readRaw(req, MAX_AUDIO_CHUNK);
    if (!buffer.length) return json(res, 400, { error: "Bloc audio vide" });
    const hash = crypto.createHash("sha256").update(buffer).digest("hex");
    const existing = await pool.query("SELECT * FROM meeting_audio_chunks WHERE meeting_id=$1 AND seq=$2", [safeId, seq]);
    if (existing.rowCount) {
      if (existing.rows[0].sha256 === hash) return json(res, 200, { ok: true, duplicate: true, seq, sha256: hash });
      return json(res, 409, { error: "Un autre bloc existe déjà à cet emplacement" });
    }
    const dir = path.join(meetingDir(safeId), "chunks");
    await fs.mkdir(dir, { recursive: true });
    const relativePath = path.relative(baulRoot, path.join(dir, `${String(seq).padStart(8, "0")}.part`));
    const absolutePath = absoluteMeetingPath(relativePath);
    const temp = `${absolutePath}.tmp-${crypto.randomUUID()}`;
    await fs.writeFile(temp, buffer, { flag: "wx" });
    await fs.rename(temp, absolutePath);
    try {
      await pool.query(
        `INSERT INTO meeting_audio_chunks (meeting_id,seq,mime_type,size_bytes,sha256,storage_path)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [safeId, seq, safeText(req.headers["content-type"], 200) || "application/octet-stream", buffer.length, hash, relativePath]
      );
      await pool.query("UPDATE meetings SET status='recording',updated_by=$2,updated_at=NOW() WHERE id=$1 AND status<>'validated'", [safeId, user.id]);
      return json(res, 201, { ok: true, duplicate: false, seq, sha256: hash, size: buffer.length });
    } catch (error) {
      await fs.unlink(absolutePath).catch(() => {});
      throw error;
    }
  }

  async function finalizeAudio(req, res, id) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    const body = await readBody(req);
    const chunks = await pool.query("SELECT * FROM meeting_audio_chunks WHERE meeting_id=$1 ORDER BY seq", [safeId]);
    if (!chunks.rowCount) return json(res, 409, { code: "NO_AUDIO_CHUNKS", error: "Aucun bloc audio sauvegardé" });
    for (let index = 0; index < chunks.rows.length; index += 1) {
      if (Number(chunks.rows[index].seq) !== index) return json(res, 409, { error: `Bloc audio manquant : ${index}` });
    }
    const mime = safeText(body.mimeType, 200) || chunks.rows[0].mime_type || "audio/webm";
    const dir = meetingDir(safeId);
    await fs.mkdir(dir, { recursive: true });
    const finalName = `audio-original${mimeExtension(mime)}`;
    const absolutePath = path.join(dir, finalName);
    const temp = `${absolutePath}.tmp-${crypto.randomUUID()}`;
    const handle = await fs.open(temp, "wx");
    let size = 0;
    try {
      for (const chunk of chunks.rows) {
        const data = await fs.readFile(absoluteMeetingPath(chunk.storage_path));
        await handle.write(data);
        size += data.length;
      }
      await handle.sync();
    } finally {
      await handle.close().catch(() => {});
    }
    const hash = await sha256File(temp);
    await fs.rename(temp, absolutePath);
    const relativePath = path.relative(baulRoot, absolutePath);
    const saved = await pool.query(
      `UPDATE meetings SET audio_original_name=$2,audio_mime_type=$3,audio_size_bytes=$4,audio_sha256=$5,audio_storage_path=$6,
        status='ready',recording_notice=$7,recording_notice_confirmed_at=COALESCE(recording_notice_confirmed_at,NOW()),updated_by=$8,updated_at=NOW()
       WHERE id=$1 RETURNING *`,
      [safeId, safeText(body.originalName, 240) || finalName, mime, size, hash, relativePath, safeText(body.recordingNotice, 2000), user.id]
    );
    await audit(user, req, "meeting_audio_finalize", "meeting", safeId, null, { sha256: hash, size, chunks: chunks.rowCount });
    return json(res, 200, { ok: true, audio: meetingSummary(saved.rows[0]), meeting: await fullMeeting(safeId) });
  }

  async function importAudio(req, res, id) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    await ensureRoot();
    const current = await pool.query("SELECT * FROM meetings WHERE id=$1", [safeId]);
    if (!current.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    const mime = safeText(req.headers["content-type"], 200) || "application/octet-stream";
    const originalName = safeText(decodeURIComponent(String(req.headers["x-finca-filename"] || "enregistrement")), 240);
    const dir = meetingDir(safeId);
    await fs.mkdir(dir, { recursive: true });
    const finalName = `audio-original${mimeExtension(mime)}`;
    const absolutePath = path.join(dir, finalName);
    const temp = `${absolutePath}.upload-${crypto.randomUUID()}`;
    const size = await writeRequest(req, temp, MAX_AUDIO_IMPORT);
    if (!size) {
      await fs.unlink(temp).catch(() => {});
      return json(res, 400, { error: "Enregistrement vide" });
    }
    const hash = await sha256File(temp);
    if (current.rows[0].audio_sha256 === hash) {
      await fs.unlink(temp).catch(() => {});
      return json(res, 200, { ok: true, duplicate: true, meeting: await fullMeeting(safeId) });
    }
    if (current.rows[0].audio_storage_path) {
      await fs.unlink(temp).catch(() => {});
      return json(res, 409, { error: "Cette réunion possède déjà un audio original. Il n’est pas remplacé automatiquement." });
    }
    await fs.rename(temp, absolutePath);
    const relativePath = path.relative(baulRoot, absolutePath);
    await pool.query(
      `UPDATE meetings SET audio_original_name=$2,audio_mime_type=$3,audio_size_bytes=$4,audio_sha256=$5,audio_storage_path=$6,
        status='ready',updated_by=$7,updated_at=NOW() WHERE id=$1`,
      [safeId, originalName || finalName, mime, size, hash, relativePath, user.id]
    );
    await audit(user, req, "meeting_audio_import", "meeting", safeId, null, { sha256: hash, size, originalName });
    return json(res, 201, { ok: true, duplicate: false, meeting: await fullMeeting(safeId) });
  }

  async function streamAudio(req, res, id) {
    await requireFamilyUser(req);
    const safeId = safeMeetingId(id);
    const result = await pool.query("SELECT audio_storage_path,audio_mime_type,audio_original_name FROM meetings WHERE id=$1", [safeId]);
    if (!result.rowCount || !result.rows[0].audio_storage_path) return json(res, 404, { error: "Audio introuvable" });
    const filePath = absoluteMeetingPath(result.rows[0].audio_storage_path);
    let stat;
    try { stat = await fs.stat(filePath); } catch { return json(res, 404, { error: "Fichier audio introuvable" }); }
    const range = String(req.headers.range || "");
    const headers = {
      "Content-Type": result.rows[0].audio_mime_type || "application/octet-stream",
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff"
    };
    if (!range) {
      res.writeHead(200, { ...headers, "Content-Length": stat.size });
      fsSync.createReadStream(filePath).pipe(res);
      return;
    }
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      return res.end();
    }
    let start = match[1] ? Number(match[1]) : 0;
    let end = match[2] ? Number(match[2]) : stat.size - 1;
    if (!match[1] && match[2]) {
      const suffix = Number(match[2]);
      start = Math.max(0, stat.size - suffix);
      end = stat.size - 1;
    }
    if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || start >= stat.size || end < start) {
      res.writeHead(416, { "Content-Range": `bytes */${stat.size}` });
      return res.end();
    }
    end = Math.min(end, stat.size - 1);
    res.writeHead(206, {
      ...headers,
      "Content-Length": end - start + 1,
      "Content-Range": `bytes ${start}-${end}/${stat.size}`
    });
    fsSync.createReadStream(filePath, { start, end }).pipe(res);
  }

  async function processTranscription(id, cacheKey) {
    try {
      const current = await pool.query("SELECT * FROM meetings WHERE id=$1", [id]);
      if (!current.rowCount) return;
      const row = current.rows[0];
      const participantsResult = await pool.query(
        "SELECT name FROM meeting_participants WHERE meeting_id=$1 AND presence='present' ORDER BY sort_order,created_at",
        [id]
      );
      const participants = participantsResult.rows.map((item) => item.name);
      const sourcePath = absoluteMeetingPath(row.audio_storage_path);
      await pool.query(
        "UPDATE meetings SET transcription_state='running',transcription_error=NULL,status='transcribing',transcription_engine=$2,updated_at=NOW() WHERE id=$1",
        [id, `faster-whisper:${LOCAL_MODEL}`]
      );
      const localEvents = await runJsonLines(PYTHON_BIN, [
        TRANSCRIBE_SCRIPT,
        sourcePath,
        "--model",
        LOCAL_MODEL,
        "--language",
        "fr"
      ]);
      const localSegments = localEvents.filter((event) => event.type === "segment").map((event) => ({
        id: event.id,
        start: Number(event.start || 0),
        end: Number(event.end || event.start || 0),
        text: String(event.text || ""),
        words: Array.isArray(event.words) ? event.words : []
      }));
      const words = localSegments.flatMap((segment) => segment.words || []);
      const local = { segments: localSegments, words };
      const warnings = [];
      let diarization = [];
      if (fsSync.existsSync(DIARIZE_SCRIPT) && String(process.env.HF_TOKEN || "").trim()) {
        try {
          const diarizationEvents = await runJsonLines(PYTHON_BIN, [DIARIZE_SCRIPT, sourcePath], { HF_TOKEN: process.env.HF_TOKEN });
          diarization = diarizationEvents.filter((event) => event.type === "speaker_segment").map((event) => ({
            start: Number(event.start || 0),
            end: Number(event.end || event.start || 0),
            speaker: String(event.speaker || "?")
          }));
        } catch (error) {
          warnings.push(`Séparation des voix indisponible : ${error.message}`);
        }
      } else {
        warnings.push("Séparation des voix non activée : transcription conservée avec intervenant non identifié.");
      }
      const turns = buildSpeakerTurns(local, diarization);
      const finalized = finalizeTurns(turns, participants);
      const transcript = {
        engine: `faster-whisper:${LOCAL_MODEL}`,
        diarizationEngine: diarization.length ? DIARIZATION_MODEL : "",
        createdAt: new Date().toISOString(),
        participants,
        detectedSpeakerCount: finalized.detectedSpeakerCount,
        speakerMapping: finalized.speakerMapping,
        speakerOverrides: {},
        warnings,
        segments: finalized.segments
      };
      await pool.query(
        `UPDATE meetings SET transcript=$2::jsonb,speaker_overrides='{}'::jsonb,transcription_state='done',transcription_error=NULL,
          transcription_cache_key=$3,status='review',updated_at=NOW() WHERE id=$1`,
        [id, JSON.stringify(transcript), cacheKey]
      );
    } catch (error) {
      await pool.query(
        "UPDATE meetings SET transcription_state='error',transcription_error=$2,status='failed',updated_at=NOW() WHERE id=$1",
        [id, String(error?.message || "Échec de la transcription").slice(0, 2000)]
      ).catch(() => {});
    }
  }

  async function startTranscription(req, res, id) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    if (!localEngineAvailable()) {
      return json(res, 503, {
        error: "Le moteur local de transcription n’est pas installé dans cette instance.",
        code: "LOCAL_TRANSCRIPTION_NOT_READY"
      });
    }
    const meeting = await pool.query("SELECT * FROM meetings WHERE id=$1", [safeId]);
    if (!meeting.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    const row = meeting.rows[0];
    if (!row.audio_storage_path || !row.audio_sha256) return json(res, 409, { error: "Aucun audio original à transcrire" });
    const participants = await pool.query("SELECT name,role FROM meeting_participants WHERE meeting_id=$1 AND presence='present' ORDER BY sort_order,created_at", [safeId]);
    const signature = JSON.stringify({
      sha256: row.audio_sha256,
      model: LOCAL_MODEL,
      participants: participants.rows,
      title: row.title,
      theme: row.theme,
      objective: row.objective,
      agenda: row.agenda
    });
    const cacheKey = crypto.createHash("sha256").update(signature).digest("hex");
    if (row.transcription_cache_key === cacheKey && row.transcription_state === "done" && row.transcript) {
      return json(res, 200, { cached: true, alreadyRunning: false, meeting: await fullMeeting(safeId) });
    }
    if (row.transcription_cache_key === cacheKey && ["queued", "running"].includes(row.transcription_state)) {
      return json(res, 200, { cached: false, alreadyRunning: true, meeting: await fullMeeting(safeId) });
    }
    await pool.query(
      "UPDATE meetings SET transcription_state='queued',transcription_error=NULL,transcription_cache_key=$2,status='transcribing',updated_by=$3,updated_at=NOW() WHERE id=$1",
      [safeId, cacheKey, user.id]
    );
    await audit(user, req, "meeting_transcription_start", "meeting", safeId, null, { engine: LOCAL_MODEL, cacheKey });
    setImmediate(() => processTranscription(safeId, cacheKey));
    return json(res, 202, { cached: false, alreadyRunning: false, meeting: await fullMeeting(safeId) });
  }

  async function updateSpeakers(req, res, id) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    const body = await readBody(req);
    const meeting = await pool.query("SELECT transcript,speaker_overrides FROM meetings WHERE id=$1", [safeId]);
    if (!meeting.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    if (!meeting.rows[0].transcript) return json(res, 409, { error: "Aucune transcription à corriger" });
    const participants = await pool.query("SELECT name FROM meeting_participants WHERE meeting_id=$1 AND presence='present'", [safeId]);
    const mapping = cleanSpeakerMapping(body.mapping, participants.rows.map((item) => item.name));
    const merged = { ...(meeting.rows[0].speaker_overrides || {}), ...mapping };
    const transcript = applySpeakerOverrides(meeting.rows[0].transcript, mapping);
    await pool.query(
      "UPDATE meetings SET transcript=$2::jsonb,speaker_overrides=$3::jsonb,updated_by=$4,updated_at=NOW() WHERE id=$1",
      [safeId, JSON.stringify(transcript), JSON.stringify(merged), user.id]
    );
    await audit(user, req, "meeting_speakers_confirm", "meeting", safeId, null, { sources: Object.keys(mapping), names: Object.values(mapping) });
    return json(res, 200, { mapping: merged, meeting: await fullMeeting(safeId) });
  }

  async function validateReport(req, res, id) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const detail = await fullMeeting(safeId, client);
      const previous = await client.query("SELECT version FROM meeting_report_versions WHERE meeting_id=$1 ORDER BY version DESC LIMIT 1 FOR UPDATE", [safeId]);
      const version = Number(previous.rows[0]?.version || 0) + 1;
      const snapshot = {
        schema: "finca-meeting-report-v1",
        meeting: {
          id: detail.id,
          title: detail.title,
          date: detail.date,
          meetingType: detail.meetingType,
          theme: detail.theme,
          objective: detail.objective,
          agenda: detail.agenda,
          previousRecap: detail.previousRecap
        },
        participants: detail.participants,
        markers: detail.markers,
        transcript: detail.transcript,
        reportDraft: detail.reportDraft,
        links: detail.links,
        validatedAt: new Date().toISOString()
      };
      await client.query(
        "INSERT INTO meeting_report_versions (meeting_id,version,snapshot,validated_by) VALUES ($1,$2,$3::jsonb,$4)",
        [safeId, version, JSON.stringify(snapshot), user.id]
      );
      await client.query("UPDATE meetings SET status='validated',stage='Clôture',updated_by=$2,updated_at=NOW() WHERE id=$1", [safeId, user.id]);
      await audit(user, req, "meeting_report_validate", "meeting", safeId, null, { version }, "ok", client);
      await client.query("COMMIT");
      return json(res, 200, { version, meeting: await fullMeeting(safeId) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function createAction(req, res, id, markerId) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    const body = await readBody(req);
    if (body.confirmed !== true) return json(res, 400, { error: "Confirmation humaine explicite requise" });
    const meetingResult = await pool.query("SELECT * FROM meetings WHERE id=$1", [safeId]);
    if (!meetingResult.rowCount) return json(res, 404, { error: "Réunion introuvable" });
    const validated = await pool.query("SELECT 1 FROM meeting_report_versions WHERE meeting_id=$1 LIMIT 1", [safeId]);
    if (!validated.rowCount) return json(res, 409, { error: "Validez d’abord le compte rendu de la réunion" });
    const markerResult = await pool.query("SELECT * FROM meeting_markers WHERE id=$1 AND meeting_id=$2", [markerId, safeId]);
    if (!markerResult.rowCount) return json(res, 404, { error: "Marqueur introuvable" });
    const action = buildConfirmedAction({
      meeting: { id: meetingResult.rows[0].id, title: meetingResult.rows[0].title, meeting_date: meetingResult.rows[0].meeting_date },
      marker: markerResult.rows[0]
    });
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const state = await client.query("SELECT * FROM shared_state WHERE key=$1 FOR UPDATE", [ACTIONS_KEY]);
      const current = state.rows[0]?.value;
      const missions = Array.isArray(current) ? current : [];
      const duplicate = missions.some((item) => item?.id === action.id);
      if (!duplicate) {
        const next = [action, ...missions];
        if (state.rowCount) {
          await client.query(
            "UPDATE shared_state SET value=$2::jsonb,version=version+1,updated_at=NOW(),updated_by=$3 WHERE key=$1",
            [ACTIONS_KEY, JSON.stringify(next), user.id]
          );
        } else {
          await client.query("INSERT INTO shared_state (key,value,updated_by) VALUES ($1,$2::jsonb,$3)", [ACTIONS_KEY, JSON.stringify(next), user.id]);
        }
      }
      await client.query(
        `INSERT INTO meeting_links (meeting_id,marker_id,kind,target_ref,created_by)
         VALUES ($1,$2,'action',$3,$4) ON CONFLICT (meeting_id,kind,target_ref) DO NOTHING`,
        [safeId, markerId, action.id, user.id]
      );
      await audit(user, req, duplicate ? "meeting_action_reuse" : "meeting_action_create", "meeting", safeId, null, { actionId: action.id }, "ok", client);
      await client.query("COMMIT");
      return json(res, duplicate ? 200 : 201, { duplicate, action, meeting: await fullMeeting(safeId) });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async function listDocuments(req, res) {
    await requireFamilyUser(req);
    const result = await pool.query(
      `SELECT id,logical_name,original_name,category,validated_at,size_bytes
       FROM baul_documents WHERE deleted_at IS NULL AND status='validated' ORDER BY validated_at DESC NULLS LAST,received_at DESC LIMIT 5000`
    );
    return json(res, 200, {
      documents: result.rows.map((row) => ({
        id: row.id,
        name: row.logical_name || row.original_name,
        category: row.category || "",
        validatedAt: row.validated_at,
        size: Number(row.size_bytes || 0)
      }))
    });
  }

  async function linkDocument(req, res, id, markerId) {
    const user = await requireAdmin(req);
    const safeId = safeMeetingId(id);
    const body = await readBody(req);
    const documentId = safeText(body.documentId, 120);
    if (!documentId) return json(res, 400, { error: "Document obligatoire" });
    const [marker, document] = await Promise.all([
      pool.query("SELECT id FROM meeting_markers WHERE id=$1 AND meeting_id=$2", [markerId, safeId]),
      pool.query("SELECT id FROM baul_documents WHERE id=$1 AND status='validated' AND deleted_at IS NULL", [documentId])
    ]);
    if (!marker.rowCount) return json(res, 404, { error: "Marqueur introuvable" });
    if (!document.rowCount) return json(res, 404, { error: "Document BAÚL validé introuvable" });
    const inserted = await pool.query(
      `INSERT INTO meeting_links (meeting_id,marker_id,kind,target_ref,created_by)
       VALUES ($1,$2,'document',$3,$4) ON CONFLICT (meeting_id,kind,target_ref) DO NOTHING RETURNING id`,
      [safeId, markerId, documentId, user.id]
    );
    await audit(user, req, inserted.rowCount ? "meeting_document_link" : "meeting_document_reuse", "meeting", safeId, null, { documentId });
    return json(res, inserted.rowCount ? 201 : 200, { duplicate: !inserted.rowCount, meeting: await fullMeeting(safeId) });
  }

  async function transcriptionHealth(req, res) {
    await requireAdmin(req);
    return json(res, 200, {
      localOnly: true,
      localEngineReady: localEngineAvailable(),
      transcriptionEnabled: process.env.FINCA_TRANSCRIPTION_ENABLED === "1",
      pythonCommand: PYTHON_BIN,
      transcriptionScriptPresent: fsSync.existsSync(TRANSCRIBE_SCRIPT),
      diarizationScriptPresent: fsSync.existsSync(DIARIZE_SCRIPT),
      whisperModel: LOCAL_MODEL,
      diarizationModel: DIARIZATION_MODEL,
      diarizationReady: localEngineAvailable() && fsSync.existsSync(DIARIZE_SCRIPT) && Boolean(String(process.env.HF_TOKEN || "").trim()),
      externalVerificationEnabled: false
    });
  }

  const archiveRoute = createArchiveRouter({ pool, requireAdmin, requireFamilyUser, readBody, json, audit, fullMeeting });

  async function route(req, res, url) {
    if (!url.pathname.startsWith("/api/meetings")) return false;
    if (await archiveRoute(req,res,url)) return true;

    if (url.pathname === "/api/meetings/transcription/health" && req.method === "GET") {
      await transcriptionHealth(req, res);
      return true;
    }
    if (url.pathname === "/api/meetings/documents" && req.method === "GET") {
      await listDocuments(req, res);
      return true;
    }
    if (url.pathname === "/api/meetings/decision-register" && req.method === "GET") {
      await decisionRegister(req, res, url);
      return true;
    }
    if (url.pathname === "/api/meetings/import-historic" && req.method === "POST") {
      await importHistoricMeetings(req, res);
      return true;
    }
    if (url.pathname === "/api/meetings" && req.method === "GET") {
      await listMeetings(req, res, url);
      return true;
    }
    if (url.pathname === "/api/meetings" && req.method === "POST") {
      await createMeeting(req, res);
      return true;
    }

    // Une réunion mise en corbeille est gelée, y compris ses participants,
    // marqueurs, enregistrements et versions de compte rendu.
    const meetingPath = url.pathname.match(/^\/api\/meetings\/([^/]+)(?:\/|$)/);
    if (meetingPath) {
      const id = safeMeetingId(meetingPath[1]);
      const visible = await pool.query("SELECT id FROM meetings WHERE id=$1 AND deleted_at IS NULL", [id]);
      if (!visible.rowCount) {
        json(res, 404, { error: "Réunion inexistante ou dans la corbeille" });
        return true;
      }
    }

    let match = url.pathname.match(/^\/api\/meetings\/([^/]+)$/);
    if (match && req.method === "GET") {
      await requireFamilyUser(req);
      json(res, 200, { meeting: await fullMeeting(match[1]) });
      return true;
    }
    if (match && req.method === "PUT") {
      await updateMeeting(req, res, match[1]);
      return true;
    }

    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/participants$/);
    if (match && req.method === "POST") {
      await addParticipant(req, res, match[1]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/participants\/([^/]+)$/);
    if (match && req.method === "PUT") {
      await updateParticipant(req, res, match[1], match[2]);
      return true;
    }

    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/markers$/);
    if (match && req.method === "POST") {
      await addMarker(req, res, match[1]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/markers\/([^/]+)$/);
    if (match && req.method === "PUT") {
      await updateMarker(req, res, match[1], match[2]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/markers\/([^/]+)\/create-action$/);
    if (match && req.method === "POST") {
      await createAction(req, res, match[1], match[2]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/markers\/([^/]+)\/link-document$/);
    if (match && req.method === "POST") {
      await linkDocument(req, res, match[1], match[2]);
      return true;
    }

    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/recording-consent$/);
    if (match && req.method === "POST") {
      await confirmRecordingNotice(req, res, match[1]);
      return true;
    }

    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/audio\/chunks\/(\d+)$/);
    if (match && req.method === "POST") {
      await saveAudioChunk(req, res, match[1], match[2]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/audio\/finalize$/);
    if (match && req.method === "POST") {
      await finalizeAudio(req, res, match[1]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/audio\/import$/);
    if (match && req.method === "POST") {
      await importAudio(req, res, match[1]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/audio$/);
    if (match && req.method === "GET") {
      await streamAudio(req, res, match[1]);
      return true;
    }

    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/transcribe$/);
    if (match && req.method === "POST") {
      await startTranscription(req, res, match[1]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/speakers$/);
    if (match && req.method === "PUT") {
      await updateSpeakers(req, res, match[1]);
      return true;
    }
    match = url.pathname.match(/^\/api\/meetings\/([^/]+)\/validate$/);
    if (match && req.method === "POST") {
      await validateReport(req, res, match[1]);
      return true;
    }

    json(res, 404, { error: "Route de réunion inconnue" });
    return true;
  }

  route.ensureRoot = ensureRoot;
  return route;
}
