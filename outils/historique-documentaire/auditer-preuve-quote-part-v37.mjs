#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const OUTPUT = path.join(ROOT, "_AUDIT_PREUVE_QUOTE_PART_V37.json");
const REPORT = path.join(ROOT, "_RAPPORT_AUDIT_PREUVE_QUOTE_PART_V37.md");

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return null; }
}

function norm(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function latestAnalysisFile() {
  const files = fs.readdirSync(ROOT)
    .map(name => {
      const m = name.match(/^_ANALYSE_EXPLOITATION_V(\d+)\.json$/i);
      return m ? { name, version: Number(m[1]) } : null;
    })
    .filter(Boolean)
    .sort((a,b) => b.version - a.version);
  return files[0] ? path.join(ROOT, files[0].name) : null;
}

function flattenStrings(value, out = []) {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const v of value) flattenStrings(v, out);
  else if (value && typeof value === "object") {
    for (const v of Object.values(value)) flattenStrings(v, out);
  }
  return out;
}

function snippets(text) {
  const raw = String(text || "");
  const n = norm(raw);
  const regexes = [
    /15\s*%/g,
    /15\s*por\s*ciento/g,
    /0[,.]15/g,
    /40\s*%/g,
    /40\s*por\s*ciento/g,
    /0[,.]40/g,
    /(porcentaje|participacion|cuota|parte|reparto).{0,90}\b15\b/g,
    /\b15\b.{0,90}(porcentaje|participacion|cuota|parte|reparto)/g,
    /(porcentaje|participacion|cuota|parte|reparto).{0,90}\b40\b/g,
    /\b40\b.{0,90}(porcentaje|participacion|cuota|parte|reparto)/g
  ];

  const hits = [];
  const seen = new Set();
  for (const re of regexes) {
    let m;
    while ((m = re.exec(n)) !== null) {
      const start = Math.max(0, m.index - 180);
      const end = Math.min(raw.length, m.index + m[0].length + 180);
      const s = raw.slice(start, end).replace(/\s+/g, " ").trim();
      const key = s.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        hits.push(s);
      }
      if (m.index === re.lastIndex) re.lastIndex++;
    }
  }
  return hits;
}

function compactDoc(doc) {
  return {
    documentId: doc?.documentId || doc?.id || null,
    originalName: doc?.originalName || null,
    storedName: doc?.storedName || null,
    date: doc?.date || doc?.documentDate || null,
    type: doc?.type || null,
    campaign: doc?.campaign || null
  };
}

function main() {
  const source = latestAnalysisFile();
  if (!source) throw new Error("Aucun fichier _ANALYSE_EXPLOITATION_V*.json trouvé.");

  const data = readJson(source);
  if (!data) throw new Error(`Analyse illisible : ${source}`);

  const docs = Array.isArray(data.documents) ? data.documents : [];
  const candidates = [];

  for (const doc of docs) {
    const text = flattenStrings(doc).join("\n");
    const hits = snippets(text);
    if (!hits.length) continue;
    candidates.push({
      ...compactDoc(doc),
      hits
    });
  }

  const fifteenCandidates = candidates.filter(c => c.hits.some(h => /15\s*%|15\s*por\s*ciento|0[,.]15|\b15\b/i.test(h)));
  const fortyCandidates = candidates.filter(c => c.hits.some(h => /40\s*%|40\s*por\s*ciento|0[,.]40|\b40\b/i.test(h)));

  const payload = {
    version: 37,
    generatedAt: new Date().toISOString(),
    basedOn: source,
    purpose: "Chercher dans la dernière analyse documentaire déjà produite des indices textuels pouvant corroborer une quote-part de 15 % ou signaler une autre clé de répartition, sans relancer l'OCR et sans modifier les documents.",
    familyContext: {
      motherSharePct: 15,
      provenance: "user_provided_family_context",
      status: "a_corroborrer_documentairement"
    },
    candidateDocuments: candidates,
    summary: {
      documentsScanned: docs.length,
      documentsWithShareLikeSignals: candidates.length,
      documentsWith15LikeSignals: fifteenCandidates.length,
      documentsWith40LikeSignals: fortyCandidates.length,
      conclusion: fifteenCandidates.length
        ? "Des occurrences compatibles avec 15 % existent dans les textes extraits, mais chacune doit être relue dans son contexte avant de conclure qu'elle décrit la quote-part de production de la mère."
        : "Aucune occurrence textuelle suffisante de 15 % n'a été retrouvée dans la dernière analyse documentaire. La règle des 15 % reste donc, à ce stade, une donnée familiale non corroborée par cette couche OCR."
    },
    safeguards: {
      noBroadOcrRerun: true,
      noAutomaticShareConclusion: true,
      noOriginalModified: true,
      noClassifiedCopyModified: true,
      generatedScenarioFilesExcludedAsEvidence: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Audit preuve quote-part V37",
    "",
    `- Analyse documentaire inspectée : **${path.basename(source)}**`,
    `- Documents parcourus : **${docs.length}**`,
    `- Documents avec signaux de répartition : **${candidates.length}**`,
    `- Documents avec signaux compatibles 15 % : **${fifteenCandidates.length}**`,
    `- Documents avec signaux compatibles 40 % : **${fortyCandidates.length}**`,
    "",
    "## Candidats",
    ""
  ];

  if (!candidates.length) {
    lines.push("Aucun candidat textuel détecté dans cette couche.", "");
  } else {
    for (const c of candidates) {
      lines.push(`### ${c.originalName || c.documentId || "document"}`);
      if (c.date) lines.push(`- Date : ${c.date}`);
      if (c.type) lines.push(`- Type : ${c.type}`);
      if (c.campaign) lines.push(`- Campagne : ${c.campaign}`);
      for (const h of c.hits.slice(0, 6)) lines.push(`- Extrait : ${h}`);
      lines.push("");
    }
  }

  lines.push("## Règle de décision", "");
  lines.push("Une occurrence de 15 ou 40 ne suffit pas. Pour promouvoir une quote-part en fait documentaire, le texte doit relier explicitement le pourcentage à la production, à la propriété, au partage ou au compte concerné.");

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — AUDIT PREUVE QUOTE-PART V37 ===");
  console.log("Analyse inspectée :", path.basename(source));
  console.log("Documents parcourus :", docs.length);
  console.log("Documents avec signaux de répartition :", candidates.length);
  console.log("Signaux compatibles 15% :", fifteenCandidates.length);
  console.log("Signaux compatibles 40% :", fortyCandidates.length);
  console.log("Quote-part 15% promue en fait documentaire : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try { main(); }
catch (error) {
  console.error("ERREUR V37 :", error.message || error);
  process.exitCode = 1;
}
