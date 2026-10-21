#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const V18 = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const V21 = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V21.json");
const OUTPUT = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V22.json");
const CORRECTIONS = path.join(ROOT, "_CORRECTIONS_DATES_OCR_VALES_V22.json");
const REPORT = path.join(ROOT, "_RAPPORT_DATES_OCR_VALES_V22.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function campaignFromDate(day, month, year) {
  const d = Number(day), m = Number(month), y = Number(year);
  if (!Number.isInteger(d) || !Number.isInteger(m) || !Number.isInteger(y)) return "";
  if (y < 1990 || y > 2035 || m < 1 || m > 12 || d < 1 || d > 31) return "";
  const start = m >= 11 ? y : y - 1;
  return `${start}-${start + 1}`;
}

function parseCompactDateDigits(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  const candidates = [];

  const tryEight = (s, edit = "none") => {
    if (!/^\d{8}$/.test(s)) return;
    const day = s.slice(0, 2);
    const month = s.slice(2, 4);
    const year = s.slice(4, 8);
    const campaign = campaignFromDate(day, month, year);
    if (!campaign) return;
    const iso = `${year}-${month}-${day}`;
    candidates.push({ raw: String(raw), normalized: s, iso, campaign, edit });
  };

  if (digits.length === 8) {
    tryEight(digits);
  } else if (digits.length === 9) {
    for (let i = 0; i < digits.length; i += 1) {
      tryEight(digits.slice(0, i) + digits.slice(i + 1), `suppression_chiffre_${i + 1}:${digits[i]}`);
    }
  }

  const dedup = new Map();
  for (const c of candidates) {
    const key = `${c.iso}|${c.campaign}`;
    if (!dedup.has(key)) dedup.set(key, c);
  }
  return [...dedup.values()];
}

function extractValeLineDates(text) {
  const source = String(text || "");
  const dates = [];

  // Dates propres avec séparateurs, n'importe où dans le texte.
  const separated = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-]((?:19|20)\d{2})\b/g;
  let m;
  while ((m = separated.exec(source))) {
    const campaign = campaignFromDate(m[1], m[2], m[3]);
    if (!campaign) continue;
    dates.push({ raw: m[0], iso: `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`, campaign, source: "date_avec_separateurs", edit: "none" });
  }

  // OCR de certaines lignes d'apport : 319122018, 10902 2019, 12022019, etc.
  // On ne lit que le début de ligne avant les colonnes numériques du vale.
  for (const line of source.split(/\r?\n/)) {
    const lm = line.match(/^\s*([0-9][0-9\s./-]{6,11})\s+\d{2,6}(?:\s|$)/);
    if (!lm) continue;
    const compactCandidates = parseCompactDateDigits(lm[1]);
    for (const c of compactCandidates) {
      dates.push({ ...c, source: "date_compacte_ocr_ligne_vale" });
    }
  }

  const unique = new Map();
  for (const d of dates) {
    const key = `${d.iso}|${d.source}`;
    if (!unique.has(key)) unique.set(key, d);
  }
  return [...unique.values()];
}

