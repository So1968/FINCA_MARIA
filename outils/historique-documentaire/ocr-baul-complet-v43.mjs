#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BAUL = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");
const SOURCE = path.join(BAUL, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB");
const CACHE = path.join(BAUL, "_CACHE_OCR_COMPLET_V43");
const OUTPUT = path.join(BAUL, "_OCR_COMPLET_V43.json");
const REPORT = path.join(BAUL, "_RAPPORT_OCR_COMPLET_V43.md");
const VERSION = "v43-tesseract-psm1-spa-fra-eng";

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"]);
const TEXT_EXT = new Set([".txt", ".md", ".csv", ".json", ".log"]);

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(p));
    else if (entry.isFile()) out.push(p);
  }
  return out.sort((a, b) => a.localeCompare(b, "fr"));
}

async function existsCommand(cmd) {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${cmd}`]);
    return true;
  } catch { return false; }
}

async function run(cmd, args, maxBuffer = 64 * 1024 * 1024) {
  const { stdout } = await execFileAsync(cmd, args, { encoding: "utf-8", maxBuffer });
  return String(stdout || "");
}

function sha256(file) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(file));
  return h.digest("hex");
}

function cacheFile(hash) { return path.join(CACHE, `${hash}.json`); }
function readCache(hash) {
  const p = cacheFile(hash);
  if (!fs.existsSync(p)) return null;
  try {
    const x = JSON.parse(fs.readFileSync(p, "utf-8"));
    return x.version === VERSION ? x.result : null;
  } catch { return null; }
}
function writeCache(hash, result) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cacheFile(hash), JSON.stringify({ version: VERSION, result }, null, 2));
}

async function ocrImage(file) {
  const text = (await run("tesseract", [file, "stdout", "-l", "spa+fra+eng", "--psm", "1"])).trim();
  return {
    method: "tesseract_psm1_spa_fra_eng",
    status: text.length >= 20 ? "OCR_OK" : (text.length ? "OCR_FAIBLE" : "AUCUN_TEXTE_DETECTE"),
    text
  };
}

async function readPdf(file, caps) {
  if (caps.pdftotext) {
    const native = (await run("pdftotext", ["-layout", "-nopgbrk", file, "-"])).trim();
    if (native.length >= 30) return { method: "pdftotext", status: "TEXTE_PDF_OK", text: native };
  }
  if (!caps.pdftoppm || !caps.tesseract) return { method: "pdf", status: "OCR_PDF_INDISPONIBLE", text: "" };

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cortijo-v43-"));
  const prefix = path.join(tmp, "page");
  try {
    await run("pdftoppm", ["-jpeg", "-r", "180", file, prefix]);
    const imgs = fs.readdirSync(tmp).filter(n => n.toLowerCase().endsWith(".jpg")).sort();
    const parts = [];
    for (let i = 0; i < imgs.length; i++) {
      const t = (await run("tesseract", [path.join(tmp, imgs[i]), "stdout", "-l", "spa+fra+eng", "--psm", "1"])).trim();
      parts.push(`--- PAGE ${i + 1} ---\n${t}`);
    }
    const text = parts.join("\n\n");
    return { method: "pdftoppm+tesseract_psm1", status: text.replace(/--- PAGE \d+ ---/g, "").trim().length ? "OCR_OK" : "AUCUN_TEXTE_DETECTE", text };
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

async function readOne(file, caps) {
  const ext = path.extname(file).toLowerCase();
  if (IMAGE_EXT.has(ext)) {
    if (!caps.tesseract) return { method: "image", status: "TESSERACT_INDISPONIBLE", text: "" };
    return ocrImage(file);
  }
  if (ext === ".pdf") return readPdf(file, caps);
  if (TEXT_EXT.has(ext)) return { method: "texte_natif", status: "TEXTE_OK", text: fs.readFileSync(file, "utf-8") };
  return { method: "non_pris_en_charge", status: "FORMAT_NON_PRIS_EN_CHARGE", text: "" };
}

function persist(payload) {
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
}

async function main() {
  if (!fs.existsSync(SOURCE)) throw new Error(`Dossier originaux introuvable : ${SOURCE}`);

  const caps = {
    tesseract: await existsCommand("tesseract"),
    pdftotext: await existsCommand("pdftotext"),
    pdftoppm: await existsCommand("pdftoppm")
  };
  if (!caps.tesseract) throw new Error("Tesseract est introuvable.");

  const files = walk(SOURCE);
  const results = [];
  const byHash = new Map();
  const startedAt = new Date().toISOString();

  console.log("=== FINCA MARIA — OCR COMPLET V43 ===");
  console.log("Source :", SOURCE);
  console.log("Fichiers trouvés :", files.length);
  console.log("Langues OCR : spa+fra+eng");
  console.log("Mode : psm 1 / orientation automatique");
  console.log("Originaux modifiés : NON");
  console.log("Elements touché : NON");
  console.log("");

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const relativePath = path.relative(SOURCE, file).split(path.sep).join("/");
    const stat = fs.statSync(file);
    let hash = "";
    let result;
    try {
      hash = sha256(file);
      if (byHash.has(hash)) {
        const first = byHash.get(hash);
        result = { ...first.result, reusedExactDuplicate: true, duplicateOf: first.relativePath };
      } else {
        const cached = readCache(hash);
        result = cached ? { ...cached, resumedFromV43Cache: true } : await readOne(file, caps);
        if (!cached) writeCache(hash, result);
        byHash.set(hash, { relativePath, result });
      }
    } catch (error) {
      result = { method: "erreur", status: "ERREUR", text: "", error: String(error?.message || error) };
    }

    const row = {
      relativePath,
      extension: path.extname(file).toLowerCase(),
      bytes: stat.size,
      sha256: hash,
      method: result.method,
      status: result.status,
      chars: String(result.text || "").length,
      text: String(result.text || ""),
      ...(result.error ? { error: result.error } : {}),
      ...(result.reusedExactDuplicate ? { reusedExactDuplicate: true, duplicateOf: result.duplicateOf } : {}),
      ...(result.resumedFromV43Cache ? { resumedFromV43Cache: true } : {})
    };
    results.push(row);

    if ((i + 1) % 10 === 0 || i === 0 || i === files.length - 1 || row.status === "ERREUR") {
      console.log(`[${i + 1}/${files.length}] ${row.status} — ${relativePath}`);
      persist({ version: 43, startedAt, updatedAt: new Date().toISOString(), source: SOURCE, capabilities: caps, processed: results.length, total: files.length, documents: results });
    }
  }

  const counts = {};
  for (const r of results) counts[r.status] = (counts[r.status] || 0) + 1;
  const payload = {
    version: 43,
    startedAt,
    finishedAt: new Date().toISOString(),
    source: SOURCE,
    totalFiles: files.length,
    counts,
    safeguards: {
      originalsModified: false,
      originalsMoved: false,
      originalsRenamed: false,
      elementsTouched: false,
      githubContainsPrivateOcrText: false
    },
    documents: results
  };
  persist(payload);

  const lines = [
    "# FINCA MARIA — OCR complet V43",
    "",
    `Fichiers parcourus : **${files.length}**`,
    "",
    "## Résultats",
    "",
    ...Object.entries(counts).sort().map(([k, v]) => `- **${k}** : ${v}`),
    "",
    "## Sécurité",
    "",
    "- Aucun original déplacé, renommé ou modifié.",
    "- Le disque Elements n'est jamais parcouru.",
    "- Le texte OCR reste uniquement dans le BAÚL privé local ; il n'est pas envoyé sur GitHub.",
    "- Une image sans texte est marquée AUCUN_TEXTE_DETECTE, pas 'document inconnu'.",
    "",
    `Index OCR : \`${OUTPUT}\``
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("\n=== OCR COMPLET V43 TERMINÉ ===");
  console.log("Fichiers :", files.length);
  for (const [k, v] of Object.entries(counts).sort()) console.log(`${k} : ${v}`);
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
}

main().catch((error) => {
  console.error("ERREUR V43 :", error.message || error);
  process.exitCode = 1;
});
