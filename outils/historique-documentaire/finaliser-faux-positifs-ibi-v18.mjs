#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V17.json");
const V16 = path.join(ROOT, "_RELECTURE_LIQUIDATIONS_V16.json");
const V17_CORRECTIONS = path.join(ROOT, "_CORRECTIONS_FAUX_POSITIFS_V17.json");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const CORRECTIONS = path.join(ROOT, "_CORRECTIONS_IBI_RESTANTS_V18.json");
const ADMIN = path.join(ROOT, "_CHRONOLOGIE_FISCALE_FONCIERE_V18.json");
const REPORT = path.join(ROOT, "_RAPPORT_FINALISATION_IBI_V18.md");

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
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function compact(value, max = 700) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function scoreIbi(text) {
  const s = norm(text);
  const signals = {
    rustica: /\brustica\b/.test(s),
    cartaPago: s.includes("carta de pago"),
    liquidacionFiscal: s.includes("informacion de la liquidacion") || s.includes("información de la liquidación"),
    patronato: s.includes("patronato de recaudacion provincial"),
    diputacionMalaga: s.includes("diputacion provincial de malaga"),
    ayuntamientoAntequera: s.includes("ayuntamiento de antequera"),
    devengo: s.includes("ano devengo") || s.includes("año devengo") || s.includes("periodo/ano devengo") || s.includes("periodo/año devengo"),
    fincaAlemanes: s.includes("parcela 25 alemanes") || s.includes("alemanillos"),
    baseImponible: s.includes("base imponible") || s.includes("valor catastral"),
    cargoRecibo: s.includes("cargo/recibo") || s.includes("cargo /recibo") || s.includes("cargo / recibo")
  };

  let score = 0;
  if (signals.rustica) score += 3;
  if (signals.cartaPago) score += 3;
  if (signals.liquidacionFiscal) score += 2;
  if (signals.patronato || signals.diputacionMalaga || signals.ayuntamientoAntequera) score += 3;
  if (signals.devengo) score += 2;
  if (signals.fincaAlemanes) score += 2;
  if (signals.baseImponible) score += 2;
  if (signals.cargoRecibo) score += 1;

  const strongPair = signals.rustica && (signals.cartaPago || signals.liquidacionFiscal);
  const fiscalBody = (signals.patronato || signals.diputacionMalaga || signals.ayuntamientoAntequera) && (signals.devengo || signals.baseImponible || signals.cargoRecibo);
  const confirmed = score >= 7 && (strongPair || fiscalBody);

  return { confirmed, score, signals };
}

function extractReceiptNumber(text) {
  const source = String(text || "").replace(/\s+/g, " ");
  const m = source.match(/N\.?\s*Cargo\s*\/\s*Recibo\s*[:.]?\s*([A-Z0-9-]{5,})/i);
  return m ? m[1].toUpperCase() : "";
}

function extractTaxYear(text, fallbackDate) {
  const source = String(text || "");
  const patterns = [
    /Periodo\s*\/\s*A[ñn]o\s+Devengo[^\n]*?((?:19|20)\d{2})/i,
    /R-?A[ÑN]O-?\s*((?:19|20)\d{2})/i,
    /A[ñn]o\s+Cargo(?:\/Contr)?\s*:\s*((?:19|20)\d{2})/i
  ];
  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (m) return m[1];
  }
  return String(fallbackDate || "").slice(0, 4);
}

function eventDocumentName(event) {
  return String(event?.document || event?.sourceDocument || "");
}

