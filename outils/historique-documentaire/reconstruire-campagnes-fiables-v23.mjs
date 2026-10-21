#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const V18 = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const V22 = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V22.json");
const OUTPUT = path.join(ROOT, "_CAMPAGNES_FIABLES_V23.json");
const REQUESTS = path.join(ROOT, "_PIECES_A_DEMANDER_V23.json");
const REPORT = path.join(ROOT, "_RAPPORT_CAMPAGNES_FIABLES_V23.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function validCampaign(value) {
  const m = String(value || "").match(/^((?:19|20)\d{2})-((?:19|20)\d{2})$/);
  return !!(m && Number(m[2]) === Number(m[1]) + 1);
}

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function close(a, b, tolerance) {
  const x = n(a), y = n(b);
  if (x === null || y === null) return false;
  return Math.abs(x - y) <= tolerance;
}

function factRichness(facts) {
  return ["oliveKg", "oilKg", "yieldPct", "acidity", "netToReceive", "grossLiquidation"]
    .filter((k) => n(facts?.[k]) !== null).length;
}

function sourceStrength(source) {
  const s = String(source || "");
  if (s === "texte_document_explicite" || s === "campaignInference_document") return 5;
  if (s.includes("dates_document_concordantes")) return 4;
  if (s.includes("dates_ocr_recuperees_concordantes")) return 4;
  if (s.includes("majorite_dates_document")) return 3;
  if (s.includes("majorite_dates_ocr_recuperees")) return 3;
  if (s === "empreinte_production_corroboree") return 3;
  return 1;
}

function representativeGroup(groups) {
  if (!groups.length) return null;
  return [...groups].sort((a, b) => {
    const evidenceDelta = (b.evidenceCount || 0) - (a.evidenceCount || 0);
    if (evidenceDelta) return evidenceDelta;
    const richDelta = factRichness(b.facts) - factRichness(a.facts);
    if (richDelta) return richDelta;
    const sourceA = Math.max(0, ...(a.campaignSources || []).map(sourceStrength));
    const sourceB = Math.max(0, ...(b.campaignSources || []).map(sourceStrength));
    return sourceB - sourceA;
  })[0];
}

