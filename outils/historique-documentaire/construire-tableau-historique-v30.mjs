#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const BASE = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V29.json");
const OUTPUT = path.join(ROOT, "_TABLEAU_HISTORIQUE_CAMPAGNES_V30.json");
const REPORT = path.join(ROOT, "_RAPPORT_TABLEAU_HISTORIQUE_V30.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function num(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function round(value, digits = 4) {
  if (!Number.isFinite(value)) return null;
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function snapshotGroup(group) {
  const facts = group?.facts || {};
  const oliveKg = num(facts.oliveKg);
  const oilKg = num(facts.oilKg);
  const documentedYieldPct = num(facts.yieldPct);
  const calculatedYieldPct = oliveKg && oilKg !== null ? round((oilKg / oliveKg) * 100, 4) : null;

  let yieldPct = documentedYieldPct;
  let yieldSource = documentedYieldPct !== null ? "documente" : "absent";
  if (yieldPct === null && calculatedYieldPct !== null) {
    yieldPct = calculatedYieldPct;
    yieldSource = "calcule_depuis_kg_documentes";
  }

  return {
    evidenceGroupId: group?.evidenceGroupId || "",
    oliveKg,
    oilKg,
    yieldPct,
    yieldSource,
    documentedYieldPct,
    calculatedYieldPct,
    acidity: num(facts.acidity),
    grossLiquidation: num(facts.grossLiquidation),
    taxBase: num(facts.taxBase),
    netToReceive: num(facts.netToReceive),
    documents: group?.documents || [],
    documentTypes: group?.documentTypes || [],
    auditedExtractionCorrectionV29: group?.auditedExtractionCorrectionV29 || null,
    needsVisualReview: !!group?.needsVisualReview,
    reviewReason: group?.reviewReason || null
  };
}

function main() {
  const base = readJson(BASE);
  const campaigns = Array.isArray(base.campaigns) ? base.campaigns : [];

  const rows = campaigns.map((campaign) => {
    const groups = (campaign.productionEvidence || []).map(snapshotGroup);

    if (groups.length > 1) {
      return {
        campaign: campaign.campaign,
        status: "multi_groupes_non_resolus",
        evidenceLevel: campaign.evidenceLevel,
        reference: null,
        groups,
        accountMovements: campaign.accountMovements || 0,
        note: "Plusieurs groupes de production restent présents : aucune valeur annuelle de référence n'est retenue."
      };
    }

    if (groups.length === 1) {
      const reference = groups[0];
      let status = "preuve_quantitative_partielle";
      if (reference.oliveKg !== null && reference.oilKg !== null) status = "production_quantitative_exploitable";
      if (reference.oliveKg !== null && reference.oilKg === null) status = "olives_documentees_seulement";

      return {
        campaign: campaign.campaign,
        status,
        evidenceLevel: campaign.evidenceLevel,
        reference,
        groups,
        accountMovements: campaign.accountMovements || 0,
        note: reference.yieldSource === "calcule_depuis_kg_documentes"
          ? "Le rendement affiché est calculé à partir des kg d'olives et d'huile documentés ; il n'est pas présenté comme une valeur lue directement dans la pièce."
          : "Valeurs conservées avec leur provenance documentaire."
      };
    }

    return {
      campaign: campaign.campaign,
      status: campaign.evidenceLevel === "campagne_attestee_par_liquidation_comptable"
        ? "campagne_attestee_sans_quantites"
        : "sans_preuve_quantitative",
      evidenceLevel: campaign.evidenceLevel,
      reference: null,
      groups: [],
      accountMovements: campaign.accountMovements || 0,
      note: "Aucune quantité de production exploitable n'est actuellement retenue pour cette campagne."
    };
  });

  const exploitable = rows
    .filter((r) => r.status === "production_quantitative_exploitable")
    .map((r) => ({
      campaign: r.campaign,
      oliveKg: r.reference.oliveKg,
      oilKg: r.reference.oilKg,
      yieldPct: r.reference.yieldPct,
      yieldSource: r.reference.yieldSource,
      acidity: r.reference.acidity,
      documents: r.reference.documents
    }));

  const oliveOnly = rows
    .filter((r) => r.status === "olives_documentees_seulement")
    .map((r) => ({
      campaign: r.campaign,
      oliveKg: r.reference.oliveKg,
      documents: r.reference.documents
    }));

  const unresolved = rows
    .filter((r) => r.status === "multi_groupes_non_resolus")
    .map((r) => ({
      campaign: r.campaign,
      groups: r.groups.map((g) => ({
        evidenceGroupId: g.evidenceGroupId,
        oliveKg: g.oliveKg,
        oilKg: g.oilKg,
        yieldPct: g.yieldPct,
        yieldSource: g.yieldSource,
        needsVisualReview: g.needsVisualReview,
        reviewReason: g.reviewReason,
        documents: g.documents
      }))
    }));

  const yieldRanking = exploitable
    .filter((r) => r.yieldPct !== null)
    .sort((a, b) => b.yieldPct - a.yieldPct);

  const oliveRanking = exploitable
    .filter((r) => r.oliveKg !== null)
    .sort((a, b) => b.oliveKg - a.oliveKg);

  const summary = {
    campaignsInBase: rows.length,
    quantitativelyExploitable: exploitable.length,
    oliveOnly: oliveOnly.length,
    unresolvedMultiGroup: unresolved.length,
    withoutQuantitativeReference: rows.filter((r) => !["production_quantitative_exploitable", "olives_documentees_seulement", "multi_groupes_non_resolus"].includes(r.status)).length,
    highestYieldReference: yieldRanking[0] || null,
    lowestYieldReference: yieldRanking.at(-1) || null,
    largestOliveReference: oliveRanking[0] || null,
    annualTotalsDeclaredFinal: false
  };

  const payload = {
    version: 30,
    generatedAt: new Date().toISOString(),
    basedOn: BASE,
    purpose: "Construire un tableau historique prudent à partir de V29 : une ligne de référence uniquement lorsqu'un seul groupe de production subsiste, distinction rendement documenté/calculé, et maintien explicite des ambiguïtés.",
    summary,
    rows,
    exploitable,
    oliveOnly,
    unresolved,
    yieldRanking,
    oliveRanking,
    safeguards: {
      noBlindSummation: true,
      multiGroupCampaignExcludedFromRanking: true,
      calculatedYieldExplicitlyLabeled: true,
      missingDataNotZero: true,
      noFinalAnnualTotalClaim: true,
      originalsModified: false,
      classifiedCopiesModified: false
    }
  };

  writeJson(OUTPUT, payload);

  const lines = [
    "# FINCA MARIA — Tableau historique prudent V30",
    "",
    `- Campagnes dans la base : **${summary.campaignsInBase}**`,
    `- Campagnes quantitativement exploitables : **${summary.quantitativelyExploitable}**`,
    `- Campagnes avec seulement kg d'olives : **${summary.oliveOnly}**`,
    `- Campagnes multi-groupes encore non résolues : **${summary.unresolvedMultiGroup}**`,
    "",
    "## Références quantitatives exploitables",
    "",
    ...exploitable.map((r) => `- **${r.campaign}** : ${r.oliveKg} kg olives ; ${r.oilKg} kg huile ; rendement ${r.yieldPct ?? "—"} % (${r.yieldSource}).`),
    "",
    "## Campagnes incomplètes / ambiguës",
    "",
    ...oliveOnly.map((r) => `- **${r.campaign}** : ${r.oliveKg} kg olives documentés ; huile/rendement non établis.`),
    ...unresolved.map((r) => `- **${r.campaign}** : ${r.groups.length} groupes non fusionnés ; exclue des classements.`),
    "",
    "V30 ne présente aucun total annuel comme définitif et ne modifie aucun original ni copie classée."
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — TABLEAU HISTORIQUE V30 ===");
  console.log("Campagnes base :", summary.campaignsInBase);
  console.log("Quantitativement exploitables :", summary.quantitativelyExploitable);
  console.log("Olives seulement :", summary.oliveOnly);
  console.log("Multi-groupes non résolus :", summary.unresolvedMultiGroup);
  if (summary.highestYieldReference) console.log("Rendement de référence le plus élevé :", `${summary.highestYieldReference.campaign} | ${summary.highestYieldReference.yieldPct}% | ${summary.highestYieldReference.yieldSource}`);
  if (summary.lowestYieldReference) console.log("Rendement de référence le plus faible :", `${summary.lowestYieldReference.campaign} | ${summary.lowestYieldReference.yieldPct}% | ${summary.lowestYieldReference.yieldSource}`);
  if (summary.largestOliveReference) console.log("Plus forte quantité d'olives de référence :", `${summary.largestOliveReference.campaign} | ${summary.largestOliveReference.oliveKg} kg`);
  console.log("2015-2016 exclue des classements tant que 9 064 kg non résolu :", unresolved.some((x) => x.campaign === "2015-2016") ? "OUI" : "NON");
  console.log("Totaux annuels déclarés définitifs : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V30 :", error.message || error);
  process.exitCode = 1;
}
