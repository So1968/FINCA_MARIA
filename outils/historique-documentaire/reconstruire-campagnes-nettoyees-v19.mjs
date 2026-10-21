#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const OUTPUT = path.join(ROOT, "_CAMPAGNES_RECONSTRUITES_V19.json");
const DUPLICATES = path.join(ROOT, "_DOUBLONS_PREUVES_V19.json");
const REQUESTS = path.join(ROOT, "_PIECES_A_DEMANDER_V19.json");
const REPORT = path.join(ROOT, "_RAPPORT_CAMPAGNES_V19.md");

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
  let strongMatches = 0;
  if (close(a.facts.oliveKg, b.facts.oliveKg, 0.5)) strongMatches += 1;
  if (close(a.facts.oilKg, b.facts.oilKg, 0.5)) strongMatches += 1;
  if (close(a.facts.yieldPct, b.facts.yieldPct, 0.03)) strongMatches += 1;
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
    const agriTypes = new Set(campaign.agriSanJuanDocumentTypes || []);
    const hasLiquidation = agriTypes.has("LIQUIDATION") || agriTypes.has("LIQUIDATION_FACTURE");
    const hasSupporting = agriTypes.has("TICKET_APPORT") || agriTypes.has("EXTRACTO_VALES_ALMAZARA") || campaign.agriSanJuanAccountMovements > 0;
    if (hasSupporting && !hasLiquidation) {
      requests.push({
        id: `AGRI_SAN_JUAN__${campaign.campaign}__LIQUIDATION`,
        priority: "haute",
        certainty: "probable",
        campaign: campaign.campaign,
        documentWanted: `Liquidation(s) / facture(s) de la campagne ${campaign.campaign}`,
        askTo: "Agri San Juan",
        askToCode: "AGRI_SAN_JUAN",
        reason: "La campagne possède des preuves Agri San Juan d'apport, de vales ou de mouvements de compte, mais aucune liquidation/facture agricole complète n'est présente dans la base V18 nettoyée.",
        evidenceDocuments: campaign.agriSanJuanSourceDocuments
      });
    }
  }
  return requests;
}