function main() {
  const v18 = readJson(V18);
  const v22 = readJson(V22);

  const observations = Array.isArray(v22.observations) ? v22.observations : [];
  const evidenceGroups = Array.isArray(v22.evidenceGroups) ? v22.evidenceGroups : [];
  const chronology = Array.isArray(v18.chronology) ? v18.chronology : [];

  const accountMovements = chronology
    .filter((e) => e.entity === "AGRI_SAN_JUAN")
    .filter((e) => e.type === "MOUVEMENT_EXTRAIT_COMPTE")
    .filter((e) => validCampaign(e.campaign))
    .map((e) => ({
      date: e.date || "",
      campaign: e.campaign,
      documentId: e.documentId || "",
      document: e.document || "",
      concept: e.concept || "",
      source: e.source || ""
    }));

  const campaignNames = unique([
    ...observations.map((o) => validCampaign(o.campaign) ? o.campaign : ""),
    ...evidenceGroups.map((g) => validCampaign(g.campaign) ? g.campaign : ""),
    ...accountMovements.map((m) => m.campaign)
  ]).sort();

  const campaigns = campaignNames.map((campaign) => {
    const obs = observations.filter((o) => o.campaign === campaign);
    const groups = evidenceGroups.filter((g) => g.campaign === campaign);
    const movements = accountMovements.filter((m) => m.campaign === campaign);
    const documentTypes = unique(obs.map((o) => o.type));
    const documents = unique([
      ...obs.map((o) => o.document),
      ...groups.flatMap((g) => g.documents || []),
      ...movements.map((m) => m.document)
    ]);
    const representative = representativeGroup(groups);
    const campaignSources = unique(obs.map((o) => o.campaignSource));
    const minConfidence = obs.length
      ? Math.min(...obs.map((o) => Number(o.campaignConfidence || 0)))
      : null;
    const maxConfidence = obs.length
      ? Math.max(...obs.map((o) => Number(o.campaignConfidence || 0)))
      : null;

    return {
      campaign,
      productionObservationDocuments: obs.length,
      productionEvidenceGroups: groups.length,
      accountMovements: movements.length,
      documentTypes,
      sourceDocuments: documents,
      campaignSources,
      campaignConfidenceRange: { min: minConfidence, max: maxConfidence },
      representativeProductionObservation: representative ? {
        evidenceGroupId: representative.evidenceGroupId,
        facts: representative.facts,
        evidenceCount: representative.evidenceCount,
        documents: representative.documents,
        documentTypes: representative.documentTypes,
        note: "Observation documentaire de référence. Elle n'est pas considérée automatiquement comme le total annuel de la campagne."
      } : null,
      productionEvidence: groups,
      accountMovementEvidence: movements,
      safety: {
        annualTotalCalculated: false,
        reason: groups.length > 1
          ? "Plusieurs groupes de faits distincts existent : aucune addition automatique tant que leur relation (apports distincts, acomptes, récapitulatif, doublons) n'est pas établie."
          : "Même avec un seul groupe, il est conservé comme observation prouvée et non comme total annuel définitif sans contrôle documentaire complémentaire."
      }
    };
  });

  const missingRequests = [];
  for (const campaign of campaigns) {
    const types = new Set(campaign.documentTypes);
    const hasLiquidation = types.has("LIQUIDATION_FACTURE") || types.has("LIQUIDATION");
    const hasSupportingProduction = types.has("TICKET_APPORT") || types.has("EXTRACTO_VALES_ALMAZARA") || campaign.accountMovements > 0;

    if (hasSupportingProduction && !hasLiquidation) {
      missingRequests.push({
        id: `AGRI_SAN_JUAN__${campaign.campaign}__LIQUIDATION`,
        campaign: campaign.campaign,
        status: "a_demander",
        certainty: "probable",
        priority: "haute",
        askTo: "Agri San Juan",
        askToCode: "AGRI_SAN_JUAN",
        documentWanted: `Liquidation(s) / facture(s) de la campagne ${campaign.campaign}`,
        reason: "Des preuves d'apports, de vales ou de mouvements de compte existent pour cette campagne, mais aucune liquidation/facture agricole complète n'est actuellement identifiée dans la base fiabilisée V22.",
        supportingDocuments: campaign.sourceDocuments
      });
    }
  }

  const control2010Groups = evidenceGroups.filter((g) =>
    g.campaign === "2010-2011" &&
    close(g.facts?.oliveKg, 1405, 0.5) &&
    close(g.facts?.oilKg, 264.82, 0.5) &&
    close(g.facts?.yieldPct, 18.85, 0.05)
  );

  const control2009Groups = evidenceGroups.filter((g) =>
    g.campaign === "2009-2010" &&
    close(g.facts?.oliveKg, 2537, 0.5) &&
    close(g.facts?.oilKg, 520.98, 0.1) &&
    close(g.facts?.yieldPct, 20.54, 0.1)
  );

  const withoutCampaign = observations.filter((o) => !validCampaign(o.campaign));
  const campaignsWithProduction = campaigns.filter((c) => c.productionEvidenceGroups > 0);
  const campaignsOnlyAccount = campaigns.filter((c) => c.productionEvidenceGroups === 0 && c.accountMovements > 0);

  const summary = {
    productionDocumentsV22: observations.length,
    productionEvidenceGroupsV22: evidenceGroups.length,
    campaignsReconstructed: campaigns.length,
    campaignsWithProductionEvidence: campaignsWithProduction.length,
    campaignsOnlySupportedByAccountMovements: campaignsOnlyAccount.length,
    earliestCampaign: campaigns[0]?.campaign || "",
    latestCampaign: campaigns.at(-1)?.campaign || "",
    observationsStillWithoutCampaign: withoutCampaign.length,
    probableMissingRequests: missingRequests.length,
    control2010_2011: {
      status: control2010Groups.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : control2010Groups.length === 0 ? "NON_RETROUVE" : "RISQUE_DOUBLE_COMPTAGE",
      groups: control2010Groups.length,
      documents: unique(control2010Groups.flatMap((g) => g.documents || []))
    },
    control2009_2010: {
      status: control2009Groups.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : control2009Groups.length === 0 ? "NON_RETROUVE" : "RISQUE_DOUBLE_COMPTAGE",
      groups: control2009Groups.length,
      documents: unique(control2009Groups.flatMap((g) => g.documents || []))
    }
  };

  const payload = {
    version: 23,
    generatedAt: new Date().toISOString(),
    basedOn: { productionEvidence: V22, agriculturalChronology: V18 },
    purpose: "Reconstruire les campagnes depuis la couche de preuves V22 fiabilisée, conserver séparément les mouvements de compte Agri San Juan, neutraliser le double comptage documentaire et recalculer les demandes de pièces sans inventer de total annuel.",
    summary,
    campaigns,
    observationsWithoutCampaign: withoutCampaign,
    missingDocumentRequests: missingRequests
  };

  writeJson(OUTPUT, payload);
  writeJson(REQUESTS, {
    generatedAt: payload.generatedAt,
    basedOn: V22,
    requests: missingRequests
  });

  const lines = [
    "# FINCA MARIA — Campagnes fiables V23",
    "",
    `- Documents de production V22 : **${summary.productionDocumentsV22}**`,
    `- Groupes de preuves de production V22 : **${summary.productionEvidenceGroupsV22}**`,
    `- Campagnes reconstruites : **${summary.campaignsReconstructed}**`,
    `- Campagnes avec preuve de production : **${summary.campaignsWithProductionEvidence}**`,
    `- Campagnes seulement soutenues par mouvements de compte : **${summary.campaignsOnlySupportedByAccountMovements}**`,
    `- Période des campagnes : **${summary.earliestCampaign || "?"} → ${summary.latestCampaign || "?"}**`,
    `- Observations de production encore sans campagne : **${summary.observationsStillWithoutCampaign}**`,
    `- Pièces probablement à demander : **${summary.probableMissingRequests}**`,
    `- Contrôle 2009-2010 : **${summary.control2009_2010.status}**`,
    `- Contrôle 2010-2011 : **${summary.control2010_2011.status}**`,
    "",
    "V23 ne calcule volontairement aucun total annuel lorsqu'il existe plusieurs groupes de faits. Les groupes sont des faits documentaires distincts ou potentiellement liés qui devront être interprétés avant toute addition.",
    "",
    "Aucun original ni copie de travail n'est modifié par ce script."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CAMPAGNES FIABLES V23 ===");
  console.log("Documents de production V22 :", summary.productionDocumentsV22);
  console.log("Groupes de preuves production V22 :", summary.productionEvidenceGroupsV22);
  console.log("Campagnes reconstruites :", summary.campaignsReconstructed);
  console.log("Campagnes avec preuve de production :", summary.campaignsWithProductionEvidence);
  console.log("Campagnes seulement par mouvements de compte :", summary.campaignsOnlySupportedByAccountMovements);
  console.log("Période campagnes :", `${summary.earliestCampaign || "?"} -> ${summary.latestCampaign || "?"}`);
  console.log("Observations encore sans campagne :", summary.observationsStillWithoutCampaign);
  console.log("Pièces probablement à demander :", summary.probableMissingRequests);
  console.log("Contrôle 2009-2010 :", `${summary.control2009_2010.status} | groupes ${summary.control2009_2010.groups} | documents ${summary.control2009_2010.documents.length}`);
  console.log("Contrôle 2010-2011 :", `${summary.control2010_2011.status} | groupes ${summary.control2010_2011.groups} | documents ${summary.control2010_2011.documents.length}`);
  console.log("Analyse :", OUTPUT);
  console.log("Pièces à demander :", REQUESTS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie de travail n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V23 :", error.message || error);
  process.exitCode = 1;
}
