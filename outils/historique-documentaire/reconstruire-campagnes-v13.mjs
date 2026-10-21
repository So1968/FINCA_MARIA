#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V12.json");
const OUTPUT = path.join(ROOT, "_CAMPAGNES_RECONSTRUITES_V13.json");
const DUPLICATES = path.join(ROOT, "_DOUBLONS_PREUVES_V13.json");
const REQUESTS = path.join(ROOT, "_PIECES_A_DEMANDER_V13.json");
const REPORT = path.join(ROOT, "_RAPPORT_CAMPAGNES_V13.md");

const PRODUCTION_TYPES = new Set([
  "TICKET_APPORT",
  "LIQUIDATION",
  "LIQUIDATION_FACTURE",
  "EXTRACTO_VALES_ALMAZARA"
]);

const TYPE_PRIORITY = {
  LIQUIDATION_FACTURE: 5,
  EXTRACTO_VALES_ALMAZARA: 4,
  TICKET_APPORT: 3,
  LIQUIDATION: 2,
  MOUVEMENT_EXTRAIT_COMPTE: 1
};

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
  const x = n(value);
  if (x === null) return null;
  const p = 10 ** digits;
  return Math.round(x * p) / p;
}

function normalizeCampaign(value) {
  const m = String(value || "").match(/^\s*((?:19|20)\d{2})\s*[-/]\s*((?:19|20)\d{2})\s*$/);
  if (!m) return "";
  const a = Number(m[1]);
  const b = Number(m[2]);
  return b === a + 1 ? `${a}-${b}` : "";
}

function campaignConfidence(event, doc) {
  if (!event?.campaign) return { level: "absente", score: 0, source: "none" };
  if (event.source === "evenement_interne_extrait_compte") {
    return { level: "forte", score: 0.9, source: "ligne_extrait_compte" };
  }
  const source = doc?.campaignInference?.source || "";
  if (source === "document") return { level: "forte", score: 1, source: "document" };
  if (source === "date_inference") return { level: "moyenne", score: 0.55, source: "date_inference" };
  return { level: "moyenne", score: 0.7, source: source || "chronologie" };
}

function factCount(facts) {
  return ["oliveKg", "oilKg", "yieldPct", "acidity", "netToReceive", "grossLiquidation", "taxBase"]
    .filter((key) => n(facts?.[key]) !== null).length;
}

function productionFacts(event, doc) {
  const sourceFacts = event?.facts || doc?.factsV7 || doc?.facts || {};
  return {
    oliveKg: round(sourceFacts.oliveKg, 2),
    oilKg: round(sourceFacts.oilKg, 2),
    yieldPct: round(sourceFacts.yieldPct, 4),
    acidity: round(sourceFacts.acidity, 4),
    netToReceive: round(sourceFacts.netToReceive, 2),
    grossLiquidation: round(sourceFacts.grossLiquidation, 2),
    taxBase: round(sourceFacts.taxBase, 2)
  };
}

function close(a, b, tolerance) {
  const x = n(a), y = n(b);
  if (x === null || y === null) return false;
  return Math.abs(x - y) <= tolerance;
}

function sameUnderlyingProduction(a, b) {
  if (!a.campaign || a.campaign !== b.campaign) return false;
  const af = a.facts, bf = b.facts;
  let strongMatches = 0;
  if (close(af.oliveKg, bf.oliveKg, 0.5)) strongMatches += 1;
  if (close(af.oilKg, bf.oilKg, 0.5)) strongMatches += 1;
  if (close(af.yieldPct, bf.yieldPct, 0.03)) strongMatches += 1;
  return strongMatches >= 2;
}

function observationScore(obs) {
  return (TYPE_PRIORITY[obs.type] || 0) * 10 + factCount(obs.facts) * 2 + (obs.campaignConfidence?.score || 0);
}