function control2010(campaigns) {
  const c = campaigns.find((x) => x.campaign === "2010-2011");
  if (!c) return { campaignFound: false, knownObservationGroups: 0, supportingDocuments: 0, doubleCountRisk: null };
  const matches = c.productionEvidenceGroups.filter((g) =>
    close(g.facts?.oliveKg, 1405, 0.5) &&
    close(g.facts?.oilKg, 264.82, 0.5) &&
    close(g.facts?.yieldPct, 18.85, 0.05)
  );
  return {
    campaignFound: true,
    knownObservationGroups: matches.length,
    supportingDocuments: unique(matches.flatMap((g) => g.supportingDocuments || [])).length,
    doubleCountRisk: matches.length > 1,
    status: matches.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : matches.length === 0 ? "OBSERVATION_CONNUE_NON_RETROUVEE" : "RISQUE_DOUBLE_COMPTAGE",
    matchingGroups: matches
  };
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
    const entity = event.entity || doc?.refinedEntity?.code || "";
    const type = event.type || doc?.refinedType?.code || "";
    const item = {
      eventId: `V19E${String(index + 1).padStart(4, "0")}`,
      date: event.date || "",
      source: event.source || "",
      entity,
      type,
      campaign,
      campaignConfidence: campaignConfidence({ ...event, campaign }, doc),
      sourceDocumentId: event.documentId || doc?.documentId || "",
      sourceDocument: event.document || doc?.originalName || "",
      concept: event.concept || "",
      rawLine: event.rawLine || "",
      facts: productionFacts(event, doc)
    };
    if (campaign) assigned.push(item); else unassigned.push(item);
  });

  const byCampaign = new Map();
  for (const event of assigned) {
    if (!byCampaign.has(event.campaign)) byCampaign.set(event.campaign, []);
    byCampaign.get(event.campaign).push(event);
  }

  const duplicateGroups = [];
  const campaigns = [];

  for (const [campaign, events] of [...byCampaign.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const agriEvents = events.filter((e) => e.entity === "AGRI_SAN_JUAN");
    const production = agriEvents.filter((e) => PRODUCTION_TYPES.has(e.type) && factCount(e.facts) >= 2);
    const groups = [];

    for (const obs of production) {
      let group = groups.find((g) => g.some((member) => sameUnderlyingProduction(member, obs)));
      if (!group) { group = []; groups.push(group); }
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
          ? "Plusieurs pièces Agri San Juan portent des mesures quasi identiques : elles sont neutralisées comme preuves possibles du même fait."
          : "Observation documentaire distincte ; elle n'est pas additionnée automatiquement à une autre observation."
      };
      if (duplicate) duplicateGroups.push({ campaign, ...item });
      return item;
    });

    const referenceCandidates = evidenceGroups
      .map((g) => ({ ...g, score: TYPE_PRIORITY[g.representativeType] || 0 }))
      .sort((a, b) => b.score - a.score || factCount(b.facts) - factCount(a.facts));

    campaigns.push({
      campaign,
      chronologyEvents: events.length,
      agriSanJuanEvents: agriEvents.length,
      strongCampaignEvents: agriEvents.filter((e) => e.campaignConfidence.score >= 0.85).length,
      inferredCampaignEvents: agriEvents.filter((e) => e.campaignConfidence.source === "date_inference").length,
      agriSanJuanAccountMovements: agriEvents.filter((e) => e.type === "MOUVEMENT_EXTRAIT_COMPTE").length,
      sourceDocuments: unique(events.map((e) => e.sourceDocument)),
      agriSanJuanSourceDocuments: unique(agriEvents.map((e) => e.sourceDocument)),
      documentTypes: unique(events.map((e) => e.type)),
      agriSanJuanDocumentTypes: unique(agriEvents.map((e) => e.type)),
      productionEvidenceGroups: evidenceGroups,
      duplicateEvidenceGroups: evidenceGroups.filter((g) => g.sameUnderlyingFactCandidate).length,
      referenceObservation: referenceCandidates[0] || null,
      safetyNote: "Une observation de référence n'est pas automatiquement un total annuel. Les preuves concordantes sont regroupées et non additionnées."
    });
  }

  const requests = buildRequests(campaigns);
  const control = control2010(campaigns);
  const summary = {
    documents: documents.length,
    chronologyEventsV18: chronology.length,
    campaignEventsAssigned: assigned.length,
    campaignEventsUnassigned: unassigned.length,
    campaigns: campaigns.length,
    earliestCampaign: campaigns[0]?.campaign || "",
    latestCampaign: campaigns.at(-1)?.campaign || "",
    productionEvidenceGroups: campaigns.reduce((s, c) => s + c.productionEvidenceGroups.length, 0),
    duplicateEvidenceGroups: duplicateGroups.length,
    probableMissingRequests: requests.length,
    control2010_2011: control
  };

  const payload = {
    version: 19,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Reconstruire les campagnes uniquement depuis la chronologie V18 nettoyée, avec preuves Agri San Juan, neutralisation des doublons et contrôle spécifique 2010-2011.",
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
    "# FINCA MARIA — Campagnes nettoyées V19",
    "",
    `- Chronologie agricole V18 : **${summary.chronologyEventsV18} événements**`,
    `- Événements rattachés à une campagne : **${summary.campaignEventsAssigned}**`,
    `- Événements sans campagne : **${summary.campaignEventsUnassigned}**`,
    `- Campagnes reconstruites : **${summary.campaigns}**`,
    `- Période campagnes : **${summary.earliestCampaign || "?"} → ${summary.latestCampaign || "?"}**`,
    `- Groupes de preuves de production : **${summary.productionEvidenceGroups}**`,
    `- Doublons probables neutralisés : **${summary.duplicateEvidenceGroups}**`,
    `- Pièces probablement à demander : **${summary.probableMissingRequests}**`,
    "",
    "## Contrôle 2010-2011",
    `- Statut : **${control.status || "campagne absente"}**`,
    `- Groupes retrouvant 1 405 kg olives / 264,82 kg huile / ~18,85 % : **${control.knownObservationGroups}**`,
    `- Documents justificatifs associés : **${control.supportingDocuments}**`,
    "",
    "V19 n'utilise comme preuves de production que les événements Agri San Juan et n'additionne pas les justificatifs qui semblent décrire le même fait."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CAMPAGNES NETTOYÉES V19 ===");
  console.log("Chronologie agricole V18 :", summary.chronologyEventsV18);
  console.log("Événements rattachés à une campagne :", summary.campaignEventsAssigned);
  console.log("Événements sans campagne :", summary.campaignEventsUnassigned);
  console.log("Campagnes reconstruites :", summary.campaigns);
  console.log("Période campagnes :", `${summary.earliestCampaign || "?"} -> ${summary.latestCampaign || "?"}`);
  console.log("Groupes de preuves production :", summary.productionEvidenceGroups);
  console.log("Doublons probables neutralisés :", summary.duplicateEvidenceGroups);
  console.log("Pièces probablement à demander :", summary.probableMissingRequests);
  console.log("Contrôle 2010-2011 :", control.status, "| groupes", control.knownObservationGroups, "| documents", control.supportingDocuments);
  console.log("Analyse :", OUTPUT);
  console.log("Aucun original ni copie de travail n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V19 :", error.message || error);
  process.exitCode = 1;
}
