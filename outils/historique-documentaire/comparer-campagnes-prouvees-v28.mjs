#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const BASE = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V25.json");
const OUTPUT = path.join(ROOT, "_COMPARAISON_CAMPAGNES_PROUVEES_V28.json");
const REPORT = path.join(ROOT, "_RAPPORT_COMPARAISON_CAMPAGNES_V28.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function round(value, digits = 2) {
  if (!Number.isFinite(value)) return null;
  const p = 10 ** digits;
  return Math.round(value * p) / p;
}

function groupSnapshot(group) {
  const facts = group?.facts || {};
  const oliveKg = n(facts.oliveKg);
  const oilKg = n(facts.oilKg);
  const yieldPct = n(facts.yieldPct);
  const calculatedYieldPct = oliveKg && oilKg !== null ? (oilKg / oliveKg) * 100 : null;
  const yieldDelta = yieldPct !== null && calculatedYieldPct !== null
    ? Math.abs(yieldPct - calculatedYieldPct)
    : null;

  return {
    evidenceGroupId: group?.evidenceGroupId || "",
    oliveKg,
    oilKg,
    yieldPct,
    calculatedYieldPct: round(calculatedYieldPct, 3),
    yieldDeltaPctPoint: round(yieldDelta, 3),
    yieldConsistency: yieldDelta === null
      ? "non_verifiable"
      : yieldDelta <= 0.2
        ? "coherent"
        : "a_verifier",
    acidity: n(facts.acidity),
    grossLiquidation: n(facts.grossLiquidation),
    taxBase: n(facts.taxBase),
    netToReceive: n(facts.netToReceive),
    evidenceCount: Number(group?.evidenceCount || 0),
    completeness: group?.completeness || "",
    documents: group?.documents || [],
    documentTypes: group?.documentTypes || [],
    quantitativeFields: group?.quantitativeFields || [],
    provenance: group?.provenance || []
  };
}

