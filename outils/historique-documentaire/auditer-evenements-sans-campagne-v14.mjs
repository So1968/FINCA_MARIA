#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_CAMPAGNES_RECONSTRUITES_V13.json");
const OUTPUT = path.join(ROOT, "_AUDIT_SANS_CAMPAGNE_V14.json");
const CANDIDATES = path.join(ROOT, "_CANDIDATS_RATTACHEMENT_CAMPAGNES_V14.json");
const REPORT = path.join(ROOT, "_RAPPORT_AUDIT_SANS_CAMPAGNE_V14.md");

const CAMPAIGN_RELEVANT_TYPES = new Set([
  "TICKET_APPORT",
  "LIQUIDATION",
  "LIQUIDATION_FACTURE",
  "EXTRACTO_VALES_ALMAZARA",
  "MOUVEMENT_EXTRAIT_COMPTE"
]);

const REFERENCE_OR_ADMIN_TYPES = new Set([
  "PAC_SOLICITUD_UNICA",
  "PAC_RESOLUTION",
  "PLAN_PARCELLE",
  "DATOS_IDENTIFICATIVOS_SIGPAC",
  "RESUMEN_NOTIFICACIONES_COMUNICACIONES"
]);

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
  if (!year || month < 1 || month > 12) return "";
  const start = month >= 9 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function groupCount(items, getter) {
  const out = {};
  for (const item of items) {
    const key = getter(item) || "INCONNU";
    out[key] = (out[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(out).sort((a, b) => b[1] - a[1]));
}

function inspectEvent(event) {
  const combined = [event.rawLine, event.concept].filter(Boolean).join("\n");
  const explicit = explicitCampaign(combined);
  const entity = String(event.entity || "");
  const type = String(event.type || "");
  const candidateByDate = dateCampaign(event.date);

  if (explicit) {
    return {
      ...event,
      v14Class: "CAMPAGNE_EXPLICITE_RECUPEREE",
      proposedCampaign: explicit.campaign,
      proposalConfidence: 0.97,
      proposalSource: "texte_evenement",
      evidence: explicit.matchedText,
      safeToUseForCampaignReconstruction: true
    };
  }

  if (entity === "AGRI_SAN_JUAN" && CAMPAIGN_RELEVANT_TYPES.has(type) && candidateByDate) {
    return {
      ...event,
      v14Class: "CANDIDAT_PAR_DATE",
      proposedCampaign: candidateByDate,
      proposalConfidence: type === "MOUVEMENT_EXTRAIT_COMPTE" ? 0.55 : 0.65,
      proposalSource: "date_evenement",
      evidence: event.date || "",
      safeToUseForCampaignReconstruction: false,
      note: "Rattachement plausible mais non confirmé par une mention explicite de campagne."
    };
  }

  if (REFERENCE_OR_ADMIN_TYPES.has(type) || entity === "PAC_ADMINISTRATION" || entity === "AGENCIA_TRIBUTARIA" || entity === "SIGPAC" || entity === "DOCUMENT_FONCIER") {
    return {
      ...event,
      v14Class: "HORS_CAMPAGNE_PRODUCTION",
      proposedCampaign: "",
      proposalConfidence: 1,
      proposalSource: "nature_documentaire",
      safeToUseForCampaignReconstruction: false
    };
  }

  if (entity !== "AGRI_SAN_JUAN" && !CAMPAIGN_RELEVANT_TYPES.has(type)) {
    return {
      ...event,
      v14Class: "HORS_CAMPAGNE_OU_AUTRE_FLUX",
      proposedCampaign: "",
      proposalConfidence: 0.85,
      proposalSource: "entite_type",
      safeToUseForCampaignReconstruction: false
    };
  }

  return {
    ...event,
    v14Class: "A_REVOIR",
    proposedCampaign: "",
    proposalConfidence: 0,
    proposalSource: "aucun",
    safeToUseForCampaignReconstruction: false
  };
}

function main() {
  const input = readJson(INPUT);
  const unassigned = Array.isArray(input.unassignedChronologyEvents)
    ? input.unassignedChronologyEvents
    : [];

  const audited = unassigned.map(inspectEvent);
  const explicit = audited.filter((x) => x.v14Class === "CAMPAGNE_EXPLICITE_RECUPEREE");
  const dateCandidates = audited.filter((x) => x.v14Class === "CANDIDAT_PAR_DATE");
  const outside = audited.filter((x) => x.v14Class === "HORS_CAMPAGNE_PRODUCTION" || x.v14Class === "HORS_CAMPAGNE_OU_AUTRE_FLUX");
  const review = audited.filter((x) => x.v14Class === "A_REVOIR");

  const existingCampaigns = (input.campaigns || []).map((c) => c.campaign).filter(Boolean);
  const explicitCampaigns = explicit.map((x) => x.proposedCampaign).filter(Boolean);
  const dateCampaigns = dateCandidates.map((x) => x.proposedCampaign).filter(Boolean);
  const allObservedCampaigns = [...new Set([...existingCampaigns, ...explicitCampaigns])].sort();
  const allCandidateCampaigns = [...new Set([...allObservedCampaigns, ...dateCampaigns])].sort();

  const summary = {
    unassignedInput: unassigned.length,
    explicitCampaignRecovered: explicit.length,
    dateCandidates: dateCandidates.length,
    outsideProductionCampaignScope: outside.length,
    stillToReview: review.length,
    existingCampaignsV13: existingCampaigns.length,
    campaignsAfterExplicitRecovery: allObservedCampaigns.length,
    earliestAfterExplicitRecovery: allObservedCampaigns[0] || "",
    latestAfterExplicitRecovery: allObservedCampaigns.at(-1) || "",
    candidateCampaignSpanIncludingDateProposals: {
      earliest: allCandidateCampaigns[0] || "",
      latest: allCandidateCampaigns.at(-1) || ""
    },
    byClass: groupCount(audited, (x) => x.v14Class),
    byType: groupCount(audited, (x) => x.type),
    byEntity: groupCount(audited, (x) => x.entity),
    dateCandidatesByCampaign: groupCount(dateCandidates, (x) => x.proposedCampaign),
    explicitRecoveredByCampaign: groupCount(explicit, (x) => x.proposedCampaign)
  };

  const payload = {
    version: 14,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Auditer les événements sans campagne avant tout rattachement : récupérer les mentions explicites, isoler les simples candidats par date et exclure les flux hors campagne de production.",
    summary,
    auditedEvents: audited,
    explicitCampaignRecovered: explicit,
    dateCandidates,
    outsideProductionCampaignScope: outside,
    stillToReview: review
  };

  writeJson(OUTPUT, payload);
  writeJson(CANDIDATES, {
    generatedAt: payload.generatedAt,
    explicitCampaignRecovered: explicit,
    dateCandidates,
    stillToReview: review
  });

  const lines = [
    "# FINCA MARIA — Audit des événements sans campagne V14",
    "",
    `- Événements sans campagne en entrée : **${summary.unassignedInput}**`,
    `- Campagnes explicites récupérées dans le texte : **${summary.explicitCampaignRecovered}**`,
    `- Candidats de campagne proposés uniquement par la date : **${summary.dateCandidates}**`,
    `- Événements hors périmètre campagne de production : **${summary.outsideProductionCampaignScope}**`,
    `- Événements restant réellement à revoir : **${summary.stillToReview}**`,
    "",
    `- Campagnes V13 : **${summary.existingCampaignsV13}**`,
    `- Campagnes après récupération explicite : **${summary.campaignsAfterExplicitRecovery}**`,
    `- Période prouvée après récupération explicite : **${summary.earliestAfterExplicitRecovery || "?"} → ${summary.latestAfterExplicitRecovery || "?"}**`,
    `- Période candidate si l'on incluait les propositions par date : **${summary.candidateCampaignSpanIncludingDateProposals.earliest || "?"} → ${summary.candidateCampaignSpanIncludingDateProposals.latest || "?"}**`,
    "",
    "Les rattachements par date ne sont pas validés automatiquement. Ils servent uniquement à repérer les campagnes potentiellement cachées dans la chronologie.",
    "Les documents PAC, fiscaux, SIGPAC et fonciers restent hors total de production même lorsqu'ils ont une date."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — AUDIT SANS CAMPAGNE V14 ===");
  console.log("Événements sans campagne audités :", summary.unassignedInput);
  console.log("Campagnes explicites récupérées :", summary.explicitCampaignRecovered);
  console.log("Candidats par date :", summary.dateCandidates);
  console.log("Hors campagne de production :", summary.outsideProductionCampaignScope);
  console.log("Encore à revoir :", summary.stillToReview);
  console.log("Campagnes V13 :", summary.existingCampaignsV13);
  console.log("Campagnes après récupération explicite :", summary.campaignsAfterExplicitRecovery);
  console.log("Période prouvée après récupération explicite :", `${summary.earliestAfterExplicitRecovery || "?"} -> ${summary.latestAfterExplicitRecovery || "?"}`);
  console.log("Période candidate avec rattachements par date :", `${summary.candidateCampaignSpanIncludingDateProposals.earliest || "?"} -> ${summary.candidateCampaignSpanIncludingDateProposals.latest || "?"}`);
  console.log("Audit :", OUTPUT);
  console.log("Candidats :", CANDIDATES);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V14 :", error.message || error);
  process.exitCode = 1;
}
