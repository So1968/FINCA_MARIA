import crypto from "node:crypto";
import {
  previewArchive,
  sourceHash,
  nameKey,
  exactDate,
  participationSummary,
  presenceValues,
} from "./archive-domain.js";
import { CLASSIFICATIONS, MARKER_TYPES } from "./meeting-domain.js";
import { readWord } from "./word-archive.js";

const fail = (message, status = 400) =>
  Object.assign(new Error(message), { status });
export function createArchiveRouter({
  pool,
  requireAdmin,
  requireFamilyUser,
  readBody,
  json,
  audit,
  fullMeeting,
}) {
  async function source(body, client = pool) {
    if (body.file) {
      if (
        !/\.docx$/iu.test(body.file.name || "") ||
        typeof body.file.base64 !== "string" ||
        body.file.base64.length > 14 * 1024 * 1024 ||
        !/^[A-Za-z0-9+/]*={0,2}$/.test(body.file.base64)
      )
        throw fail("Choisissez un document Word .docx de 10 Mio au maximum.");
      const content = Buffer.from(body.file.base64, "base64");
      return {
        text: await readWord(content),
        file: {
          name: String(body.file.name)
            .replace(/[\r\n/\\]/g, "_")
            .slice(0, 200),
          content,
          hash: sourceHash(content),
        },
      };
    }
    if (body.meetingId) {
      const row = await client.query(
        "SELECT report_draft FROM meetings WHERE id=$1 AND deleted_at IS NULL",
        [body.meetingId],
      );
      if (!row.rowCount) throw fail("Réunion introuvable.", 404);
      return { text: row.rows[0].report_draft?.historicOriginal || "" };
    }
    return { text: body.originalText };
  }
  return async function archiveRoute(req, res, url) {
    const base = "/api/meetings";
    if (url.pathname === `${base}/participation` && req.method === "GET") {
      await requireFamilyUser(req);
      const from = url.searchParams.get("from") || "0001-01-01";
      const to = url.searchParams.get("to") || "9999-12-31";
      if (!exactDate(from) || !exactDate(to) || from > to)
        throw fail("Période invalide.");
      const meetings = await pool.query(
        "SELECT id,title,to_char(meeting_date,'YYYY-MM-DD') AS date FROM meetings WHERE deleted_at IS NULL AND meeting_date BETWEEN $1 AND $2 ORDER BY meeting_date DESC,id",
        [from, to],
      );
      const participants = await pool.query(
        'SELECT p.id,p.meeting_id AS "meetingId",p.name,p.presence FROM meeting_participants p JOIN meetings m ON m.id=p.meeting_id WHERE m.deleted_at IS NULL AND m.meeting_date BETWEEN $1 AND $2',
        [from, to],
      );
      return (
        json(res, 200, {
          meetings: meetings.rows,
          people: participationSummary(meetings.rows, participants.rows),
          denominatorNote:
            "Présents + absents + excusés dans la période. Les statuts inconnus sont exclus du taux. Sans ligne nominative, la présence reste inconnue.",
        }),
        true
      );
    }
    const download = url.pathname.match(
      /^\/api\/meetings\/([^/]+)\/sources\/([^/]+)$/u,
    );
    if (download && req.method === "GET") {
      await requireFamilyUser(req);
      const result = await pool.query(
        "SELECT s.* FROM meeting_sources s JOIN meetings m ON m.id=s.meeting_id WHERE s.meeting_id=$1 AND s.id=$2 AND m.deleted_at IS NULL",
        [download[1], download[2]],
      );
      if (!result.rowCount) throw fail("Source introuvable.", 404);
      const row = result.rows[0];
      res.writeHead(200, {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="source.docx"; filename*=UTF-8''${encodeURIComponent(row.name)}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(row.content);
      return true;
    }
    if (
      url.pathname !== `${base}/archive-preview` &&
      url.pathname !== `${base}/structure-review`
    )
      return false;
    if (req.method !== "POST") return false;
    const user = await requireAdmin(req);
    const body = await readBody(req, 16 * 1024 * 1024);
    const input = await source(body);
    const preview = previewArchive(input.text);
    if (url.pathname.endsWith("/archive-preview"))
      return (json(res, 200, { ...preview, originalText: input.text }), true);
    if (body.reviewed !== true || body.sourceHash !== preview.sourceHash)
      throw fail(
        "Relisez et validez explicitement cet aperçu avant enregistrement.",
        409,
      );
    if (
      !Array.isArray(body.participants) ||
      body.participants.length > 200 ||
      !Array.isArray(body.markers) ||
      body.markers.length > 200
    )
      throw fail("Aperçu limité à 200 participants et 200 repères.");
    if (preview.number === "2" && body.dateReviewed !== true)
      throw fail(
        "Le compte rendu n° 2 doit être vérifié séparément : confirmez sa date depuis la source.",
      );
    const participants = body.participants.map((p) => {
      if (!p || typeof p !== "object") throw fail("Participant invalide.");
      const name = String(p.name || "").trim();
      if (!name || name.length > 180 || !presenceValues.includes(p.presence))
        throw fail("Nom ou présence invalide.");
      return {
        name,
        presence: p.presence,
        role: String(p.role || "").slice(0, 300),
      };
    });
    if (
      new Set(participants.map((p) => nameKey(p.name))).size !==
      participants.length
    )
      throw fail(
        "Plusieurs lignes portent le même nom. Corrigez les doublons.",
      );
    const markers = body.markers.map((m) => {
      if (!m || typeof m !== "object" || typeof m.note !== "string")
        throw fail("Repère invalide.");
      if (
        !MARKER_TYPES.has(m.type) ||
        !CLASSIFICATIONS.has(m.classification) ||
        !String(m.note || "").trim() ||
        String(m.note).length > 2500 ||
        (m.dueDate && !exactDate(m.dueDate))
      )
        throw fail("Repère ou échéance invalide.");
      return {
        type: m.type,
        note: m.note.trim(),
        classification: m.classification,
        responsible: String(m.responsible || "")
          .trim()
          .slice(0, 180),
        dueDate: m.dueDate || "",
      };
    });
    if (
      !body.meetingId &&
      (!exactDate(body.date) ||
        !String(body.title || "").trim() ||
        String(body.title).length > 240 ||
        (preview.dateWarning && body.dateReviewed !== true))
    )
      throw fail(
        "Vérifiez le titre et la date, notamment les dates incohérentes du compte rendu n° 2.",
      );
    const client = await pool.connect();
    const id = body.meetingId || crypto.randomUUID();
    try {
      await client.query("BEGIN");
      // Verrou transactionnel : la même source ne crée jamais deux nouvelles réunions simultanément.
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [
        sourceHash(input.text.trim().normalize("NFC")),
      ]);
      if (!body.meetingId) {
        const duplicate = await client.query(
          "SELECT id FROM meetings WHERE report_draft->>'historicHash' IN ($1,$2) OR report_draft->>'archiveSourceHash'=$1 OR report_draft->>'archiveCanonicalHash'=$2",
          [preview.sourceHash, sourceHash(input.text.trim().normalize("NFC"))],
        );
        if (duplicate.rowCount)
          throw fail(
            "Cette source existe déjà. Choisissez son rattachement à la réunion existante.",
            409,
          );
        await client.query(
          "INSERT INTO meetings(id,title,meeting_date,meeting_type,status,report_draft,created_by,updated_by) VALUES($1,$2,$3,'Conseil de famille · archive','review',$4::jsonb,$5,$5)",
          [
            id,
            body.title.trim(),
            body.date,
            JSON.stringify({
              historicOriginal: input.text,
              archiveSourceHash: preview.sourceHash,
              archiveCanonicalHash: sourceHash(input.text.trim().normalize("NFC")),
              historicImport: true,
            }),
            user.id,
          ],
        );
      }
      const locked = await client.query(
        "SELECT report_draft FROM meetings WHERE id=$1 AND deleted_at IS NULL FOR UPDATE",
        [id],
      );
      if (!locked.rowCount)
        throw fail("Réunion introuvable ou dans la corbeille.", 404);
      if (
        body.meetingId &&
        !input.file &&
        sourceHash(locked.rows[0].report_draft?.historicOriginal || "") !==
          body.sourceHash
      )
        throw fail("Le texte source a changé. Rechargez l’aperçu.", 409);
      const reviewHash = sourceHash(
        JSON.stringify({
          sourceHash: preview.sourceHash,
          participants,
          markers,
          summary: body.summary,
          subjects: body.subjects,
        }),
      );
      const done = await client.query(
        "SELECT 1 FROM meeting_structure_reviews WHERE meeting_id=$1 AND review_hash=$2",
        [id, reviewHash],
      );
      if (done.rowCount) {
        await client.query("COMMIT");
        return (
          json(res, 200, { duplicate: true, meeting: await fullMeeting(id) }),
          true
        );
      }
      const existing = await client.query(
        "SELECT * FROM meeting_participants WHERE meeting_id=$1",
        [id],
      );
      for (const p of participants) {
        const found = existing.rows.filter(
          (old) => nameKey(old.name) === nameKey(p.name),
        );
        if (found.length > 1)
          throw fail(
            "Des homonymes ou doublons existent déjà. Corrigez-les dans la fiche avant la reprise.",
            409,
          );
        if (found.length)
          await client.query(
            "UPDATE meeting_participants SET name=$2,presence=$3,role=$4,updated_at=NOW() WHERE id=$1",
            [found[0].id, p.name, p.presence, p.role],
          );
        else
          await client.query(
            "INSERT INTO meeting_participants(id,meeting_id,name,presence,role) VALUES($1,$2,$3,$4,$5)",
            [crypto.randomUUID(), id, p.name, p.presence, p.role],
          );
      }
      const oldMarkers = await client.query(
        "SELECT * FROM meeting_markers WHERE meeting_id=$1",
        [id],
      );
      for (const m of markers) {
        const found = oldMarkers.rows.find(
          (old) => old.note.trim() === m.note && old.marker_type === m.type,
        );
        if (found)
          await client.query(
            "UPDATE meeting_markers SET classification=$2,responsible=$3,due_date=$4 WHERE id=$1",
            [found.id, m.classification, m.responsible, m.dueDate || null],
          );
        else {
          const markerId = crypto.randomUUID();
          await client.query(
            "INSERT INTO meeting_markers(id,meeting_id,marker_type,note,classification,responsible,due_date,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)",
            [
              markerId,
              id,
              m.type,
              m.note,
              m.classification,
              m.responsible,
              m.dueDate || null,
              user.id,
            ],
          );
          oldMarkers.rows.push({
            id: markerId,
            note: m.note,
            marker_type: m.type,
          });
        }
      }
      if (input.file)
        await client.query(
          "INSERT INTO meeting_sources(id,meeting_id,name,sha256,content) VALUES($1,$2,$3,$4,$5) ON CONFLICT(meeting_id,sha256) DO NOTHING",
          [
            crypto.randomUUID(),
            id,
            input.file.name,
            input.file.hash,
            input.file.content,
          ],
        );
      await client.query(
        "INSERT INTO meeting_structure_reviews(meeting_id,review_hash,reviewed_by) VALUES($1,$2,$3)",
        [id, reviewHash, user.id],
      );
      const draftPatch = {};
      for (const key of ["summary", "subjects"])
        if (body[key] !== undefined) {
          if (typeof body[key] !== "string" || body[key].length > 10000)
            throw fail("Synthèse ou sujets trop longs.");
          draftPatch[key] = body[key];
        }
      await client.query(
        "UPDATE meetings SET report_draft=report_draft || $3::jsonb,updated_at=NOW(),updated_by=$2 WHERE id=$1",
        [id, user.id, JSON.stringify(draftPatch)],
      );
      await audit(
        user,
        req,
        "meeting_structure_review",
        "meeting",
        id,
        null,
        {
          sourceHash: preview.sourceHash,
          participants: participants.length,
          markers: markers.length,
        },
        "ok",
        client,
      );
      await client.query("COMMIT");
      return (
        json(res, 200, { meeting: await fullMeeting(id), duplicate: false }),
        true
      );
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  };
}
