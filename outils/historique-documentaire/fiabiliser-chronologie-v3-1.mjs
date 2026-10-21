#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BAUL_ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT_FILE = path.join(BAUL_ROOT, "_ANALYSE_EXPLOITATION_V3.json");
const OUTPUT_FILE = path.join(BAUL_ROOT, "_ANALYSE_EXPLOITATION_V3_1.json");
const TIMELINE_FILE = path.join(BAUL_ROOT, "_CHRONOLOGIE_EXPLOITATION_V3_1.json");
const ARCHIVE_DATES_FILE = path.join(BAUL_ROOT, "_DATES_DOCUMENTAIRES_V3_1.json");
const REPORT_FILE = path.join(BAUL_ROOT, "_RAPPORT_CHRONOLOGIE_V3_1.md");

const OPERATIONAL_TYPES = new Set([
  "TICKET_APPORT",
  "LIQUIDATION",
  "LIQUIDATION_FACTURE",
  "EXTRAIT_COMPTE",
  "FACTURE",
  "DEVIS",
  "RECU",
  "PAC_SOLICITUD_UNICA",
  "PAC_RESOLUTION"
]);

const REFERENCE_TYPES = new Set([
  "PLAN_PARCELLE",
  "NON_IDENTIFIE"
]);

function chronologyDecision(page) {
  if (!page?.date) {
    return { eligible: false, scope: "aucune", reason: "date_absente" };
  }

  if (!page.dateTrust?.trusted) {
    return { eligible: false, scope: "indice", reason: "date_non_fiable" };
  }

  if (REFERENCE_TYPES.has(page.type)) {
    return {
      eligible: false,
      scope: "reference_documentaire",
      reason: page.type === "PLAN_PARCELLE"
        ? "date_de_plan_ou_parcelle_ne_prouve_pas_une_activite_agricole"
        : "type_de_page_non_identifie"
    };
  }

  if (OPERATIONAL_TYPES.has(page.type)) {
    return { eligible: true, scope: "exploitation", reason: "piece_operationnelle_datee" };
  }

  if (page.entity?.code === "AGRI_SAN_JUAN") {
    return { eligible: true, scope: "exploitation", reason: "piece_agri_san_juan_datee" };
  }

  if (page.entity?.code === "PAC_ADMINISTRATION" && String(page.type || "").startsWith("PAC_")) {
    return { eligible: true, scope: "exploitation", reason: "piece_pac_datee" };
  }

  return { eligible: false, scope: "reference_documentaire", reason: "date_documentaire_sans_preuve_operationnelle_suffisante" };
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Analyse V3 introuvable : ${INPUT_FILE}`);
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const pages = Array.isArray(input.documents) ? input.documents.map((page) => ({ ...page })) : [];

  const operational = [];
  const documentary = [];
  const indicators = [];

  for (const page of pages) {
    const decision = chronologyDecision(page);
    page.chronology = decision;

    if (decision.eligible) {
      operational.push({
        date: page.date,
        documentId: page.documentId,
        originalName: page.originalName,
        dossierKey: page.dossierKey || "",
        dossierKind: page.dossierKind || "",
        entity: page.entity,
        type: page.type,
        campaign: page.campaign || "",
        facts: page.facts || {},
        reason: decision.reason
      });
    } else if (page.date) {
      documentary.push({
        date: page.date,
        trustedAsDocumentDate: Boolean(page.dateTrust?.trusted),
        documentId: page.documentId,
        originalName: page.originalName,
        dossierKey: page.dossierKey || "",
        entity: page.entity,
        type: page.type,
        scope: decision.scope,
        reason: decision.reason
      });
    }
  }

  operational.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  documentary.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const opDates = operational.map((x) => x.date).filter(Boolean);
  const docDates = documentary.map((x) => x.date).filter(Boolean);

  if (input.summary?.earliestTrustedDate && opDates[0] && input.summary.earliestTrustedDate !== opDates[0]) {
    indicators.push({
      type: "PERIODE_RECENTREE",
      previousEarliestTrustedDate: input.summary.earliestTrustedDate,
      earliestOperationalDate: opDates[0],
      message: "La première date documentaire fiable n'est pas utilisée comme début de l'exploitation faute de preuve opérationnelle suffisante."
    });
  }

  const summary = {
    pages: pages.length,
    operationalEvents: operational.length,
    documentaryDatesKeptAside: documentary.length,
    earliestOperationalDate: opDates[0] || "",
    latestOperationalDate: opDates.at(-1) || "",
    earliestDocumentaryDateOutsideTimeline: docDates[0] || "",
    latestDocumentaryDateOutsideTimeline: docDates.at(-1) || "",
    previousV3Period: {
      earliest: input.summary?.earliestTrustedDate || "",
      latest: input.summary?.latestTrustedDate || ""
    },
    indicators: indicators.length
  };

  const payload = {
    version: "3.1",
    generatedAt: new Date().toISOString(),
    basedOn: INPUT_FILE,
    project: "FINCA MARIA",
    purpose: "Séparer les dates qui prouvent réellement l'activité de l'exploitation des dates purement documentaires, cadastrales ou encore ambiguës.",
    summary,
    documents: pages,
    exploitationTimeline: operational,
    documentaryDatesOutsideTimeline: documentary,
    indicators,
    dossiers: input.dossiers || [],
    anomalies: input.anomalies || [],
    missingDocumentRequests: input.missingDocumentRequests || []
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(TIMELINE_FILE, JSON.stringify({ generatedAt: payload.generatedAt, events: operational }, null, 2), "utf-8");
  fs.writeFileSync(ARCHIVE_DATES_FILE, JSON.stringify({ generatedAt: payload.generatedAt, dates: documentary }, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Chronologie fiabilisée V3.1",
    "",
    "La chronologie principale ne retient que les pièces qui apportent une preuve suffisante d'activité, de campagne, de dépense, d'aide, de livraison ou de règlement.",
    "Les dates de plans, parcelles et pages ambiguës restent conservées comme dates documentaires sans être utilisées pour fixer le début de l'exploitation.",
    "",
    `- Événements utilisables pour l'histoire de l'exploitation : **${summary.operationalEvents}**`,
    `- Période opérationnelle : **${summary.earliestOperationalDate || "?"} → ${summary.latestOperationalDate || "?"}**`,
    `- Dates documentaires conservées à part : **${summary.documentaryDatesKeptAside}**`,
    `- Plus ancienne date documentaire hors chronologie : **${summary.earliestDocumentaryDateOutsideTimeline || "?"}**`,
    "",
    "Aucune date n'est supprimée : elle change seulement de niveau de preuve. Aucun original n'est déplacé, renommé ou classé."
  ];

  fs.writeFileSync(REPORT_FILE, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CHRONOLOGIE V3.1 ===");
  console.log("Pages analysées :", summary.pages);
  console.log("Événements exploitation :", summary.operationalEvents);
  console.log("Période exploitation :", `${summary.earliestOperationalDate || "?"} -> ${summary.latestOperationalDate || "?"}`);
  console.log("Dates documentaires gardées à part :", summary.documentaryDatesKeptAside);
  console.log("Plus ancienne date documentaire hors chronologie :", summary.earliestDocumentaryDateOutsideTimeline || "?");
  console.log("Analyse :", OUTPUT_FILE);
  console.log("Chronologie :", TIMELINE_FILE);
  console.log("Dates documentaires :", ARCHIVE_DATES_FILE);
  console.log("Rapport :", REPORT_FILE);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
