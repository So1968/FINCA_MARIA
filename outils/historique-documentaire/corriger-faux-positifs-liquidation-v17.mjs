#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V12.json");
const V16 = path.join(ROOT, "_RELECTURE_LIQUIDATIONS_V16.json");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V17.json");
const CORRECTIONS = path.join(ROOT, "_CORRECTIONS_FAUX_POSITIFS_V17.json");
const ADMIN = path.join(ROOT, "_CHRONOLOGIE_FISCALE_FONCIERE_V17.json");
const REPORT = path.join(ROOT, "_RAPPORT_CORRECTION_LIQUIDATIONS_V17.md");

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

function compact(value, max = 500) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function extractReceiptNumber(text) {
  const source = String(text || "").replace(/\s+/g, " ");
  const m = source.match(/N\.?\s*Cargo\s*\/\s*Recibo\s*[:.]?\s*([A-Z0-9-]{5,})/i);
  return m ? m[1].toUpperCase() : "";
}

function extractTaxYear(text, fallbackDate) {
  const source = String(text || "");
  const patterns = [
    /Periodo\s*\/\s*A[ñn]o\s+Devengo\s*:\s*R-?A[ÑN]O-?\s*((?:19|20)\d{2})/i,
    /Periodo\s*\/\s*A[ñn]o\s+Devengo[^\n]*?((?:19|20)\d{2})/i,
    /A[ñn]o\s+Cargo(?:\/Contr)?\s*:\s*((?:19|20)\d{2})/i
  ];
  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (m) return m[1];
  }
  return String(fallbackDate || "").slice(0, 4);
}

function classify(text) {
  const s = norm(text);

  const ibiSignals = (
    s.includes("patronato de recaudacion provincial") ||
    s.includes("diputacion provincial de malaga") ||
    s.includes("ayuntamiento de antequera")
  ) && (
    s.includes("rustica") ||
    s.includes("i.b.i") ||
    s.includes("l.b.i")
  ) && (
    s.includes("carta de pago") ||
    s.includes("informacion de la liquidacion") ||
    s.includes("periodo/ano devengo")
  );

  if (ibiSignals) {
    return {
      entity: "RECAUDACION_ANTEQUERA",
      type: "IBI_RUSTICA_CARTA_PAGO",
      scope: "FISCAL_FONCIER",
      confidence: 0.99,
      reason: "carta_pago_ibi_rustica"
    };
  }

  const registroSignals = (
    s.includes("cargas") &&
    (s.includes("transmisiones") || s.includes("t.p. y aj.d") || s.includes("autoliquidada")) &&
    (s.includes("finca afecta") || s.includes("registro") || s.includes("inscripcion"))
  );

  if (registroSignals) {
    return {
      entity: "REGISTRO_PROPIEDAD",
      type: "REGISTRO_PROPIEDAD_CARGAS",
      scope: "FONCIER_JURIDIQUE",
      confidence: 0.98,
      reason: "cargas_registrales_transmisiones"
    };
  }

  const modelo037 = s.includes("modelo") && s.includes("037") && (
    s.includes("relacion de sucesores") ||
    s.includes("sucesor de persona fisica") ||
    s.includes("heredero o legatario")
  );

  if (modelo037) {
    return {
      entity: "AGENCIA_TRIBUTARIA",
      type: "MODELO_037_SUCESORES",
      scope: "FISCAL_ADMINISTRATIF",
      confidence: 0.99,
      reason: "modelo_037_sucesores"
    };
  }

  return null;
}

function eventSourceName(event) {
  return String(event?.document || event?.sourceDocument || "");
}