function representative(group) {
  return [...group].sort((a, b) => observationScore(b) - observationScore(a))[0];
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function buildRequests(campaigns) {
  const requests = [];
  for (const campaign of campaigns) {
    const types = new Set(campaign.documentTypes);
    const hasLiquidation = types.has("LIQUIDATION") || types.has("LIQUIDATION_FACTURE");
    const hasSupporting = types.has("TICKET_APPORT") || types.has("EXTRACTO_VALES_ALMAZARA") || campaign.accountMovements > 0;
    if (hasSupporting && !hasLiquidation) {
      requests.push({
        id: `AGRI_SAN_JUAN__${campaign.campaign}__LIQUIDATION`,
        priority: "haute",
        certainty: "probable",
        campaign: campaign.campaign,
        documentWanted: `Liquidation(s) / facture(s) de la campagne ${campaign.campaign}`,
        askTo: "S.C.A. Agrícola San Juan",
        askToCode: "AGRI_SAN_JUAN",
        reason: "La campagne possède des preuves d'apport, de vales ou de mouvements de compte, mais aucune liquidation/facture complète n'est présente dans la base nettoyée.",
        evidenceDocuments: campaign.sourceDocuments
      });
    }
  }
  return requests;
}

function main() {
  const input = readJson(INPUT);
  const documents = Array.isArray(input.documents) ? input.documents : [];
  const chronology = Array.isArray(input.chronology) ? input.chronology : [];
  const docsById = new Map(documents.filter((d) => d.documentId).map((d) => [d.documentId, d]));
  const docsByName = new Map(documents.filter((d) => d.originalName).map((d) => [d.originalName, d]));

  const assigned = [];
  const unassigned = [];

  chronology.forEach((event, index) => {
    const campaign = normalizeCampaign(event.campaign);
    const doc = docsById.get(event.documentId) || docsByName.get(event.document) || null;
    const item = {
      eventId: `V13E${String(index + 1).padStart(4, "0")}`,
      date: event.date || "",
      source: event.source || "",
      entity: event.entity || doc?.refinedEntity?.code || "",
      type: event.type || doc?.refinedType?.code || "",
      campaign,
      campaignConfidence: campaignConfidence({ ...event, campaign }, doc),
      sourceDocumentId: event.documentId || doc?.documentId || "",
      sourceDocument: event.document || doc?.originalName || "",
      dossierKey: event.dossierKey || doc?.dossierKey || "",
      concept: event.concept || "",
      rawLine: event.rawLine || "",
      facts: productionFacts(event, doc)
    };
    if (campaign) assigned.push(item);
    else unassigned.push(item);
  });

  const byCampaign = new Map();
  for (const event of assigned) {
    if (!byCampaign.has(event.campaign)) byCampaign.set(event.campaign, []);
    byCampaign.get(event.campaign).push(event);
  }

  const duplicateGroups = [];
  const campaigns = [];

  for (const [campaign, events] of [...byCampaign.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const production = events.filter((e) => PRODUCTION_TYPES.has(e.type) && factCount(e.facts) >= 2);
    const groups = [];

    for (const obs of production) {
      let group = groups.find((g) => g.some((member) => sameUnderlyingProduction(member, obs)));
      if (!group) {
        group = [];
        groups.push(group);
      }
      group.push(obs);
    }

    const evidenceGroups = groups.map((group, i) => {
      const rep = representative(group);
      const duplicate = group.length > 1;
      const item = {
        evidenceGroupId: `${campaign}__P${String(i + 1).padStart(2, "0")}`,
        sameUnderlyingFactCandidate: duplicate,
        representativeEventId: rep.eventId,
        representativeType: rep.type,
        facts: rep.facts,
        supportingEventIds: group.map((x) => x.eventId),
        supportingDocuments: unique(group.map((x) => x.sourceDocument)),
        campaignConfidence: rep.campaignConfidence,
        note: duplicate
          ? "Plusieurs pièces portent des quantités/rendements quasi identiques : elles sont traitées comme preuves possibles du même fait et ne doivent pas être additionnées entre elles."
          : "Observation distincte à ce stade ; elle n'est pas automatiquement additionnée à d'autres observations de nature différente."
      };
      if (duplicate) duplicateGroups.push({ campaign, ...item });
      return item;
    });

    const docs = unique(events.map((e) => e.sourceDocument));
    const types = unique(events.map((e) => e.type));
    const accountMovements = events.filter((e) => e.type === "MOUVEMENT_EXTRAIT_COMPTE").length;
    const strongCampaignEvents = events.filter((e) => e.campaignConfidence.score >= 0.85).length;
    const inferredCampaignEvents = events.filter((e) => e.campaignConfidence.source === "date_inference").length;

    const referenceCandidates = evidenceGroups
      .map((g) => ({ ...g, score: TYPE_PRIORITY[g.representativeType] || 0 }))
      .sort((a, b) => b.score - a.score || factCount(b.facts) - factCount(a.facts));

    campaigns.push({
      campaign,
      chronologyEvents: events.length,
      strongCampaignEvents,
      inferredCampaignEvents,
      accountMovements,
      sourceDocuments: docs,
      documentTypes: types,
      productionEvidenceGroups: evidenceGroups,
      duplicateEvidenceGroups: evidenceGroups.filter((g) => g.sameUnderlyingFactCandidate).length,
      referenceObservation: referenceCandidates[0] || null,
      safetyNote: "La référence de campagne est une observation documentaire, pas automatiquement un total définitif de récolte. Les groupes de preuves ne sont pas additionnés entre eux sans règle métier supplémentaire."
    });
  }

  const requests = buildRequests(campaigns);
  const first = campaigns[0]?.campaign || "";
  const last = campaigns.at(-1)?.campaign || "";
  const summary = {
    documents: documents.length,
    chronologyEvents: chronology.length,
    campaignEventsAssigned: assigned.length,
    campaignEventsUnassigned: unassigned.length,
    campaigns: campaigns.length,
    earliestCampaign: first,
    latestCampaign: last,
    productionEvidenceGroups: campaigns.reduce((s, c) => s + c.productionEvidenceGroups.length, 0),
    duplicateEvidenceGroups: duplicateGroups.length,
    probableMissingRequests: requests.length,
    manualReviewDocumentsPreserved: Array.isArray(input.manualReview) ? input.manualReview.length : 0
  };

  const payload = {
    version: 13,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Reconstruire les campagnes à partir des preuves V12, relier chaque observation à ses documents sources et empêcher le double comptage de justificatifs portant le même fait.",
    summary,
    campaigns,
    unassignedChronologyEvents: unassigned,
    duplicateEvidenceGroups: duplicateGroups,
    missingDocumentRequests: requests
  };

  writeJson(OUTPUT, payload);
  writeJson(DUPLICATES, { generatedAt: payload.generatedAt, groups: duplicateGroups });
  writeJson(REQUESTS, { generatedAt: payload.generatedAt, requests });

  const lines = [
    "# FINCA MARIA — Reconstruction des campagnes V13",
    "",
    "V13 travaille sur la base V12 nettoyée. Elle regroupe les événements par campagne et rapproche les pièces qui semblent prouver le même fait de production.",
    "",
    `- Documents dans la base : **${summary.documents}**`,
    `- Événements chronologiques : **${summary.chronologyEvents}**`,
    `- Événements rattachés à une campagne : **${summary.campaignEventsAssigned}**`,
    `- Événements encore sans campagne : **${summary.campaignEventsUnassigned}**`,
    `- Campagnes reconstruites : **${summary.campaigns}**`,
    `- Période de campagnes : **${summary.earliestCampaign || "?"} → ${summary.latestCampaign || "?"}**`,
    `- Groupes de preuves de production : **${summary.productionEvidenceGroups}**`,
    `- Groupes de doublons probables : **${summary.duplicateEvidenceGroups}**`,
    `- Pièces probablement manquantes à demander : **${summary.probableMissingRequests}**`,
    "",
    "## Règle anti-double comptage",
    "",
    "Deux pièces d'une même campagne portant au moins deux mesures concordantes parmi kg d'olives, kg d'huile et rendement sont regroupées comme preuves possibles du même fait. Elles ne sont pas additionnées entre elles.",
    "",
    "## Prudence métier",
    "",
    "Une liquidation, un ticket d'apport et un extrait de vales peuvent documenter des niveaux différents d'un même processus. V13 choisit une observation de référence mais ne la transforme pas automatiquement en total annuel définitif."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — RECONSTRUCTION CAMPAGNES V13 ===");
  console.log("Documents :", summary.documents);
  console.log("Événements chronologiques :", summary.chronologyEvents);
  console.log("Événements rattachés à une campagne :", summary.campaignEventsAssigned);
  console.log("Événements sans campagne :", summary.campaignEventsUnassigned);
  console.log("Campagnes reconstruites :", summary.campaigns);
  console.log("Période campagnes :", `${summary.earliestCampaign || "?"} -> ${summary.latestCampaign || "?"}`);
  console.log("Groupes de preuves production :", summary.productionEvidenceGroups);
  console.log("Doublons probables neutralisés :", summary.duplicateEvidenceGroups);
  console.log("Pièces probablement à demander :", summary.probableMissingRequests);
  console.log("Analyse campagnes :", OUTPUT);
  console.log("Doublons :", DUPLICATES);
  console.log("Demandes :", REQUESTS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V13 :", error.message || error);
  process.exitCode = 1;
}
