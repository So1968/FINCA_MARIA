#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_TEST_TRANCHE_ANCIENNES_CAMPAGNES_V5.json");
const OUTPUT = path.join(ROOT, "_TEST_TRANCHE_ANCIENNES_CAMPAGNES_V6.json");
const EVENTS = path.join(ROOT, "_EVENEMENTS_INTERNES_TRANCHE_V6.json");
const ANOMALIES = path.join(ROOT, "_ANOMALIES_EVENEMENTS_TRANCHE_V6.json");

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function isPeriodHeader(line) {
  const s = norm(line).replace(/["']/g, " ").replace(/\s+/g, " ");
  return /\b(?:periodo|penodo)\s+desde\b/.test(s) && /\bhasta\b/.test(s);
}

function normalizeCampaignFromRawLine(line, existing) {
  const raw = String(line || "");
  const m = raw.match(/(?:CAMPA[ÑN]A|CP[ÑN]A)\s+(\d{2,4})\s*[\/]\s*(\d{2,4})/i);
  if (!m) return { campaign: existing || "", changed: false, status: existing ? "conservee" : "absente" };

  let a = Number(m[1]);
  let b = Number(m[2]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    return { campaign: existing || "", changed: false, status: "illisible" };
  }

  if (String(m[1]).length === 2) a += a >= 70 ? 1900 : 2000;
  if (String(m[2]).length === 2) {
    const century = Math.floor(a / 100) * 100;
    b += century;
    if (b < a - 50) b += 100;
  }

  const campaign = `${a}-${b}`;
  if (b === a + 1) {
    return { campaign, changed: campaign !== existing, status: "coherente" };
  }

  return {
    campaign,
    changed: campaign !== existing,
    status: "ocr_a_verifier"
  };
}

function cleanEvent(event) {
  const rawLine = String(event.rawLine || "");

  if (isPeriodHeader(rawLine)) {
    return {
      action: "exclude_header",
      reason: "entete_de_periode_pas_un_evenement",
      event: {
        ...event,
        excludedFromEvents: true,
        exclusionReason: "entete_de_periode_pas_un_evenement"
      }
    };
  }

  const campaignFix = normalizeCampaignFromRawLine(rawLine, event.campaignCandidate || "");
  const cleaned = {
    ...event,
    campaignCandidate: campaignFix.campaign,
    campaignStatus: campaignFix.status,
    campaignNormalizedV6: campaignFix.changed
  };

  const dates = Array.isArray(cleaned.dateCandidates) ? cleaned.dateCandidates : [];
  const uniqueDates = [...new Set(dates)];
  const uniqueYears = [...new Set(uniqueDates.map((d) => String(d).slice(0, 4)).filter(Boolean))];

  let reasons = [];
  if (uniqueYears.length > 1) reasons.push("annees_contradictoires_ocr");
  if (campaignFix.status === "ocr_a_verifier") reasons.push("campagne_incoherente_ocr");

  cleaned.needsReview = reasons.length > 0;
  cleaned.reviewReasons = reasons;
  cleaned.usableForChronology = !cleaned.needsReview && uniqueDates.length >= 1;

  return {
    action: cleaned.needsReview ? "keep_as_anomaly" : "keep_as_event",
    reason: reasons.join("+") || "evenement_coherent",
    event: cleaned
  };
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Résultat V5 introuvable : ${INPUT}`);
  const input = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const sourceEvents = Array.isArray(input.internalEvents) ? input.internalEvents : [];

  const keptEvents = [];
  const excludedHeaders = [];
  const anomalies = [];
  let normalizedCampaigns = 0;

  for (const source of sourceEvents) {
    const result = cleanEvent(source);
    if (result.event.campaignNormalizedV6) normalizedCampaigns += 1;

    if (result.action === "exclude_header") {
      excludedHeaders.push(result.event);
      continue;
    }

    keptEvents.push(result.event);
    if (result.action === "keep_as_anomaly") anomalies.push(result.event);
  }

  const usable = keptEvents.filter((e) => e.usableForChronology);
  const payload = {
    version: 6,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Écarter les en-têtes de période des événements, normaliser les campagnes courtes et empêcher les lignes OCR contradictoires d'entrer dans la chronologie.",
    summary: {
      sourceEvents: sourceEvents.length,
      periodHeadersExcluded: excludedHeaders.length,
      campaignsNormalized: normalizedCampaigns,
      eventsAfterCleanup: keptEvents.length,
      usableEvents: usable.length,
      eventsStillNeedingReview: anomalies.length,
      documentsTotallyUnknown: input.summary?.completelyUnknown ?? null,
      contextualAnnexesToReview: input.summary?.contextualAnnexesToReview ?? null
    },
    documents: input.documents || [],
    events: keptEvents,
    usableEvents: usable,
    excludedPeriodHeaders: excludedHeaders,
    anomalies
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(EVENTS, JSON.stringify({ generatedAt: payload.generatedAt, events: keptEvents, usableEvents: usable }, null, 2), "utf-8");
  fs.writeFileSync(ANOMALIES, JSON.stringify({ generatedAt: payload.generatedAt, anomalies }, null, 2), "utf-8");

  console.log("=== FINCA MARIA — NETTOYAGE V6 ===");
  console.log("Événements source :", sourceEvents.length);
  console.log("En-têtes de période exclus :", excludedHeaders.length);
  console.log("Campagnes normalisées :", normalizedCampaigns);
  console.log("Événements après nettoyage :", keptEvents.length);
  console.log("Événements utilisables :", usable.length);
  console.log("Événements encore à vérifier :", anomalies.length);
  console.log("Documents totalement inconnus :", input.summary?.completelyUnknown ?? "?");
  console.log("Annexes/contextes à revoir :", input.summary?.contextualAnnexesToReview ?? "?");
  if (anomalies.length) {
    console.log("Anomalies restantes :");
    for (const e of anomalies) {
      console.log(`- rang ${e.sourceDocumentRank} | ${e.dateCandidates?.join(" / ") || "date ?"} | ${e.campaignCandidate || "campagne ?"} | ${e.reviewReasons.join(", ")}`);
    }
  }
  console.log("Sortie :", OUTPUT);
  console.log("Événements :", EVENTS);
  console.log("Anomalies :", ANOMALIES);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
