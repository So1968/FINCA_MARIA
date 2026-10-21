#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INDEX = path.join(ROOT, "_INDEX_BAUL.json");
const OUTPUT = path.join(ROOT, "_AUDIT_SURFACES_PARCELLES_V32.json");
const REPORT = path.join(ROOT, "_RAPPORT_AUDIT_SURFACES_PARCELLES_V32.md");
const OCR_CACHE = path.join(ROOT, "_CACHE_OCR_V32_SURFACES");

const ANALYSIS_CANDIDATES = [
  "_ANALYSE_EXPLOITATION_V18.json",
  "_ANALYSE_EXPLOITATION_V17.json",
  "_ANALYSE_EXPLOITATION_V7.json",
  "_ANALYSE_EXPLOITATION_V3.json",
  "_ANALYSE_EXPLOITATION_V2.json"
].map((name) => path.join(ROOT, name));

const IMAGE_EXTS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"]);
const KEYWORDS = [
  "sigpac", "solicitud unica", "solicitud única", "pac", "parcela", "recinto",
  "superficie", "hectarea", "hectárea", "hectareas", "hectáreas", " ha ",
  "olivar", "olivo", "olivos", "aceituna", "cereal", "cereales", "trigo", "cebada",
  "tierra arable", "labor", "secano", "uso", "cultivo", "cultivos"
];
const SURFACE_CROP_TERMS = [
  "superficie", "hectarea", "hectárea", "hectareas", "hectáreas", " ha ",
  "recinto", "parcela", "sigpac", "olivar", "olivo", "olivos", "aceituna",
  "cereal", "cereales", "trigo", "cebada", "tierra arable", "labor", "secano",
  "uso", "cultivo", "cultivos"
];

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function insideRoot(candidate) {
  const c = path.resolve(candidate);
  const r = path.resolve(ROOT);
  return c === r || c.startsWith(`${r}${path.sep}`);
}