function main() {
  const base = readJson(BASE);
  const campaigns = Array.isArray(base.campaigns) ? base.campaigns : [];

  const rows = campaigns.map((campaign) => {
    const groups = (campaign.productionEvidence || []).map(groupSnapshot);
    const completeGroups = groups.filter((g) =>
      g.oliveKg !== null && g.oilKg !== null && g.yieldPct !== null
    );
    const consistentCompleteGroups = completeGroups.filter((g) => g.yieldConsistency === "coherent");

    let comparisonStatus = "non_quantifiable";
    let comparableFacts = null;

    if (groups.length === 1 && consistentCompleteGroups.length === 1) {
      comparisonStatus = "comparable_directement";
      comparableFacts = consistentCompleteGroups[0];
    } else if (groups.length === 1 && completeGroups.length === 1) {
      comparisonStatus = "comparable_apres_controle_coherence";
      comparableFacts = completeGroups[0];
    } else if (groups.length === 1) {
      comparisonStatus = "preuve_quantitative_incomplete";
      comparableFacts = groups[0];
    } else if (groups.length > 1) {
      comparisonStatus = "interpretation_groupes_requise";
    }

    return {
      campaign: campaign.campaign,
      evidenceLevel: campaign.evidenceLevel,
      productionEvidenceGroups: groups.length,
      productionObservationDocuments: campaign.productionObservationDocuments || 0,
      accountMovements: campaign.accountMovements || 0,
      comparisonStatus,
      comparableFacts,
      groups,
      sourceDocuments: campaign.sourceDocuments || [],
      safety: {
        annualTotalCalculated: false,
        note: groups.length > 1
          ? "Plusieurs groupes de faits sont présents : ne pas les additionner avant d'établir leur relation documentaire."
          : "La valeur affichée est une observation documentaire, pas automatiquement un total annuel définitif."
      }
    };
  });

  const directlyComparable = rows
    .filter((r) => r.comparisonStatus === "comparable_directement")
    .map((r) => ({
      campaign: r.campaign,
      oliveKg: r.comparableFacts.oliveKg,
      oilKg: r.comparableFacts.oilKg,
      yieldPct: r.comparableFacts.yieldPct,
      acidity: r.comparableFacts.acidity,
      documents: r.comparableFacts.documents
    }));

  const yieldRanking = [...directlyComparable]
    .filter((r) => r.yieldPct !== null)
    .sort((a, b) => b.yieldPct - a.yieldPct);

  const multiGroupCampaigns = rows
    .filter((r) => r.productionEvidenceGroups > 1)
    .map((r) => ({
      campaign: r.campaign,
      groups: r.groups.map((g) => ({
        evidenceGroupId: g.evidenceGroupId,
        oliveKg: g.oliveKg,
        oilKg: g.oilKg,
        yieldPct: g.yieldPct,
        grossLiquidation: g.grossLiquidation,
        netToReceive: g.netToReceive,
        documents: g.documents,
        documentTypes: g.documentTypes
      }))
    }));

  const incompleteSingleGroup = rows
    .filter((r) => r.comparisonStatus === "preuve_quantitative_incomplete")
    .map((r) => ({
      campaign: r.campaign,
      facts: r.comparableFacts,
      missing: ["oliveKg", "oilKg", "yieldPct"].filter((k) => r.comparableFacts?.[k] === null)
    }));

  const coherenceAlerts = rows.flatMap((r) =>
    r.groups
      .filter((g) => g.yieldConsistency === "a_verifier")
      .map((g) => ({
        campaign: r.campaign,
        evidenceGroupId: g.evidenceGroupId,
        oliveKg: g.oliveKg,
        oilKg: g.oilKg,
        yieldPct: g.yieldPct,
        calculatedYieldPct: g.calculatedYieldPct,
        delta: g.yieldDeltaPctPoint,
        documents: g.documents
      }))
  );

  const summary = {
    campaignsInCanonicalBase: rows.length,
    directlyComparableCampaigns: directlyComparable.length,
    campaignsRequiringGroupInterpretation: multiGroupCampaigns.length,
    incompleteSingleGroupCampaigns: incompleteSingleGroup.length,
    yieldCoherenceAlerts: coherenceAlerts.length,
    highestDocumentedYield: yieldRanking[0] || null,
    lowestDocumentedYield: yieldRanking.at(-1) || null,
    annualTotalsCalculated: false
  };

  const payload = {
    version: 28,
    generatedAt: new Date().toISOString(),
    basedOn: BASE,
    purpose: "Construire la première comparaison campagne par campagne à partir de la base canonique, sans addition automatique des groupes de preuves et en séparant les campagnes directement comparables de celles qui exigent encore une interprétation documentaire.",
    summary,
    rows,
    directlyComparable,
    yieldRanking,
    multiGroupCampaigns,
    incompleteSingleGroup,
    coherenceAlerts,
    safeguards: {
      noBlindSummation: true,
      noAnnualTotalClaim: true,
      evidenceProvenancePreserved: true,
      missingDataNotInterpretedAsZero: true
    }
  };

  writeJson(OUTPUT, payload);

  const lines = [
    "# FINCA MARIA — Comparaison des campagnes prouvées V28",
    "",
    `- Campagnes dans la base canonique : **${summary.campaignsInCanonicalBase}**`,
    `- Campagnes directement comparables : **${summary.directlyComparableCampaigns}**`,
    `- Campagnes avec plusieurs groupes à interpréter : **${summary.campaignsRequiringGroupInterpretation}**`,
    `- Campagnes à groupe unique mais incomplet : **${summary.incompleteSingleGroupCampaigns}**`,
    `- Alertes de cohérence rendement : **${summary.yieldCoherenceAlerts}**`,
    "",
    "## Campagnes directement comparables",
    "",
    ...(directlyComparable.length
      ? directlyComparable.map((r) => `- **${r.campaign}** : ${r.oliveKg} kg olives ; ${r.oilKg} kg huile ; rendement ${r.yieldPct} %${r.acidity !== null ? ` ; acidité ${r.acidity}` : ""}.`)
      : ["- Aucune campagne n'est encore directement comparable sans contrôle supplémentaire."]),
    "",
    "## Campagnes nécessitant une interprétation des groupes",
    "",
    ...(multiGroupCampaigns.length
      ? multiGroupCampaigns.map((r) => `- **${r.campaign}** : ${r.groups.length} groupes de preuves distincts — aucune addition automatique.`)
      : ["- Aucune."]),
    "",
    "## Campagnes quantitatives incomplètes",
    "",
    ...(incompleteSingleGroup.length
      ? incompleteSingleGroup.map((r) => `- **${r.campaign}** : manque ${r.missing.join(", ")}.`)
      : ["- Aucune."]),
    "",
    "V28 ne calcule aucun total annuel définitif et ne modifie aucun original ni copie classée."
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — COMPARAISON CAMPAGNES V28 ===");
  console.log("Campagnes base canonique :", summary.campaignsInCanonicalBase);
  console.log("Directement comparables :", summary.directlyComparableCampaigns);
  console.log("Plusieurs groupes à interpréter :", summary.campaignsRequiringGroupInterpretation);
  console.log("Groupes uniques incomplets :", summary.incompleteSingleGroupCampaigns);
  console.log("Alertes cohérence rendement :", summary.yieldCoherenceAlerts);
  if (summary.highestDocumentedYield) console.log("Rendement documenté le plus élevé (périmètre comparable) :", `${summary.highestDocumentedYield.campaign} | ${summary.highestDocumentedYield.yieldPct}%`);
  if (summary.lowestDocumentedYield) console.log("Rendement documenté le plus faible (périmètre comparable) :", `${summary.lowestDocumentedYield.campaign} | ${summary.lowestDocumentedYield.yieldPct}%`);
  console.log("Totaux annuels calculés : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V28 :", error.message || error);
  process.exitCode = 1;
}