function inferFromRecoveredDates(text) {
  const dates = extractValeLineDates(text);
  if (!dates.length) return { campaign: "", source: "none", confidence: 0, dates, ranking: [] };

  // Une date OCR compacte ambiguë n'est admise que si toutes ses interprétations valides
  // mènent à la même campagne, ou si les autres dates du document tranchent clairement.
  const votes = new Map();
  for (const d of dates) votes.set(d.campaign, (votes.get(d.campaign) || 0) + 1);
  const ranking = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const [winner, winnerVotes] = ranking[0] || ["", 0];
  const runnerVotes = ranking[1]?.[1] || 0;
  const total = ranking.reduce((s, [, n]) => s + n, 0);
  const ratio = total ? winnerVotes / total : 0;

  if (ranking.length === 1 && winnerVotes >= 1) {
    return {
      campaign: winner,
      source: "dates_ocr_recuperees_concordantes",
      confidence: winnerVotes >= 2 ? 0.98 : 0.9,
      dates,
      ranking
    };
  }

  if (winnerVotes >= 2 && winnerVotes >= runnerVotes + 2 && ratio >= 0.66) {
    return {
      campaign: winner,
      source: "majorite_dates_ocr_recuperees",
      confidence: Math.min(0.96, 0.86 + ratio * 0.1),
      dates,
      ranking
    };
  }

  return { campaign: "", source: "dates_ocr_ambigues", confidence: 0.4, dates, ranking };
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function close(a, b, tolerance) {
  const x = Number(a), y = Number(b);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
  return Math.abs(x - y) <= tolerance;
}

function sameFact(a, b) {
  let matches = 0;
  if (close(a?.oliveKg, b?.oliveKg, 0.5)) matches += 1;
  if (close(a?.oilKg, b?.oilKg, 0.5)) matches += 1;
  if (close(a?.yieldPct, b?.yieldPct, 0.05)) matches += 1;
  return matches >= 2;
}

function main() {
  const base = readJson(V21);
  const source = readJson(V18);
  const docs = Array.isArray(source.documents) ? source.documents : [];
  const docsByName = new Map(docs.map((d) => [d.originalName, d]));
  const observations = structuredClone(Array.isArray(base.observations) ? base.observations : []);
  const corrections = [];

  // V22 ne remplace pas les corrections V21 déjà sûres. Il tente seulement les Extracto Vales
  // qui restent sans campagne après V21.
  for (const obs of observations) {
    if (obs.type !== "EXTRACTO_VALES_ALMAZARA" || obs.campaign) continue;
    const doc = docsByName.get(obs.document);
    if (!doc) continue;
    const inferred = inferFromRecoveredDates(doc?.reading?.textExcerpt || "");
    if (!inferred.campaign) continue;

    const before = obs.campaign || "";
    obs.campaign = inferred.campaign;
    obs.campaignSource = inferred.source;
    obs.campaignConfidence = inferred.confidence;
    obs.v22RecoveredDateEvidence = inferred.dates;
    obs.v22RecoveredDateVoteRanking = inferred.ranking;

    corrections.push({
      document: obs.document,
      campaignBeforeV22: before,
      campaignAfterV22: inferred.campaign,
      source: inferred.source,
      confidence: inferred.confidence,
      dateEvidence: inferred.dates,
      voteRanking: inferred.ranking
    });
  }

  const groups = [];
  for (const obs of observations.filter((o) => o.campaign && Number.isFinite(Number(o?.facts?.oliveKg)) && Number.isFinite(Number(o?.facts?.oilKg)))) {
    let group = groups.find((g) => g.campaign === obs.campaign && g.members.some((m) => sameFact(m.facts, obs.facts)));
    if (!group) {
      group = { campaign: obs.campaign, members: [] };
      groups.push(group);
    }
    group.members.push(obs);
  }

  const evidenceGroups = groups.map((group, i) => {
    const rep = [...group.members].sort((a, b) => Object.keys(b.facts || {}).length - Object.keys(a.facts || {}).length)[0];
    return {
      evidenceGroupId: `${group.campaign}__V22P${String(i + 1).padStart(2, "0")}`,
      campaign: group.campaign,
      facts: rep?.facts || {},
      evidenceCount: group.members.length,
      documents: unique(group.members.map((m) => m.document)),
      documentTypes: unique(group.members.map((m) => m.type)),
      campaignSources: unique(group.members.map((m) => m.campaignSource)),
      sameUnderlyingProductionFact: true,
      doNotSumEvidenceDocuments: group.members.length > 1
    };
  });

  const expected = {
    "CamScanner 14-08-2026 21.17_2.jpg": "2018-2019",
    "CamScanner 14-08-2026 21.24_8.jpg": "2013-2014",
    "CamScanner 14-08-2026 21.24_18.jpg": "2012-2013",
    "CamScanner 14-08-2026 21.30_14.jpg": "2016-2017",
    "CamScanner 14-08-2026 21.30_18.jpg": "2015-2016"
  };

  const controlFive = Object.entries(expected).map(([document, expectedCampaign]) => {
    const obs = observations.find((o) => o.document === document);
    return {
      document,
      expectedCampaign,
      actualCampaign: obs?.campaign || "",
      source: obs?.campaignSource || "",
      confidence: obs?.campaignConfidence || 0,
      ok: obs?.campaign === expectedCampaign
    };
  });

  const control2010Groups = evidenceGroups.filter((g) =>
    g.campaign === "2010-2011" &&
    close(g.facts?.oliveKg, 1405, 0.5) &&
    close(g.facts?.oilKg, 264.82, 0.5) &&
    close(g.facts?.yieldPct, 18.85, 0.05)
  );

  const summary = {
    productionDocumentsAudited: observations.length,
    valeDocumentsAudited: observations.filter((o) => o.type === "EXTRACTO_VALES_ALMAZARA").length,
    recoveredOcrDateCorrections: corrections.length,
    productionEvidenceGroups: evidenceGroups.length,
    fiveDocumentControlOk: controlFive.every((x) => x.ok),
    controlFive,
    control2010_2011: {
      status: control2010Groups.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : control2010Groups.length === 0 ? "NON_RETROUVE" : "RISQUE_DOUBLE_COMPTAGE",
      groups: control2010Groups.length,
      documents: unique(control2010Groups.flatMap((g) => g.documents || []))
    }
  };

  const payload = {
    version: 22,
    generatedAt: new Date().toISOString(),
    basedOn: { v21: V21, v18Documents: V18 },
    purpose: "Récupérer prudemment les dates d'apport compactes ou légèrement corrompues par OCR dans les Extracto Vales encore sans campagne après V21. Les interprétations ambiguës restent non rattachées.",
    summary,
    observations,
    evidenceGroups,
    corrections
  };

  writeJson(OUTPUT, payload);
  writeJson(CORRECTIONS, { generatedAt: payload.generatedAt, corrections, controlFive });

  const lines = [
    "# FINCA MARIA — Dates OCR des vales V22",
    "",
    `- Documents de production audités : **${summary.productionDocumentsAudited}**`,
    `- Extracto Vales audités : **${summary.valeDocumentsAudited}**`,
    `- Rattachements supplémentaires par dates OCR récupérées : **${summary.recoveredOcrDateCorrections}**`,
    `- Groupes de preuves de production : **${summary.productionEvidenceGroups}**`,
    `- Contrôle des 5 documents : **${summary.fiveDocumentControlOk ? "OK" : "À REVOIR"}**`,
    `- Contrôle 2010-2011 : **${summary.control2010_2011.status}**`,
    "",
    ...controlFive.map((x) => `- ${x.document} : ${x.actualCampaign || "?"} (${x.source}, ${x.confidence}) ${x.ok ? "OK" : `ATTENDU ${x.expectedCampaign}`}`),
    "",
    "V22 ne modifie aucun original ni copie de travail."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — DATES OCR VALES V22 ===");
  console.log("Documents de production audités :", summary.productionDocumentsAudited);
  console.log("Extracto Vales audités :", summary.valeDocumentsAudited);
  console.log("Rattachements supplémentaires :", summary.recoveredOcrDateCorrections);
  console.log("Groupes de preuves production :", summary.productionEvidenceGroups);
  console.log("Contrôle 5 documents :", summary.fiveDocumentControlOk ? "OK" : "A_REVOIR");
  for (const x of controlFive) console.log(` - ${x.document} -> ${x.actualCampaign || "?"} | ${x.ok ? "OK" : `ATTENDU ${x.expectedCampaign}`}`);
  console.log("Contrôle 2010-2011 :", `${summary.control2010_2011.status} | groupes ${summary.control2010_2011.groups} | documents ${summary.control2010_2011.documents.length}`);
  console.log("Sortie :", OUTPUT);
  console.log("Corrections :", CORRECTIONS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie de travail n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V22 :", error.message || error);
  process.exitCode = 1;
}