function main() {
  const input = readJson(INPUT);
  const v16 = readJson(V16);
  const v17Corrections = readJson(V17_CORRECTIONS);

  const documents = structuredClone(Array.isArray(input.documents) ? input.documents : []);
  const chronologyBefore = Array.isArray(input.chronology) ? structuredClone(input.chronology) : [];
  const adminBefore = Array.isArray(input.administrativeTimeline) ? structuredClone(input.administrativeTimeline) : [];

  const alreadyCorrectedNames = new Set((v17Corrections.corrections || []).map((x) => x.document).filter(Boolean));
  const remainingRows = (v16.documents || []).filter((x) => !alreadyCorrectedNames.has(x.sourceDocument));

  const docsById = new Map(documents.filter((d) => d.documentId).map((d) => [d.documentId, d]));
  const docsByName = new Map(documents.map((d) => [d.originalName, d]));

  const corrections = [];
  const correctedNames = new Set();
  const correctedIds = new Set();
  const notConfirmed = [];

  for (const row of remainingRows) {
    const verdict = scoreIbi(row.textExcerpt || "");
    if (!verdict.confirmed) {
      notConfirmed.push({
        documentId: row.sourceDocumentId || "",
        document: row.sourceDocument || "",
        score: verdict.score,
        signals: verdict.signals,
        evidenceExcerpt: compact(row.textExcerpt || "")
      });
      continue;
    }

    const doc = docsById.get(row.sourceDocumentId) || docsByName.get(row.sourceDocument) || null;
    if (!doc) {
      notConfirmed.push({
        documentId: row.sourceDocumentId || "",
        document: row.sourceDocument || "",
        score: verdict.score,
        signals: verdict.signals,
        reason: "document_absent_analyse_v17"
      });
      continue;
    }

    const previousEntity = doc.refinedEntity?.code || doc.entity?.code || "INCONNU";
    const previousType = doc.refinedType?.code || doc.type || "NON_IDENTIFIE";
    const receiptNumber = extractReceiptNumber(row.textExcerpt || "");
    const taxYear = extractTaxYear(row.textExcerpt || "", row.date);

    doc.refinedEntity = {
      code: "RECAUDATION_ANTEQUERA",
      label: "Recaudación / Antequera",
      confidence: 0.99,
      sourceV18: "signature_semantique_ibi_elargie"
    };
    doc.refinedType = {
      code: "IBI_RUSTICA_CARTA_PAGO",
      confidence: 0.99,
      source: "signature_semantique_ibi_elargie"
    };
    doc.evidenceScopeV18 = "FISCAL_FONCIER";
    doc.operationalChronologyEligibleV18 = false;
    doc.v18Status = "FAUX_POSITIF_LIQUIDATION_IBI_CORRIGE";
    doc.v18Correction = {
      previousEntity,
      previousType,
      correctedEntity: "RECAUDATION_ANTEQUERA",
      correctedType: "IBI_RUSTICA_CARTA_PAGO",
      receiptNumber,
      taxYear,
      semanticScore: verdict.score,
      signals: verdict.signals
    };

    correctedNames.add(doc.originalName);
    if (doc.documentId) correctedIds.add(doc.documentId);

    corrections.push({
      documentId: doc.documentId || "",
      document: doc.originalName,
      date: row.date || "",
      previousEntity,
      previousType,
      correctedEntity: "RECAUDATION_ANTEQUERA",
      correctedType: "IBI_RUSTICA_CARTA_PAGO",
      scope: "FISCAL_FONCIER",
      receiptNumber,
      taxYear,
      semanticScore: verdict.score,
      signals: verdict.signals,
      evidenceExcerpt: compact(row.textExcerpt || "")
    });
  }

  const removedFromAgriculturalChronology = [];
  const chronology = chronologyBefore.filter((event) => {
    const removeById = event.documentId && correctedIds.has(event.documentId);
    const removeByName = correctedNames.has(eventDocumentName(event));
    const remove = removeById || removeByName;
    if (remove) removedFromAgriculturalChronology.push(event);
    return !remove;
  });

  const addedAdmin = corrections.map((c) => ({
    date: c.date,
    source: "document_corrige_v18",
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

  const existingKeys = new Set(adminBefore.map((e) => {
    if (e.receiptNumber) return `${e.type}|${e.receiptNumber}`;
    return `${e.type}|${e.documentId || e.document}|${e.date || ""}`;
  }));

  const adminAddedUnique = [];
  const adminDuplicates = [];
  for (const event of addedAdmin) {
    const key = event.receiptNumber
      ? `${event.type}|${event.receiptNumber}`
      : `${event.type}|${event.documentId || event.document}|${event.date || ""}`;
    if (existingKeys.has(key)) {
      adminDuplicates.push({ ...event, duplicateKey: key });
      continue;
    }
    existingKeys.add(key);
    adminAddedUnique.push(event);
  }

  const administrativeTimeline = [...adminBefore, ...adminAddedUnique]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")));

  const agriculturalDates = chronology.map((e) => e.date).filter(Boolean).sort();
  const summary = {
    v16RemainingAfterV17: remainingRows.length,
    remainingIbiConfirmed: corrections.length,
    stillUnconfirmed: notConfirmed.length,
    removedFromAgriculturalChronology: removedFromAgriculturalChronology.length,
    agriculturalChronologyBefore: chronologyBefore.length,
    agriculturalChronologyAfter: chronology.length,
    earliestAgriculturalDateAfter: agriculturalDates[0] || "",
    latestAgriculturalDateAfter: agriculturalDates.at(-1) || "",
    administrativeTimelineBefore: adminBefore.length,
    administrativeUniqueEventsAdded: adminAddedUnique.length,
    administrativeDuplicates: adminDuplicates.length,
    administrativeTimelineAfter: administrativeTimeline.length
  };

  const payload = {
    version: 18,
    generatedAt: new Date().toISOString(),
    basedOn: { analysis: INPUT, relectureV16: V16, correctionsV17: V17_CORRECTIONS },
    purpose: "Finaliser les faux positifs IBI rústica restés après V17 avec une signature sémantique plus tolérante à l'OCR, sans réutiliser l'héritage des lots CamScanner.",
    summary,
    documents,
    chronology,
    administrativeTimeline,
    correctionsV18: corrections,
    removedFromAgriculturalChronologyV18: removedFromAgriculturalChronology,
    administrativeDuplicatesV18: adminDuplicates,
    stillUnconfirmedV18: notConfirmed,
    remainingUnknowns: input.remainingUnknowns || [],
    manualReview: input.manualReview || []
  };

  writeJson(OUTPUT, payload);
  writeJson(CORRECTIONS, {
    generatedAt: payload.generatedAt,
    corrections,
    removedFromAgriculturalChronology,
    stillUnconfirmed: notConfirmed
  });
  writeJson(ADMIN, {
    generatedAt: payload.generatedAt,
    timeline: administrativeTimeline,
    addedEvidence: adminAddedUnique,
    duplicateEvidence: adminDuplicates
  });

  const lines = [
    "# FINCA MARIA — Finalisation des faux positifs IBI V18",
    "",
    "V18 reprend uniquement les pièces V16 non corrigées par V17. La reconnaissance IBI est élargie aux signatures sémantiques robustes : RUSTICA, CARTA DE PAGO, recaudación/Ayuntamiento, año de devengo, base imponible/valor catastral, parcelle ALEMANES.",
    "",
    `- Pièces restantes après V17 : **${summary.v16RemainingAfterV17}**`,
    `- IBI rústica confirmés et corrigés : **${summary.remainingIbiConfirmed}**`,
    `- Pièces encore non confirmées : **${summary.stillUnconfirmed}**`,
    `- Événements retirés de la chronologie agricole : **${summary.removedFromAgriculturalChronology}**`,
    `- Chronologie agricole : **${summary.agriculturalChronologyBefore} → ${summary.agriculturalChronologyAfter}**`,
    `- Chronologie administrative : **${summary.administrativeTimelineBefore} → ${summary.administrativeTimelineAfter}**`,
    "",
    "Ces documents restent des preuves utiles de l'histoire fiscale/foncière de la finca mais ne participent pas aux campagnes de production."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — FINALISATION IBI V18 ===");
  console.log("Pièces restantes après V17 :", summary.v16RemainingAfterV17);
  console.log("IBI rústica confirmés :", summary.remainingIbiConfirmed);
  console.log("Encore non confirmés :", summary.stillUnconfirmed);
  console.log("Retirés de la chronologie agricole :", summary.removedFromAgriculturalChronology);
  console.log("Chronologie agricole :", `${summary.agriculturalChronologyBefore} -> ${summary.agriculturalChronologyAfter}`);
  console.log("Période agricole après correction :", `${summary.earliestAgriculturalDateAfter || "?"} -> ${summary.latestAgriculturalDateAfter || "?"}`);
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
  console.error("ERREUR V18 :", error.message || error);
  process.exitCode = 1;
}
