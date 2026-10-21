#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const V18 = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const V20 = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V20.json");
const OUTPUT = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V21.json");
const CORRECTIONS = path.join(ROOT, "_CORRECTIONS_CAMPAGNES_VALES_V21.json");
const REPORT = path.join(ROOT, "_RAPPORT_CAMPAGNES_VALES_V21.md");

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

function datedCampaignVotes(text) {
  const source = String(text || "");
  const votes = new Map();
  const dates = [];
  const re = /\b(\d{1,2})[\/.-](\d{1,2})[\/.-]((?:19|20)\d{2})\b/g;
  let m;
  while ((m = re.exec(source))) {
    const campaign = campaignFromDate(m[1], m[2], m[3]);
    if (!campaign) continue;
    dates.push({ raw: m[0], campaign });
    votes.set(campaign, (votes.get(campaign) || 0) + 1);
  }
  const ranking = [...votes.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { dates, ranking };
}

function inferValeCampaign(text) {
  const { dates, ranking } = datedCampaignVotes(text);
  if (!ranking.length) {
    return { campaign: "", source: "none", confidence: 0, dates, ranking };
  }
  const [winner, winnerVotes] = ranking[0];
  const runnerVotes = ranking[1]?.[1] || 0;
  const total = ranking.reduce((sum, [, count]) => sum + count, 0);
  const ratio = total ? winnerVotes / total : 0;

  // Cas propre : toutes les dates concordent.
  if (ranking.length === 1 && winnerVotes >= 1) {
    return {
      campaign: winner,
      source: "dates_document_concordantes",
      confidence: winnerVotes >= 2 ? 0.99 : 0.93,
      dates,
      ranking
    };
  }

  // OCR d'en-tête parfois faux : on accepte une majorité nette de dates cohérentes.
  if (winnerVotes >= 2 && winnerVotes >= runnerVotes + 2 && ratio >= 0.66) {
    return {
      campaign: winner,
      source: "majorite_dates_document",
      confidence: Math.min(0.98, 0.88 + ratio * 0.1),
      dates,
      ranking
    };
  }

  return { campaign: "", source: "dates_ambigues", confidence: 0.4, dates, ranking };
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
  const base = readJson(V20);
  const source = readJson(V18);
  const docs = Array.isArray(source.documents) ? source.documents : [];
  const docsByName = new Map(docs.map((d) => [d.originalName, d]));
  const observations = structuredClone(Array.isArray(base.observations) ? base.observations : []);
  const corrections = [];

  for (const obs of observations) {
    if (obs.type !== "EXTRACTO_VALES_ALMAZARA") continue;
    const doc = docsByName.get(obs.document);
    if (!doc) continue;
    const inferred = inferValeCampaign(doc?.reading?.textExcerpt || "");
    if (!inferred.campaign) continue;

    const before = obs.campaign || "";
    const currentStored = obs.currentCampaign || "";
    if (before === inferred.campaign && obs.campaignSource === inferred.source) continue;

    obs.campaign = inferred.campaign;
    obs.campaignSource = inferred.source;
    obs.campaignConfidence = inferred.confidence;
    obs.v21DateEvidence = inferred.dates;
    obs.v21DateVoteRanking = inferred.ranking;

    if (before !== inferred.campaign || currentStored !== inferred.campaign) {
      corrections.push({
        document: obs.document,
        type: obs.type,
        campaignBeforeV21: before,
        storedCampaignV18: currentStored,
        campaignAfterV21: inferred.campaign,
        source: inferred.source,
        confidence: inferred.confidence,
        dateEvidence: inferred.dates,
        voteRanking: inferred.ranking
      });
    }
  }

  // Reconstruit les groupes uniquement à partir des observations V21.
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
      evidenceGroupId: `${group.campaign}__V21P${String(i + 1).padStart(2, "0")}`,
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
    valeCampaignCorrections: corrections.length,
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
    version: 21,
    generatedAt: new Date().toISOString(),
    basedOn: { v20: V20, v18Documents: V18 },
    purpose: "Fiabiliser le rattachement des Extracto Vales Almazara en exploitant les dates réelles des apports. Une majorité nette de dates documentaires peut corriger un en-tête OCR corrompu ; les anciennes campagnes sans preuve ne sont pas conservées par défaut.",
    summary,
    observations,
    evidenceGroups,
    corrections
  };

  writeJson(OUTPUT, payload);
  writeJson(CORRECTIONS, { generatedAt: payload.generatedAt, corrections, controlFive });

  const lines = [
    "# FINCA MARIA — Campagnes des vales V21",
    "",
    `- Documents de production audités : **${summary.productionDocumentsAudited}**`,
    `- Extracto Vales audités : **${summary.valeDocumentsAudited}**`,
    `- Corrections/rattachements de campagne par dates documentaires : **${summary.valeCampaignCorrections}**`,
    `- Groupes de preuves de production reconstruits : **${summary.productionEvidenceGroups}**`,
    `- Contrôle des 5 documents : **${summary.fiveDocumentControlOk ? "OK" : "À REVOIR"}**`,
    `- Contrôle 2010-2011 : **${summary.control2010_2011.status}**`,
    "",
    "## Contrôle ciblé",
    ...controlFive.map((x) => `- ${x.document} : ${x.actualCampaign || "?"} (${x.source}, ${x.confidence}) ${x.ok ? "OK" : `ATTENDU ${x.expectedCampaign}`}`),
    "",
    "V21 ne modifie aucun document original ni copie de travail. Il produit seulement une couche analytique corrigée."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CAMPAGNES VALES V21 ===");
  console.log("Documents de production audités :", summary.productionDocumentsAudited);
  console.log("Extracto Vales audités :", summary.valeDocumentsAudited);
  console.log("Corrections/rattachements par dates :", summary.valeCampaignCorrections);
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
  console.error("ERREUR V21 :", error.message || error);
  process.exitCode = 1;
}
