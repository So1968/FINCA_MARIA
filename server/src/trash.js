import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { processTrashFileCleanup } from "./trash-file-cleanup.js";

// Routes de corbeille communes. Tous les champs SQL sont issus d'une liste fermée.
const ITEMS = {
  reservation: { table: "reservations", label: "name" },
  meeting: { table: "meetings", label: "title" },
  document: { table: "baul_documents", label: "original_name" }
};
export function createTrashRouter({ pool, requireAdmin, requireFamilyUser, audit, readBody, json, baulRoot }) {
  async function run(req, res, url) {
    if (!url.pathname.startsWith("/api/trash")) return false;
    if (url.pathname === "/api/trash" && req.method === "GET") {
      await requireFamilyUser(req);
      const data = {};
      for (const [kind, spec] of Object.entries(ITEMS)) {
        const result = await pool.query(
          `SELECT t.id,t.${spec.label} AS label,t.deleted_at,t.deleted_by,u.display_name AS deleted_by_name
             FROM ${spec.table} t LEFT JOIN users u ON u.id=t.deleted_by
            WHERE t.deleted_at IS NOT NULL ORDER BY t.deleted_at DESC LIMIT 500`
        );
        data[kind] = result.rows;
      }
      return json(res, 200, { items: data });
    }
    if (url.pathname === "/api/trash/manage" && req.method === "GET") {
      const actor = await requireAdmin(req);
      if (!actor.roles.includes("admin-projet")) return json(res, 403, { error: "Réservé à l'administration familiale" });
      const data = {};
      for (const [kind, spec] of Object.entries(ITEMS)) {
        const result = await pool.query(
          `SELECT id,${spec.label} AS label FROM ${spec.table} WHERE deleted_at IS NULL ORDER BY id LIMIT 500`
        );
        data[kind] = result.rows;
      }
      return json(res, 200, { active: data });
    }
    if (url.pathname === "/api/trash/history" && req.method === "GET") {
      await requireFamilyUser(req);
      const receipts = await pool.query(
        `SELECT p.kind,p.object_id,p.item_summary,p.purged_at,
                COALESCE(a.display_name, 'Compte historique') AS purged_by_name,
                COALESCE(d.display_name, 'Compte historique') AS deleted_by_name
           FROM trash_purge_receipts p
           LEFT JOIN users a ON a.id=p.purged_by
           LEFT JOIN users d ON d.id=p.deleted_by
          ORDER BY p.purged_at DESC LIMIT 500`
      );
      return json(res,200,{receipts:receipts.rows});
    }
    if (url.pathname === "/api/trash/cleanup" && req.method === "GET") {
      const actor = await requireAdmin(req);
      if (!actor.roles.includes("admin-projet")) return json(res,403,{error:"Réservé à l'administration familiale"});
      const pending = await pool.query(
        "SELECT id,kind,object_id,queued_at,last_error FROM trash_file_cleanup WHERE processed_at IS NULL ORDER BY queued_at LIMIT 300"
      );
      return json(res,200,{ pending:pending.rows });
    }
    if (url.pathname === "/api/trash/cleanup/retry" && req.method === "POST") {
      const actor = await requireAdmin(req);
      if (!actor.roles.includes("admin-projet")) return json(res,403,{error:"Réservé à l'administration familiale"});
      const summary = await processTrashFileCleanup(pool, baulRoot);
      await audit(actor, req, "trash_cleanup_retry", "trash", "pending", null, summary);
      return json(res,200,{ok:true,summary});
    }
    const match = url.pathname.match(/^\/api\/trash\/(reservation|meeting|document)\/([^/]+)\/(delete|restore|purge)$/);
    if (!match || req.method !== "POST") return json(res, 404, { error: "Route de corbeille inconnue" });
    const admin = await requireAdmin(req);
    if (!admin.roles.includes("admin-projet")) return json(res, 403, { error: "Opération réservée à l'administrateur familial" });
    const [, kind, encodedId, action] = match;
    const id = decodeURIComponent(encodedId);
    if (!id || id.length > 256) return json(res, 400, { error: "Identifiant invalide" });
    const spec = ITEMS[kind];
    const body = await readBody(req);
    if (action === "purge") {
      // Une purge des fichiers et enregistrements exige un contrôle explicite
      // des sauvegardes : des copies chiffrées peuvent persister jusqu'à leur expiration.
      if (kind !== "reservation" && body.backupReviewed !== true) {
        return json(res, 400, { error: "Contrôle des sauvegardes obligatoire avant purge" });
      }
      if (body.confirmation !== "VIDER DEFINITIVEMENT" || body.itemId !== id || body.kind !== kind || body.reviewed !== true) {
        return json(res, 400, { error: "Confirmation explicite de la purge requise" });
      }
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const found = await client.query(`SELECT * FROM ${spec.table} WHERE id=$1 FOR UPDATE`, [id]);
      if (!found.rowCount) {
        await client.query("ROLLBACK");
        return json(res, 404, { error: "Élément introuvable" });
      }
      const before = found.rows[0];
      if (action === "delete" && before.deleted_at || action !== "delete" && !before.deleted_at) {
        await client.query("ROLLBACK");
        return json(res, 409, { error: "État incompatible avec cette opération" });
      }
      if (action === "restore" && kind === "document") {
        // Ne jamais restaurer une fiche dont le fichier physique est absent
        // ou différent de celui dont l'empreinte est enregistrée.
        const root = path.resolve(baulRoot);
        const physical = path.resolve(root, String(before.storage_path || ""));
        if (physical === root || !physical.startsWith(root + path.sep)) {
          await client.query("ROLLBACK");
          return json(res, 409, { error: "Chemin du document invalide : restauration bloquée" });
        }
        let content;
        try {
          const realRoot = await fs.realpath(root);
          const realFile = await fs.realpath(physical);
          if (!realFile.startsWith(realRoot + path.sep)) {
            await client.query("ROLLBACK");
            return json(res, 409, { error: "Document situé hors du BAÚL : restauration bloquée" });
          }
          content = await fs.readFile(realFile);
        } catch {
          await client.query("ROLLBACK");
          return json(res, 409, { error: "Fichier absent du BAÚL : restauration bloquée" });
        }
        const digest = crypto.createHash("sha256").update(content).digest("hex");
        if (digest !== before.sha256 || content.length !== Number(before.size_bytes)) {
          await client.query("ROLLBACK");
          return json(res, 409, { error: "Intégrité du fichier incorrecte : restauration bloquée" });
        }
      }
      if (action === "restore" && kind === "reservation") {
        const conflict = await client.query(
          `SELECT id FROM reservations WHERE id <> $1 AND deleted_at IS NULL AND place=$2
            AND arrival < $4::date AND departure > $3::date LIMIT 1 FOR UPDATE`,
          [id, before.place, before.arrival, before.departure]
        );
        if (conflict.rowCount) {
          await client.query("ROLLBACK");
          return json(res, 409, { error: "Une autre réservation occupe déjà cette période" });
        }
      }
      if (action === "purge" && kind === "meeting" && ["recording", "transcribing"].includes(before.status)) {
        await client.query("ROLLBACK");
        return json(res,409,{error:"Réunion en cours d'enregistrement ou de transcription : arrêter avant purge"});
      }
      if (action === "purge" && kind === "document") {
        const links = await client.query(
          "SELECT id FROM meeting_links WHERE kind='document' AND target_ref=$1 LIMIT 1", [id]
        );
        if (links.rowCount) {
          await client.query("ROLLBACK");
          return json(res,409,{error:"Document associé à une réunion : retirer d'abord ses références"});
        }
        const root = path.resolve(baulRoot);
        const absolute = path.resolve(root, String(before.storage_path || ""));
        if (absolute === root || !absolute.startsWith(root + path.sep)) {
          await client.query("ROLLBACK");
          return json(res,409,{error:"Chemin du fichier invalide : purge refusée"});
        }
        await client.query(
          "INSERT INTO trash_file_cleanup(kind,object_id,relative_path,file_kind) VALUES ('document',$1,$2,'file')",
          [id, before.storage_path]
        );
      }
      if (action === "purge" && kind === "meeting") {
        // Le répertoire dédié contient l'audio final, les segments et les fichiers
        // temporaires de cette seule réunion. Les documents liés restent intacts.
        if (!/^[0-9a-f-]{36}$/.test(id)) {
          await client.query("ROLLBACK");
          return json(res,409,{error:"Identifiant réunion non conforme : purge refusée"});
        }
        await client.query(
          "INSERT INTO trash_file_cleanup(kind,object_id,relative_path,file_kind) VALUES ('meeting',$1,$2,'directory')",
          [id, path.join("meetings", id)]
        );
      }
      if (action === "purge") {
        await client.query(
          `INSERT INTO trash_purge_receipts(kind,object_id,deleted_by,purged_by,item_summary)
           VALUES ($1,$2,$3,$4,$5)`,
          [kind, id, before.deleted_by, admin.id, String(before[spec.label]).slice(0, 300)]
        );
        await audit(admin, req, "trash_permanent_purge", kind, id,
          { id, label: before[spec.label], deleted_at: before.deleted_at, deleted_by: before.deleted_by },
          { permanent: true }, "ok", client);
        await client.query(`DELETE FROM ${spec.table} WHERE id=$1`, [id]);
      } else {
        const updated = await client.query(
          action === "delete"
            ? `UPDATE ${spec.table} SET deleted_at=NOW(),deleted_by=$2 WHERE id=$1 RETURNING *`
            : `UPDATE ${spec.table} SET deleted_at=NULL,deleted_by=NULL WHERE id=$1 RETURNING *`,
          action === "delete" ? [id,admin.id] : [id]
        );
        await audit(admin,req,action==="delete"?"trash_soft_delete":"trash_restore",
          kind,id,before,updated.rows[0],"ok",client);
      }
      await client.query("COMMIT");
      if (action === "purge" && kind !== "reservation") {
        // PostgreSQL est déjà validé : un échec ultérieur du disque ne doit
        // pas tenter de revenir en arrière ni cacher que la purge a eu lieu.
        let cleanup;
        try { cleanup = await processTrashFileCleanup(pool, baulRoot); }
        catch { cleanup = { processed:0, failed:1 }; }
        return json(res,200,{ok:true,kind,id,action,cleanup,pendingCleanup:cleanup.failed > 0});
      }
      return json(res,200,{ok:true,kind,id,action});
    } catch(error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {client.release();}
  }
  return async (req, res, url) => {
    if (!url.pathname.startsWith("/api/trash")) return false;
    await run(req, res, url);
    return true;
  };
}
