#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const ANALYSIS = path.join(ROOT, "_ANALYSE_EXPLOITATION_V12.json");
const V15 = path.join(ROOT, "_AUDIT_LIQUIDATIONS_SANS_CAMPAGNE_V15.json");
const OUTPUT = path.join(ROOT, "_RELECTURE_LIQUIDATIONS_V16.json");
const CONFIRMED = path.join(ROOT, "_LIQUIDATIONS_CONFIRMEES_V16.json");
const REVIEW = path.join(ROOT, "_LIQUIDATIONS_ENCORE_A_REVOIR_V16.json");
const REPORT = path.join(ROOT, "_RAPPORT_RELECTURE_LIQUIDATIONS_V16.md");

const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"]);

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

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
  if (!relativePath) return "";
  const p = path.resolve(ROOT, String(relativePath).split("/").join(path.sep));
  return insideRoot(p) ? p : "";
}

function existing(candidates) {
  return candidates.find((p) => p && insideRoot(p) && fs.existsSync(p)) || "";
}

function resolveFile(doc) {
  const candidates = [
    doc?.source?.currentRelativePath ? portable(doc.source.currentRelativePath) : "",
    doc?.currentRelativePath ? portable(doc.currentRelativePath) : "",
    doc?.source?.originalRelativePath ? portable(doc.source.originalRelativePath) : "",
    doc?.originalRelativePath ? portable(doc.originalRelativePath) : ""
  ];
  if (doc?.storedName) {
    candidates.push(path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", doc.storedName));
  }
  return existing(candidates);
}

async function commandExists(command) {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, maxBuffer = 24 * 1024 * 1024) {
  const { stdout } = await execFileAsync(command, args, { encoding: "utf-8", maxBuffer });
  return String(stdout || "");
}

async function readFullText(filePath, capabilities) {
  const ext = path.extname(filePath).toLowerCase();
  if (IMAGE_EXT.has(ext)) {
    const trials = [];
    for (const psm of [1, 3, 6]) {
      let text = "";
      let error = "";
      try {
        text = (await run("tesseract", [filePath, "stdout", "-l", "spa+fra+eng", "--psm", String(psm)])).trim();
      } catch (e) {
        error = String(e?.message || e);
      }
      trials.push({ psm, text: text.slice(0, 300000), error });
    }
    trials.sort((a, b) => scoreText(b.text) - scoreText(a.text));
    return { method: `tesseract_direct_psm_${trials[0]?.psm ?? "?"}`, text: trials[0]?.text || "", trials };
  }

  if (ext === ".pdf" && capabilities.pdftotext) {
    const text = (await run("pdftotext", ["-layout", "-nopgbrk", filePath, "-"])).trim();
    return { method: "pdftotext_direct", text: text.slice(0, 300000), trials: [] };
  }

  return { method: "format_non_pris_en_charge", text: "", trials: [] };
}

function scoreText(text) {
  const raw = String(text || "").trim();
  if (!raw) return -1000;
  const s = norm(raw);
  let score = Math.min(raw.length, 5000) / 100;
  const strong = [
    "agricola san juan", "sociedad cooperativa andaluza", "san juan",
    "liquidacion", "liquidación", "factura", "almazara", "campana", "campaña", "reparto"
  ];
  for (const token of strong) if (s.includes(norm(token))) score += 20;
  return Math.round(score * 100) / 100;
}

function directSanJuan(text) {
  const s = norm(text);
  const directNames = [
    "agricola san juan",
    "s.c.a. agricola san juan",
    "sociedad cooperativa andaluza agricola san juan"
  ];
  if (directNames.some((x) => s.includes(x))) {
    return { confirmed: true, confidence: 0.99, reason: "nom_direct" };
  }

  const sanJuan = /\b(?:san|sam|gan|bam)\s+juan\b/.test(s);
  const cooperative = s.includes("sociedad cooperativa andaluza") || s.includes("s.c.a.") || s.includes("cooperativa andaluza");
  const agricola = s.includes("agricola") || /\b(?:a|ag|aq|ao)[a-z]{0,3}micola\b/.test(s);
  const knownPlace = s.includes("villanueva del") || s.includes("almazara");

  if (sanJuan && (cooperative || agricola)) {
    return { confirmed: true, confidence: 0.95, reason: "signature_san_juan_cooperative" };
  }
  if (sanJuan && knownPlace) {
    return { confirmed: true, confidence: 0.9, reason: "signature_san_juan_lieu" };
  }
  return { confirmed: false, confidence: 0, reason: "aucune_signature_directe_suffisante" };
}

function normalizeYearPart(value) {
  const raw = String(value || "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (raw.length === 4) return n;
  return n >= 70 ? 1900 + n : 2000 + n;
}

function normalizeCampaign(aRaw, bRaw) {
  const a = normalizeYearPart(aRaw);
  const b0 = normalizeYearPart(bRaw);
  if (!a || !b0) return "";
  let b = b0;
  if (String(bRaw).length === 2 && Number(bRaw) === ((a + 1) % 100)) b = a + 1;
  return b === a + 1 ? `${a}-${b}` : "";
}

function explicitCampaign(text) {
  const source = String(text || "");
  const patterns = [
    /(?:CAMPA[ÑN]A|CP[ÑN]A|CAMPANA|CPNA)\s*[:.\-]?\s*(\d{2,4})\s*[\/]\s*(\d{2,4})/i,
    /(?:REPARTO|COSECHA)\s+(?:CP[ÑN]A\s*)?(\d{2,4})\s*[\/]\s*(\d{2,4})/i
  ];
  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (!m) continue;
    const campaign = normalizeCampaign(m[1], m[2]);
    if (campaign) return { campaign, matchedText: m[0] };
  }
  return null;
}

function dateCampaign(date) {
  const m = String(date || "").match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  const start = month >= 9 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function compact(value, max = 900) {
  return String(value || "").replace(/\r/g, "").replace(/\n{3,}/g, "\n\n").trim().slice(0, max);
}

async function main() {
  const analysis = readJson(ANALYSIS);
  const v15 = readJson(V15);
  const docs = Array.isArray(analysis.documents) ? analysis.documents : [];
  const docsById = new Map(docs.filter((d) => d.documentId).map((d) => [d.documentId, d]));
  const docsByName = new Map(docs.filter((d) => d.originalName).map((d) => [d.originalName, d]));

  const targets = (v15.documents || []).filter((x) => !x.directSanJuan?.confirmed);
  const capabilities = {
    tesseract: await commandExists("tesseract"),
    pdftotext: await commandExists("pdftotext")
  };
  if (!capabilities.tesseract) throw new Error("Tesseract est introuvable.");

  console.log("=== FINCA MARIA — RELECTURE DIRECTE LIQUIDATIONS V16 ===");
  console.log("Pièces ciblées :", targets.length);
  console.log("OCR complet ciblé uniquement sur ces pièces.");
  console.log("Aucun original ni copie de travail ne sera modifié.\n");

  const results = [];
  for (let i = 0; i < targets.length; i += 1) {
    const target = targets[i];
    const doc = docsById.get(target.sourceDocumentId) || docsByName.get(target.sourceDocument) || null;
    const filePath = resolveFile(doc);
    if (!filePath) {
      results.push({ ...target, v16Status: "FICHIER_INTROUVABLE" });
      console.log(`[${i + 1}/${targets.length}] ${target.sourceDocument} | FICHIER INTROUVABLE`);
      continue;
    }

    const reading = await readFullText(filePath, capabilities);
    const entity = directSanJuan(reading.text);
    const explicit = explicitCampaign(reading.text);
    const byDate = dateCampaign(target.date);

    let decision = "ENTITE_NON_CONFIRMEE";
    if (entity.confirmed && explicit) decision = "AGRI_SAN_JUAN_CAMPAGNE_EXPLICITE";
    else if (entity.confirmed && byDate) decision = "AGRI_SAN_JUAN_CAMPAGNE_PAR_DATE_A_VALIDER";
    else if (entity.confirmed) decision = "AGRI_SAN_JUAN_SANS_CAMPAGNE";
    else if (explicit) decision = "CAMPAGNE_EXPLICITE_ENTITE_NON_CONFIRMEE";

    const row = {
      sourceDocumentId: target.sourceDocumentId || doc?.documentId || "",
      sourceDocument: target.sourceDocument || doc?.originalName || "",
      type: target.type,
      date: target.date || "",
      sourcePath: path.relative(ROOT, filePath).split(path.sep).join("/"),
      readingMethod: reading.method,
      textLength: reading.text.length,
      directSanJuan: entity,
      explicitCampaign: explicit?.campaign || "",
      explicitCampaignEvidence: explicit?.matchedText || "",
      dateCampaignCandidate: byDate,
      decision,
      textExcerpt: compact(reading.text),
      psmScores: (reading.trials || []).map((t) => ({ psm: t.psm, score: scoreText(t.text), length: t.text.length, error: t.error || "" }))
    };
    results.push(row);

    console.log(`[${i + 1}/${targets.length}] ${row.sourceDocument}`);
    console.log(`  ${decision} | ${entity.confirmed ? "Agri San Juan OUI" : "entité ?"} | campagne ${row.explicitCampaign || row.dateCampaignCandidate || "?"} | ${reading.method}`);
  }

  const confirmed = results.filter((r) => r.directSanJuan?.confirmed);
  const explicit = results.filter((r) => r.directSanJuan?.confirmed && r.explicitCampaign);
  const dateCandidates = results.filter((r) => r.directSanJuan?.confirmed && !r.explicitCampaign && r.dateCampaignCandidate);
  const unresolved = results.filter((r) => !r.directSanJuan?.confirmed);

  const summary = {
    targeted: targets.length,
    filesRead: results.filter((r) => r.v16Status !== "FICHIER_INTROUVABLE").length,
    directSanJuanConfirmed: confirmed.length,
    explicitCampaignAnchors: explicit.length,
    dateCampaignCandidates: dateCandidates.length,
    entityStillUnconfirmed: unresolved.length
  };

  const payload = {
    version: 16,
    generatedAt: new Date().toISOString(),
    basedOn: { analysis: ANALYSIS, v15: V15 },
    purpose: "Relire directement et intégralement les seules liquidations dont l'entité n'était pas confirmée en V15, sans relancer l'OCR de tout le BAÚL.",
    summary,
    documents: results
  };

  writeJson(OUTPUT, payload);
  writeJson(CONFIRMED, { generatedAt: payload.generatedAt, documents: confirmed });
  writeJson(REVIEW, { generatedAt: payload.generatedAt, documents: unresolved });

  const lines = [
    "# FINCA MARIA — Relecture directe des liquidations V16",
    "",
    `- Pièces ciblées : **${summary.targeted}**`,
    `- Fichiers relus directement : **${summary.filesRead}**`,
    `- Agri San Juan confirmé après relecture complète : **${summary.directSanJuanConfirmed}**`,
    `- Campagnes explicites directement ancrées : **${summary.explicitCampaignAnchors}**`,
    `- Campagnes seulement proposées par date : **${summary.dateCampaignCandidates}**`,
    `- Entité encore non confirmée : **${summary.entityStillUnconfirmed}**`,
    "",
    "Cette étape ne modifie ni l'original privé ni la copie de travail. Elle relit uniquement les pièces ciblées afin d'éviter de conclure à partir d'un extrait OCR tronqué."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("\n=== FIN V16 ===");
  console.log("Pièces ciblées :", summary.targeted);
  console.log("Fichiers relus directement :", summary.filesRead);
  console.log("Agri San Juan confirmé :", summary.directSanJuanConfirmed);
  console.log("Campagnes explicites ancrées :", summary.explicitCampaignAnchors);
  console.log("Candidats campagne par date :", summary.dateCampaignCandidates);
  console.log("Entité encore non confirmée :", summary.entityStillUnconfirmed);
  console.log("Sortie :", OUTPUT);
  console.log("Aucun original ni copie de travail n'a été modifié.");
}

main().catch((error) => {
  console.error("ERREUR V16 :", error.message || error);
  process.exitCode = 1;
});
