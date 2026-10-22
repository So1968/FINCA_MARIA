import fs from "node:fs/promises";
import path from "node:path";

function managedPath(root, relative) {
  if (typeof relative !== "string" || !relative || path.isAbsolute(relative) || relative.includes("\0")) {
    throw new Error("Chemin de suppression invalide");
  }
  const base = path.resolve(root);
  const absolute = path.resolve(base, relative);
  if (!absolute.startsWith(base + path.sep)) throw new Error("Chemin de suppression hors BAÚL");
  return { base, absolute };
}

async function removeManagedPath(root, relative, kind) {
  const { base, absolute } = managedPath(root, relative);
  let stat;
  try { stat = await fs.lstat(absolute); } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const realRoot = await fs.realpath(base);
  const realParent = await fs.realpath(path.dirname(absolute));
  if (realParent !== realRoot && !realParent.startsWith(realRoot + path.sep)) {
    throw new Error("Chemin physique hors BAÚL");
  }
  if (stat.isSymbolicLink()) throw new Error("Suppression bloquée : lien symbolique");
  if (kind === "file") {
    if (!stat.isFile()) throw new Error("Fichier attendu, chemin non régulier");
    await fs.unlink(absolute);
  } else if (kind === "directory") {
    if (!stat.isDirectory()) throw new Error("Dossier attendu, chemin non régulier");
    const realTarget = await fs.realpath(absolute);
    if (!realTarget.startsWith(realRoot + path.sep)) throw new Error("Dossier hors BAÚL");
    await fs.rm(absolute, { recursive: true, force: false });
  } else {
    throw new Error("Type de suppression non autorisé");
  }
}

// Une défaillance disque ou une interruption n'efface pas la demande de purge.
// Les demandes sont rejouables, et un chemin manquant signifie qu'il a déjà été supprimé.
export async function processTrashFileCleanup(pool, baulRoot, limit = 100) {
  const max = Math.max(1, Math.min(100, Number(limit) || 100));
  const pending = await pool.query(
    "SELECT id,relative_path,file_kind FROM trash_file_cleanup WHERE processed_at IS NULL ORDER BY id LIMIT $1",
    [max]
  );
  const summary = { processed: 0, failed: 0 };
  for (const job of pending.rows) {
    try {
      await removeManagedPath(baulRoot, job.relative_path, job.file_kind);
      await pool.query("UPDATE trash_file_cleanup SET processed_at=NOW(),last_error=NULL WHERE id=$1", [job.id]);
      summary.processed++;
    } catch (error) {
      await pool.query("UPDATE trash_file_cleanup SET last_error=$2 WHERE id=$1", [
        job.id, String(error.message || "Échec de suppression").slice(0, 350)
      ]);
      summary.failed++;
    }
  }
  return summary;
}