function main() {
  const input = readJson(INPUT);
  const v16 = readJson(V16);

  const documents = structuredClone(Array.isArray(input.documents) ? input.documents : []);
  const v16Rows = Array.isArray(v16.documents) ? v16.documents : [];
  const docsByName = new Map(documents.map((d) => [d.originalName, d]));
  const docsById = new Map(documents.filter((d) => d.documentId).map((d) => [d.documentId, d]));

  const corrections = [];
  const correctedNames = new Set();
  const correctedIds = new Set();

  for (const row of v16Rows) {
    const classification = classify(row.textExcerpt || "");
    if (!classification) continue;

    const doc = docsById.get(row.sourceDocumentId) || docsByName.get(row.sourceDocument) || null;
    if (!doc) continue;

    const previousEntity = doc.refinedEntity?.code || doc.entity?.code || "INCONNU";
    const previousType = doc.refinedType?.code || doc.type || "NON_IDENTIFIE";
    const receiptNumber = extractReceiptNumber(row.textExcerpt || "");
    const taxYear = classification.type === "IBI_RUSTICA_CARTA_PAGO"
      ? extractTaxYear(row.textExcerpt || "", row.date)
      : "";

    doc.refinedEntity = {
      code: classification.entity,
      label: classification.entity,
      confidence: classification.confidence,
      sourceV17: "correction_semantique_contenu_direct"
    };
    doc.refinedType = {
      code: classification.type,
      confidence: classification.confidence,
      source: "correction_semantique_contenu_direct"
    };
    doc.evidenceScopeV17 = classification.scope;
    doc.operationalChronologyEligibleV17 = false;
    doc.v17Status = "FAUX_POSITIF_LIQUIDATION_CORRIGE";
    doc.v17Correction = {
      previousEntity,
      previousType,
      correctedEntity: classification.entity,
      correctedType: classification.type,
      reason: classification.reason,
      receiptNumber,
      taxYear
    };

    correctedNames.add(doc.originalName);
    if (doc.documentId) correctedIds.add(doc.documentId);

    corrections.push({
      documentId: doc.documentId || "",
      document: doc.originalName,
      date: row.date || doc.date || "",
      previousEntity,
      previousType,
      correctedEntity: classification.entity,
      correctedType: classification.type,
      scope: classification.scope,
      receiptNumber,
      taxYear,
      confidence: classification.confidence,
      reason: classification.reason,
      evidenceExcerpt: compact(row.textExcerpt || "")
    });
  }

  const chronologyBefore = Array.isArray(input.chronology) ? input.chronology : [];
  const removedFromAgriculturalChronology = [];
  const chronology = chronologyBefore.filter((event) => {
    const byId = event.documentId && correctedIds.has(event.documentId);
    const byName = correctedNames.has(eventSourceName(event));
    const remove = byId || byName;
    if (remove) removedFromAgriculturalChronology.push(event);
    return !remove;
  });

  const existingAdministrative = Array.isArray(input.administrativeTimeline)
    ? structuredClone(input.administrativeTimeline)
    : [];

  const addedAdministrativeEvidence = corrections.map((c) => ({
    date: c.date,
    source: "document_corrige_v17",
    entity: c.correctedEntity,
    type: c.correctedType,
    scope: c.scope,
    documentId: c.documentId,
    document: c.document,
    receiptNumber: c.receiptNumber,
    taxYear: c.taxYear,
    evidenceStatus: "preuve_documentaire",
    agriculturalProductionEligible: false
  }));

  const seenAdmin = new Map();
  const duplicateAdministrativeEvidence = [];
  const uniqueAddedAdministrative = [];

  for (const event of addedAdministrativeEvidence) {
    const strongKey = event.receiptNumber
      ? `${event.type}|${event.receiptNumber}`
      : `${event.type}|${event.date}|${event.documentId || event.document}`;
    if (seenAdmin.has(strongKey)) {
      duplicateAdministrativeEvidence.push({
        ...event,
        duplicateOf: seenAdmin.get(strongKey).document,
        duplicateKey: strongKey
      });
      continue;
    }
    seenAdmin.set(strongKey, event);
    uniqueAddedAdministrative.push(event);
  }

  const administrativeTimeline = [...existingAdministrative, ...uniqueAddedAdministrative]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  const byType = Object.fromEntries(
    Object.entries(corrections.reduce((acc, c) => {
      acc[c.correctedType] = (acc[c.correctedType] || 0) + 1;
      return acc;
    }, {})).sort((a, b) => b[1] - a[1])
  );

  const agriculturalDates = chronology.map((e) => e.date).filter(Boolean).sort();
  const summary = {
    documents: documents.length,
    v16Targets: v16Rows.length,
    falsePositiveLiquidationsCorrected: corrections.length,
    removedFromAgriculturalChronology: removedFromAgriculturalChronology.length,
    agriculturalChronologyBefore: chronologyBefore.length,
    agriculturalChronologyAfter: chronology.length,
    earliestAgriculturalDateAfter: agriculturalDates[0] || "",
    latestAgriculturalDateAfter: agriculturalDates.at(-1) || "",
    administrativeTimelineBefore: existingAdministrative.length,
    administrativeEvidenceAdded: addedAdministrativeEvidence.length,
    administrativeUniqueEventsAdded: uniqueAddedAdministrative.length,
    administrativeDuplicateEvidence: duplicateAdministrativeEvidence.length,
    administrativeTimelineAfter: administrativeTimeline.length,
    byCorrectedType: byType
  };

  const payload = {
    version: 17,
    generatedAt: new Date().toISOString(),
    basedOn: { analysis: INPUT, relecture: V16 },
    purpose: "Corriger les faux positifs créés par le mot fiscal 'liquidación' : sortir les IBI, charges foncières et Modelo 037 de la chronologie agricole et les conserver dans une chronologie fiscale/foncière séparée.",
    summary,
    documents,
    chronology,
    administrativeTimeline,
    corrections,
    removedFromAgriculturalChronology,
    duplicateAdministrativeEvidence,
    remainingUnknowns: input.remainingUnknowns || [],
    manualReview: input.manualReview || []
  };

  writeJson(OUTPUT, payload);
  writeJson(CORRECTIONS, {
    generatedAt: payload.generatedAt,
    corrections,
    removedFromAgriculturalChronology,
    duplicateAdministrativeEvidence
  });
  writeJson(ADMIN, {
    generatedAt: payload.generatedAt,
    timeline: administrativeTimeline,
    addedEvidence: addedAdministrativeEvidence,
    duplicateEvidence: duplicateAdministrativeEvidence
  });

  const lines = [
    "# FINCA MARIA — Correction des faux positifs de liquidation V17",
    "",
    "Le terme espagnol « liquidación » apparaît aussi dans des documents fiscaux. V17 corrige les pièces que V16 a relues directement et qui avaient été classées à tort comme liquidations agricoles.",
    "",
    `- Faux positifs corrigés : **${summary.falsePositiveLiquidationsCorrected}**`,
    `- Retirés de la chronologie agricole : **${summary.removedFromAgriculturalChronology}**`,
    `- Chronologie agricole : **${summary.agriculturalChronologyBefore} → ${summary.agriculturalChronologyAfter} événements**`,
    `- Preuves fiscales/foncières ajoutées : **${summary.administrativeEvidenceAdded}**`,
    `- Événements administratifs uniques ajoutés : **${summary.administrativeUniqueEventsAdded}**`,
    `- Doublons administratifs détectés : **${summary.administrativeDuplicateEvidence}**`,
    `- Chronologie administrative : **${summary.administrativeTimelineBefore} → ${summary.administrativeTimelineAfter} événements**`,
    "",
    "## Répartition corrigée",
    "",
    ...Object.entries(byType).map(([type, count]) => `- ${type} : **${count}**`),
    "",
    "Les dates de ces documents restent utiles pour l'histoire fiscale/foncière de la finca, mais elles ne servent plus à créer ou prolonger une campagne de récolte."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CORRECTION FAUX POSITIFS V17 ===");
  console.log("Faux positifs de liquidation corrigés :", summary.falsePositiveLiquidationsCorrected);
  console.log("Répartition :", summary.byCorrectedType);
  console.log("Retirés de la chronologie agricole :", summary.removedFromAgriculturalChronology);
  console.log("Chronologie agricole :", `${summary.agriculturalChronologyBefore} -> ${summary.agriculturalChronologyAfter}`);
  console.log("Période agricole après correction :", `${summary.earliestAgriculturalDateAfter || "?"} -> ${summary.latestAgriculturalDateAfter || "?"}`);
  console.log("Preuves fiscales/foncières ajoutées :", summary.administrativeEvidenceAdded);
  console.log("Doublons administratifs détectés :", summary.administrativeDuplicateEvidence);
  console.log("Chronologie administrative :", `${summary.administrativeTimelineBefore} -> ${summary.administrativeTimelineAfter}`);
  console.log("Analyse :", OUTPUT);
  console.log("Corrections :", CORRECTIONS);
  console.log("Chronologie fiscale/foncière :", ADMIN);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie de travail n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V17 :", error.message || error);
  process.exitCode = 1;
}
