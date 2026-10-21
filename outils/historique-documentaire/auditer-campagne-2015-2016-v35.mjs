#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const BASE = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V29.json");
const OUTPUT = path.join(ROOT, "_AUDIT_CAMPAGNE_2015_2016_V35.json");
const REPORT = path.join(ROOT, "_RAPPORT_AUDIT_CAMPAGNE_2015_2016_V35.md");

function readJson(file) {
  if (!fs.existsSync(file)) return null;
  try { return JSON.parse(fs.readFileSync(file, "utf-8")); }
  catch { return null; }
}

function norm(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function collectAnalysisFiles() {
  return fs.readdirSync(ROOT)
    .filter(n => /^_ANALYSE_EXPLOITATION_V\d+\.json$/i.test(n))
    .sort((a,b) => {
      const va = Number(a.match(/V(\d+)/i)?.[1] || 0);
      const vb = Number(b.match(/V(\d+)/i)?.[1] || 0);
      return vb - va;
    })
    .map(n => path.join(ROOT, n));
}

function docKeys(group) {
  const keys = new Set();
  for (const d of group?.documents || []) {
    if (typeof d === "string") keys.add(norm(d));
    if (d && typeof d === "object") {
      for (const v of [d.documentId, d.originalName, d.storedName, d.id]) if (v) keys.add(norm(v));
    }
  }
  return keys;
}

function matchDoc(doc, keys) {
  const vals = [doc?.documentId, doc?.id, doc?.originalName, doc?.storedName].filter(Boolean).map(norm);
  return vals.some(v => keys.has(v));
}

function compactDoc(doc, sourceFile) {
  return {
    sourceAnalysis: path.basename(sourceFile),
    documentId: doc.documentId || doc.id || null,
    originalName: doc.originalName || null,
    storedName: doc.storedName || null,
    date: doc.date || doc.documentDate || null,
    campaign: doc.campaign || null,
    type: doc.type || null,
    facts: doc.facts || null,
    needsReview: doc.needsReview ?? null,
    readingStatus: doc.reading?.status || null,
    textExcerpt: doc.reading?.textExcerpt || doc.reading?.text || ""
  };
}

function main() {
  const base = readJson(BASE);
  if (!base) throw new Error(`Base V29 introuvable ou illisible : ${BASE}`);

  const campaign = (base.campaigns || []).find(c => c.campaign === "2015-2016");
  if (!campaign) throw new Error("Campagne 2015-2016 absente de la base V29.");

  const groups = Array.isArray(campaign.productionEvidence) ? campaign.productionEvidence : [];
  const analysisFiles = collectAnalysisFiles();

  const groupAudits = groups.map((group, index) => {
    const keys = docKeys(group);
    const matched = [];

    for (const file of analysisFiles) {
      const data = readJson(file);
      const docs = Array.isArray(data?.documents) ? data.documents : [];
      for (const doc of docs) {
        if (matchDoc(doc, keys)) matched.push(compactDoc(doc, file));
      }
    }

    const dedup = [];
    const seen = new Set();
    for (const d of matched) {
      const k = `${d.sourceAnalysis}|${d.documentId || ""}|${d.originalName || ""}`;
      if (seen.has(k)) continue;
      seen.add(k);
      dedup.push(d);
    }

    return {
      index: index + 1,
      evidenceGroupId: group.evidenceGroupId || null,
      canonicalFacts: group.facts || null,
      documentTypes: group.documentTypes || [],
      documents: group.documents || [],
      needsVisualReview: Boolean(group.needsVisualReview),
      reviewReason: group.reviewReason || null,
      historicalAnalysisMatches: dedup
    };
  });

  const allTexts = groupAudits.flatMap(g => g.historicalAnalysisMatches.map(d => d.textExcerpt || ""));
  const text = norm(allTexts.join("\n"));
  const signals = {
    mentions9064: /9[.\s]?064/.test(text),
    mentions3854: /3[.\s]?854/.test(text),
    mentionsKgAceituna: text.includes("kg aceituna") || text.includes("kg. aceituna") || text.includes("aceituna"),
    mentionsPrimerReparto: text.includes("1er reparto") || text.includes("1º reparto") || text.includes("1° reparto") || text.includes("primer reparto"),
    mentionsCampaign1516: text.includes("15/16") || text.includes("2015/2016") || text.includes("2015-2016")
  };

  const payload = {
    version: 35,
    generatedAt: new Date().toISOString(),
    basedOn: BASE,
    purpose: "Auditer uniquement la campagne 2015-2016 et ses deux groupes de production sans les fusionner, en rapprochant les faits canoniques des analyses documentaires locales déjà produites.",
    campaign: "2015-2016",
    evidenceGroupCount: groupAudits.length,
    groups: groupAudits,
    crossAnalysisSignals: signals,
    safeguards: {
      noGroupMerge: true,
      noBroadOcrRerun: true,
      noOriginalModified: true,
      noClassifiedCopyModified: true,
      noCausalityClaim: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Audit ciblé 2015-2016 V35",
    "",
    `- Groupes de production : **${groupAudits.length}**`,
    `- Signal 9 064 retrouvé dans les analyses locales : **${signals.mentions9064 ? "OUI" : "NON"}**`,
    `- Signal 3 854 retrouvé dans les analyses locales : **${signals.mentions3854 ? "OUI" : "NON"}**`,
    `- Mention Kg aceituna / aceituna : **${signals.mentionsKgAceituna ? "OUI" : "NON"}**`,
    `- Mention 1er reparto : **${signals.mentionsPrimerReparto ? "OUI" : "NON"}**`,
    `- Mention campagne 15/16 : **${signals.mentionsCampaign1516 ? "OUI" : "NON"}**`,
    ""
  ];

  for (const g of groupAudits) {
    lines.push(`## Groupe ${g.index} — ${g.evidenceGroupId || "sans identifiant"}`, "");
    lines.push(`- Faits canoniques : \`${JSON.stringify(g.canonicalFacts)}\``);
    lines.push(`- Revue visuelle requise : **${g.needsVisualReview ? "OUI" : "NON"}**`);
    if (g.reviewReason) lines.push(`- Motif : ${g.reviewReason}`);
    lines.push(`- Documents rattachés : **${g.documents.length}**`);
    lines.push(`- Correspondances retrouvées dans analyses locales : **${g.historicalAnalysisMatches.length}**`, "");
    for (const d of g.historicalAnalysisMatches.slice(0, 20)) {
      lines.push(`### ${d.originalName || d.documentId || "document"} — ${d.sourceAnalysis}`);
      if (d.date) lines.push(`- Date : ${d.date}`);
      if (d.type) lines.push(`- Type : ${d.type}`);
      if (d.facts) lines.push(`- Faits : \`${JSON.stringify(d.facts)}\``);
      if (d.textExcerpt) lines.push("", "```text", String(d.textExcerpt).slice(0, 3000), "```", "");
    }
  }

  lines.push("## Règle de décision", "");
  lines.push("V35 ne fusionne pas 3 854 kg et 9 064 kg. Il expose les deux groupes et leurs textes sources afin de décider si l'un est un doublon, une erreur de lecture, un sous-ensemble, un autre périmètre ou une production réellement distincte.");

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — AUDIT 2015-2016 V35 ===");
  console.log("Groupes de production :", groupAudits.length);
  for (const g of groupAudits) {
    console.log(`Groupe ${g.index} :`, JSON.stringify(g.canonicalFacts || {}));
    console.log(`  Documents : ${g.documents.length} | correspondances analyses : ${g.historicalAnalysisMatches.length} | revue visuelle : ${g.needsVisualReview ? "OUI" : "NON"}`);
  }
  console.log("Signal 9 064 retrouvé :", signals.mentions9064 ? "OUI" : "NON");
  console.log("Signal 3 854 retrouvé :", signals.mentions3854 ? "OUI" : "NON");
  console.log("Mention 1er reparto :", signals.mentionsPrimerReparto ? "OUI" : "NON");
  console.log("Fusion automatique des deux groupes : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try { main(); }
catch (error) {
  console.error("ERREUR V35 :", error.message || error);
  process.exitCode = 1;
}
