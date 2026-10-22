import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

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
      // Refuser les documents et réunions tant que leurs fichiers et dépendances
      // n'ont pas été intégrés à la procédure de purge contrôlée.
      if (kind !== "reservation") return json(res, 409, {
        error: "Purge définitive bloquée : sauvegardes et fichiers associés à contrôler avant implémentation"
      });
      if (body.confirmation !== "VIDER DEFINITIVEMENT" || body.itemId !== id || body.kind !== kind) {
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
        try { content = await fs.readFile(physical); } catch {
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
