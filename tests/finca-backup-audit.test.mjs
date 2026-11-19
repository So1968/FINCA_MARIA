import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, symlink, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { auditFincaBackupSets } from "../scripts/audit-finca-backups.mjs";

const STAMP = "20261113T150000Z-ABC123";
const SQL = "postgres-" + STAMP + ".sql.gz.gpg";
const BAUL = "baul-" + STAMP + ".tar.gz.gpg";
const MANIFEST = "complete-" + STAMP + ".sha256";
const cli = fileURLToPath(new URL("../scripts/audit-finca-backups.mjs", import.meta.url));
const digest = (value) => createHash("sha256").update(value).digest("hex");

async function withBackupFixture(callback) {
  const dir = await mkdtemp(join(tmpdir(), "finca-backup-audit-"));
  const sql = Buffer.from("Chiffrement factice de la base de test", "utf8");
  const baul = Buffer.from("Chiffrement factice du BAUL de test", "utf8");
  await writeFile(join(dir, SQL), sql);
  await writeFile(join(dir, BAUL), baul);
  await writeFile(join(dir, MANIFEST), digest(sql) + "  " + SQL + "\n" + digest(baul) + "  " + BAUL + "\n");
  try {
    await callback(dir, { sql, baul });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("une paire chiffrée avec manifeste correct est reconnue intacte, sans déchiffrement", async () => {
  await withBackupFixture(async (dir) => {
    const namesBefore = await readdir(dir);
    const before = await readFile(join(dir, SQL));
    const result = await auditFincaBackupSets(dir);
    assert.equal(result.complete, 1);
    assert.equal(result.invalid, 0);
    assert.deepEqual(result.orphans, []);
    assert.deepEqual(await readdir(dir), namesBefore, "Le contrôle ne doit pas modifier le dossier");
    assert.deepEqual(await readFile(join(dir, SQL)), before, "Le contrôle ne doit pas modifier les archives");
    const cliResult = spawnSync(process.execPath, [cli, dir], { encoding: "utf8" });
    assert.equal(cliResult.status, 0, cliResult.stderr);
    assert.match(cliResult.stdout, /1 sauvegarde\(s\) intacte\(s\)/);
  });
});

test("une archive modifiée est signalée sans suppression ni réparation automatique", async () => {
  await withBackupFixture(async (dir) => {
    await writeFile(join(dir, BAUL), "fichier abîmé");
    const result = await auditFincaBackupSets(dir);
    assert.equal(result.invalid, 1);
    assert.match(result.sets[0].errors.join(" "), /Empreinte SHA-256 différente/);
    assert.equal((await readFile(join(dir, BAUL), "utf8")), "fichier abîmé");
    const cliResult = spawnSync(process.execPath, [cli, dir], { encoding: "utf8" });
    assert.equal(cliResult.status, 1);
  });
});

test("l'absence d'une des deux archives interdit le statut complet", async () => {
  await withBackupFixture(async (dir) => {
    await unlink(join(dir, SQL));
    const result = await auditFincaBackupSets(dir);
    assert.equal(result.complete, 0);
    assert.equal(result.invalid, 1);
    assert.match(result.sets[0].errors.join(" "), /Archive absente/);
  });
});

test("un manifeste mal formé, une entrée inconnue et un doublon sont rejetés", async () => {
  await withBackupFixture(async (dir) => {
    const content = await readFile(join(dir, MANIFEST), "utf8");
    const line = content.split("\n")[0];
    await writeFile(join(dir, MANIFEST), line + "\n" + line + "\n");
    assert.equal((await auditFincaBackupSets(dir)).invalid, 1);
    await writeFile(join(dir, MANIFEST), digest("x") + "  ../../secret.txt\n" + line + "\n");
    assert.equal((await auditFincaBackupSets(dir)).invalid, 1);
  });
});

test("une archive isolée sans manifeste est détectée, jamais effacée", async () => {
  await withBackupFixture(async (dir) => {
    const orphan = "baul-20261114T010000Z-XYZ999.tar.gz.gpg";
    await writeFile(join(dir, orphan), "archive interrompue");
    const result = await auditFincaBackupSets(dir);
    assert.equal(result.complete, 1);
    assert.deepEqual(result.orphans, [orphan]);
    assert.equal(spawnSync(process.execPath, [cli, dir]).status, 1);
    assert.equal((await readFile(join(dir, orphan), "utf8")), "archive interrompue");
  });
});

test("un lien symbolique n'est pas accepté comme archive régulière", async () => {
  await withBackupFixture(async (dir) => {
    await unlink(join(dir, SQL));
    await symlink(join(dir, BAUL), join(dir, SQL));
    const result = await auditFincaBackupSets(dir);
    assert.equal(result.invalid, 1);
    assert.match(result.sets[0].errors.join(" "), /non régulière/);
  });
});

test("dossier vide : aucune sauvegarde vérifiée et code de sortie non nul", async () => {
  const dir = await mkdtemp(join(tmpdir(), "finca-empty-backup-"));
  try {
    assert.equal((await auditFincaBackupSets(dir)).complete, 0);
    assert.equal(spawnSync(process.execPath, [cli, dir]).status, 1);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});