function portable(relativePath) {
  const candidate = path.resolve(ROOT, String(relativePath || "").split("/").join(path.sep));
  if (!insideRoot(candidate)) throw new Error("Chemin hors BAÚL refusé.");
  return candidate;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function analysisFile() {
  return ANALYSIS_CANDIDATES.find((f) => fs.existsSync(f)) || "";
}

function scannerKey(name) {
  const base = path.basename(String(name || ""), path.extname(String(name || "")))
    .replace(/\s*\(\d+\)\s*$/i, "")
    .trim();
  const m = base.match(/^(CamScanner\s+\d{2}-\d{2}-\d{4}\s+\d{2}\.\d{2})(?:_\d+)?$/i);
  return m ? m[1] : `SINGLE::${base}`;
}

function resolveFile(doc) {
  const candidates = [];
  if (doc.currentRelativePath) candidates.push(portable(doc.currentRelativePath));
  if (doc.originalRelativePath) candidates.push(portable(doc.originalRelativePath));
  if (doc.storedName) candidates.push(path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", doc.storedName));
  const found = candidates.find((f) => insideRoot(f) && fs.existsSync(f));
  if (!found) throw new Error("Fichier BAÚL introuvable.");
  return found;
}

async function existsCommand(command) {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, maxBuffer = 32 * 1024 * 1024) {
  const { stdout } = await execFileAsync(command, args, { encoding: "utf-8", maxBuffer });
  return String(stdout || "");
}

function cacheFile(file) {
  const st = fs.statSync(file);
  const key = crypto.createHash("sha256").update(`${file}|${st.size}|${Math.trunc(st.mtimeMs)}`).digest("hex");
  return path.join(OCR_CACHE, `${key}.txt`);
}

async function readFullText(file, capabilities) {
  const cache = cacheFile(file);
  if (fs.existsSync(cache)) return { text: fs.readFileSync(cache, "utf-8"), method: "cache_v32" };

  const ext = path.extname(file).toLowerCase();
  let text = "";
  let method = "";

  if (IMAGE_EXTS.has(ext) && capabilities.tesseract) {
    text = await run("tesseract", [file, "stdout", "-l", "spa+fra+eng", "--psm", "1"]);
    method = "tesseract_psm1_cible";
  } else if (ext === ".pdf") {
    if (capabilities.pdftotext) {
      text = await run("pdftotext", ["-layout", "-nopgbrk", file, "-"]);
      method = "pdftotext";
    }
    if (text.trim().length < 30 && capabilities.pdftoppm && capabilities.tesseract) {
      const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cortijo-v32-"));
      const prefix = path.join(tmp, "page");
      try {
        await run("pdftoppm", ["-f", "1", "-l", "20", "-jpeg", "-r", "180", file, prefix]);
        const imgs = fs.readdirSync(tmp).filter((n) => n.endsWith(".jpg")).sort();
        const parts = [];
        for (const img of imgs) {
          parts.push(await run("tesseract", [path.join(tmp, img), "stdout", "-l", "spa+fra+eng", "--psm", "1"]));
        }
        text = parts.join("\n\n--- PAGE ---\n\n");
        method = "pdftoppm+tesseract_psm1_cible";
      } finally {
        fs.rmSync(tmp, { recursive: true, force: true });
      }
    }
  } else if ([".txt", ".md", ".csv", ".json", ".log"].includes(ext)) {
    text = fs.readFileSync(file, "utf-8");
    method = "texte_local";
  }

  fs.mkdirSync(OCR_CACHE, { recursive: true });
  fs.writeFileSync(cache, text, "utf-8");
  return { text, method: method || "non_lu" };
}

function matchedLines(text) {
  const lines = String(text || "").split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i++) {
    const n = norm(lines[i]);
    if (!SURFACE_CROP_TERMS.some((k) => n.includes(norm(k)))) continue;
    const from = Math.max(0, i - 2);
    const to = Math.min(lines.length - 1, i + 2);
    hits.push({
      line: i + 1,
      context: lines.slice(from, to + 1).join("\n").trim()
    });
  }
  const unique = [];
  const seen = new Set();
  for (const hit of hits) {
    if (!hit.context || seen.has(hit.context)) continue;
    seen.add(hit.context);
    unique.push(hit);
  }
  return unique.slice(0, 80);
}

function candidateFromAnalysis(a) {
  const text = `${a.originalName || ""}\n${a.type || ""}\n${a.entity?.code || ""}\n${a.suggestedCategory || ""}\n${a.reading?.textExcerpt || ""}`;
  const n = norm(text);
  return a.type === "PLAN_PARCELLE"
    || a.entity?.code === "PAC_ADMINISTRATION"
    || a.suggestedCategory === "pac"
    || a.suggestedCategory === "plans"
    || KEYWORDS.some((k) => n.includes(norm(k)));
}

async function main() {
  if (!fs.existsSync(INDEX)) throw new Error(`Index introuvable : ${INDEX}`);
  const index = readJson(INDEX);
  const docs = Array.isArray(index.documents) ? index.documents : [];
  const byId = new Map(docs.map((d) => [d.id, d]));
  const byName = new Map(docs.map((d) => [d.originalName, d]));

  const af = analysisFile();
  if (!af) throw new Error("Aucune analyse BAÚL V2/V3/V7/V17/V18 trouvée.");
  const analysis = readJson(af);
  const analyzed = Array.isArray(analysis.documents) ? analysis.documents : [];

  const seed = analyzed.filter(candidateFromAnalysis);
  const keys = new Set(seed.map((a) => scannerKey(a.originalName)));

  // Ajoute les pages voisines du même lot CamScanner : un plan ou tableau peut être une annexe sans mots-clés sur chaque page.
  const selectedDocs = docs.filter((d) => keys.has(scannerKey(d.originalName)));
  for (const a of seed) {
    const d = byId.get(a.documentId) || byName.get(a.originalName);
    if (d && !selectedDocs.some((x) => x.id === d.id)) selectedDocs.push(d);
  }

  const capabilities = {
    tesseract: await existsCommand("tesseract"),
    pdftotext: await existsCommand("pdftotext"),
    pdftoppm: await existsCommand("pdftoppm")
  };

  console.log("=== FINCA MARIA — AUDIT SURFACES / PARCELLES V32 ===");
  console.log("Analyse source :", path.basename(af));
  console.log("Documents ciblés :", selectedDocs.length);
  console.log("But : retrouver la répartition réelle olivier / céréales / autres usages AVANT tout calcul kg/ha.");
  console.log("Aucun original ni copie classée ne sera modifié.\n");

  const results = [];
  let i = 0;
  for (const doc of selectedDocs.sort((a,b)=>String(a.originalName).localeCompare(String(b.originalName)))) {
    i++;
    try {
      const file = resolveFile(doc);
      const reading = await readFullText(file, capabilities);
      const hits = matchedLines(reading.text);
      if (!hits.length) continue;
      const result = {
        documentId: doc.id,
        originalName: doc.originalName,
        method: reading.method,
        matchedLines: hits,
        fullText: String(reading.text || "").slice(0, 300000)
      };
      results.push(result);
      console.log(`--- ${doc.originalName} ---`);
      for (const hit of hits.slice(0, 20)) console.log(`[L${hit.line}] ${hit.context.replace(/\n/g, " | ")}`);
      console.log("");
    } catch (error) {
      console.log(`[${i}/${selectedDocs.length}] ${doc.originalName} — ERREUR : ${error.message}`);
    }
  }

  const payload = {
    version: 32,
    generatedAt: new Date().toISOString(),
    basedOnAnalysis: af,
    purpose: "Relire uniquement les pièces PAC/SIGPAC/plans/parcelles et leurs annexes pour établir la surface oléicole réelle, la surface céréalière et les autres usages avant tout calcul agronomique par hectare.",
    safeguards: {
      totalCadastralAreaIsNotAssumedOliveArea: true,
      noYieldPerHectareCalculated: true,
      noBroadOcrRerun: true,
      originalsModified: false,
      classifiedCopiesModified: false
    },
    candidatesSelected: selectedDocs.length,
    documentsWithSurfaceCropEvidence: results.length,
    documents: results
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const md = [
    "# FINCA MARIA — Audit surfaces / parcelles V32",
    "",
    "**Règle de correction : la superficie cadastrale totale ne doit jamais être assimilée à la superficie oléicole.**",
    "",
    `- Pièces ciblées : **${selectedDocs.length}**`,
    `- Pièces contenant des indices surface/culture : **${results.length}**`,
    "",
    ...results.flatMap((r) => [
      `## ${r.originalName}`,
      "",
      ...r.matchedLines.map((h) => `- L${h.line} — ${h.context.replace(/\n/g, " / ")}`),
      ""
    ]),
    "Aucun calcul kg/ha n'est produit dans V32. Les surfaces olivier/céréales ne seront retenues qu'après lecture des lignes du document qui les établissent."
  ].join("\n");
  fs.writeFileSync(REPORT, md + "\n", "utf-8");

  console.log("=== FIN V32 ===");
  console.log("Pièces ciblées :", selectedDocs.length);
  console.log("Pièces avec indices surface/culture :", results.length);
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("AUCUN calcul kg/ha effectué.");
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

main().catch((error) => {
  console.error("ERREUR V32 :", error.message || error);
  process.exitCode = 1;
});
