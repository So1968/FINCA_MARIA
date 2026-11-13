#!/usr/bin/env node
// Contrôle non destructif des jeux de sauvegardes chiffrées FINCA MARIA.
// Ne déchiffre pas les données, ne crée pas d'extraction et ne supprime rien.
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { lstat, readFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const STAMP = "[0-9]{8}T[0-9]{6}Z-[A-Za-z0-9]+";
const MANIFEST = new RegExp("^complete-(" + STAMP + ")\\.sha256$");
const ENCRYPTED = new RegExp("^(?:postgres|baul)-(" + STAMP + ")\\.(?:sql|tar)\\.gz\\.gpg$");
const CHECKSUM_LINE = /^([a-fA-F0-9]{64})  ([A-Za-z0-9._-]+)$/;

async function isRegularFile(file) {
  try {
    const stat = await lstat(file);
    return stat.isFile() && stat.size > 0;
  } catch {
    return false;
  }
}

async function hashFile(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

async function checkSet(dir, manifestName, stamp) {
  const errors = [];
  const expectedNames = [
    "postgres-" + stamp + ".sql.gz.gpg",
    "baul-" + stamp + ".tar.gz.gpg"
  ];
  let entries = [];
  const manifestPath = join(dir, manifestName);
  try {
    const info = await lstat(manifestPath);
    if (!info.isFile() || info.size === 0 || info.size > 4096) {
      errors.push("Manifeste absent, vide, trop volumineux ou non régulier");
    } else {
      entries = (await readFile(manifestPath, "utf8")).trim().split(/\r?\n/);
    }
  } catch {
    errors.push("Manifeste illisible");
  }

  const declared = new Map();
  if (entries.length !== expectedNames.length) {
    errors.push("Le manifeste doit décrire exactement deux archives");
  }
  for (const line of entries) {
    const match = CHECKSUM_LINE.exec(line);
    if (!match || !expectedNames.includes(match[2]) || declared.has(match[2])) {
      errors.push("Ligne de contrôle invalide ou archive inattendue");
      continue;
    }
    declared.set(match[2], match[1].toLowerCase());
  }
  for (const name of expectedNames) {
    if (!declared.has(name)) {
      errors.push("Empreinte manquante pour " + name);
      continue;
    }
    const filename = join(dir, name);
    if (!(await isRegularFile(filename))) {
      errors.push("Archive absente, vide ou non régulière : " + name);
      continue;
    }
    try {
      if ((await hashFile(filename)) !== declared.get(name)) {
        errors.push("Empreinte SHA-256 différente : " + name);
      }
    } catch {
      errors.push("Archive illisible pendant le contrôle : " + name);
    }
  }
  return { stamp, valid: errors.length === 0, errors };
}

export async function auditFincaBackupSets(directory) {
  const dir = resolve(directory);
  const names = await readdir(dir);
  const manifests = names.map((name) => {
    const match = MANIFEST.exec(name);
    return match ? { name, stamp: match[1] } : null;
  }).filter(Boolean).sort((a, b) => a.stamp.localeCompare(b.stamp));
  const results = [];
  for (const item of manifests) results.push(await checkSet(dir, item.name, item.stamp));
  const finishedStamps = new Set(manifests.map((item) => item.stamp));
  const orphans = names.filter((name) => {
    const match = ENCRYPTED.exec(name);
    return match && !finishedStamps.has(match[1]);
  }).sort();
  return {
    complete: results.filter((item) => item.valid).length,
    invalid: results.filter((item) => !item.valid).length,
    orphans,
    sets: results
  };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || args[0] === "--help") {
    process.stdout.write("Usage : node scripts/audit-finca-backups.mjs CHEMIN_DU_VOLUME_BACKUPS\n");
    process.stdout.write("Lecture seule : vérifie les paires chiffrées et les SHA-256 ; ne teste pas la restauration.\n");
    process.exitCode = args[0] === "--help" ? 0 : 2;
    return;
  }
  try {
    const result = await auditFincaBackupSets(args[0]);
    for (const item of result.sets) {
      process.stdout.write((item.valid ? "OK " : "ERREUR ") + item.stamp + "\n");
      for (const error of item.errors) process.stdout.write("  - " + error + "\n");
    }
    for (const orphan of result.orphans) process.stdout.write("INCOMPLET (sans manifeste) : " + orphan + "\n");
    process.stdout.write(
      "FINCA MARIA : " + result.complete + " sauvegarde(s) intacte(s), " +
      result.invalid + " jeu(x) invalide(s), " + result.orphans.length + " archive(s) sans manifeste.\n"
    );
    if (result.complete === 0 || result.invalid > 0 || result.orphans.length > 0) {
      process.exitCode = 1;
    }
  } catch (error) {
    process.stderr.write("Contrôle impossible : " + error.message + "\n");
    process.exitCode = 1;
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
