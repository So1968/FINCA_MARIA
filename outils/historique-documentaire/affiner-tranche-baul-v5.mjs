#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_TEST_TRANCHE_ANCIENNES_CAMPAGNES_V4.json");
const OUTPUT = path.join(ROOT, "_TEST_TRANCHE_ANCIENNES_CAMPAGNES_V5.json");
const EVENTS = path.join(ROOT, "_EVENEMENTS_INTERNES_TRANCHE_V5.json");

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseNumber(value) {
  let s = String(value || "").trim().replace(/\s+/g, "");
  if (!s) return null;
  if (s.includes(",") && s.includes(".")) s = s.replace(/\./g, "").replace(",", ".");
  else if (s.includes(",")) s = s.replace(",", ".");
  s = s.replace(/[^0-9.-]/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function tolerantSanJuan(text) {
  const s = norm(text);
  const direct = [
    "agricola san juan",
    "aqmicola bam juan",
    "aomicola gan juan",
    "aomicola san juan",
    "agricola gan juan",
    "agricola bam juan"
  ].some((x) => s.includes(x));
  if (direct) return { matched: true, reason: "nom_ocr_tolere", confidence: 0.94 };

  const hasAgricolaLike = /\b(?:a|ag|aq|ao)[a-z]{0,3}micola\b/.test(s) || s.includes("almazara");
  const hasSanJuanLike = /\b(?:san|sam|gan|bam)\s+juan\b/.test(s);
  const hasKnownAddress = s.includes("villanueva del") && (s.includes("linda, 2") || s.includes("linda 2"));
  if ((hasAgricolaLike && hasSanJuanLike) || (hasSanJuanLike && hasKnownAddress)) {
    return { matched: true, reason: "signature_ocr_toleree", confidence: 0.88 };
  }
  return { matched: false, reason: "aucune_signature", confidence: 0 };
}

function refinedEntity(doc) {
  if (doc.entity && doc.entity !== "INCONNU") return { code: doc.entity, source: "v4", confidence: 0.98 };
  const hit = tolerantSanJuan(doc.reading?.textExcerpt || "");
  if (hit.matched) return { code: "AGRI_SAN_JUAN", source: hit.reason, confidence: hit.confidence };
  return { code: "INCONNU", source: "aucun", confidence: 0 };
}

function refinedType(doc) {
  const text = norm(doc.reading?.textExcerpt || "");
  if (text.includes("extracto vales almazara") || (text.includes("vales kg") && text.includes("aceituna") && text.includes("aceite"))) {
    return { code: "EXTRACTO_VALES_ALMAZARA", source: "texte", confidence: 0.98 };
  }
  if (doc.type && doc.type !== "NON_IDENTIFIE") return { code: doc.type, source: "v4", confidence: 0.95 };
  return { code: "NON_IDENTIFIE", source: "aucun", confidence: 0 };
}

function extractValesFacts(text) {
  const source = String(text || "");
  const m = source.match(/Vales\s+Kg\.\s*Aceituna\s+Kg\.\s*Aceite\s+%Rdto\.\s*Acidez\s*\n?\s*(\d+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)/i);
  if (!m) return {};
  return {
    vouchers: parseNumber(m[1]),
    oliveKg: parseNumber(m[2]),
    oilKg: parseNumber(m[3]),
    yieldPct: parseNumber(m[4]),
    acidity: parseNumber(m[5])
  };
}

function parseDateToken(token) {
  const s = String(token || "").trim();
  const m = s.match(/^(0?[1-9]|[12]\d|3[01])[\/.](0?[1-9]|1[0-2])[\/.]((?:19|20)\d{2})$/);
  if (!m) return "";
  return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

function extractInternalEvents(doc) {
  if (doc.type !== "EXTRAIT_COMPTE" && !norm(doc.reading?.textExcerpt || "").includes("extracto de cuenta")) return [];
  const lines = String(doc.reading?.textExcerpt || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const events = [];

  for (const line of lines) {
    const dateTokens = [...line.matchAll(/\b(?:0?[1-9]|[12]\d|3[01])[\/.](?:0?[1-9]|1[0-2])[\/.](?:19|20)\d{2}\b/g)].map((m) => m[0]);
    const conceptHit = /(LIQUIDACION[^\n]*|REPARTO[^\n]*|RETENC\.?[^\n]*|SALDO\s+ANTERIOR[^\n]*)/i.exec(line);
    if (!dateTokens.length && !conceptHit) continue;

    const campaignRaw = (line.match(/CAMPA[ÑN]A\s+(\d{4})[\/]([0-9]{2,4})/i) || line.match(/CP[ÑN]A\s+(\d{2,4})[\/]([0-9]{2,4})/i));
    let campaign = "";
    let campaignStatus = "absente";
    if (campaignRaw) {
      const a = Number(campaignRaw[1]);
      let b = Number(campaignRaw[2]);
      if (String(campaignRaw[2]).length === 2) b += a >= 2000 ? 2000 : 1900;
      campaign = `${a}-${b}`;
      campaignStatus = b === a + 1 ? "coherente" : "ocr_a_verifier";
    }

    const parsedDates = dateTokens.map(parseDateToken).filter(Boolean);
    const uniqueYears = [...new Set(parsedDates.map((d) => d.slice(0, 4)))];
    events.push({
      sourceDocumentRank: doc.rank,
      sourceDocument: doc.originalName,
      rawLine: line,
      dateCandidates: parsedDates,
      dateStatus: uniqueYears.length <= 1 ? "coherente_dans_ligne" : "annees_contradictoires_ocr",
      concept: conceptHit ? conceptHit[1].replace(/\s+/g, " ").trim() : "",
      campaignCandidate: campaign,
      campaignStatus,
      needsReview: uniqueYears.length > 1 || campaignStatus === "ocr_a_verifier"
    });
  }
  return events;
}

function documentPrintDate(text) {
  const s = String(text || "");
  const m = s.match(/(?:fecha\w*\s*)?documento\s+(0?[1-9]|[12]\d|3[01])\s+(0?[1-9]|1[0-2])\s+((?:19|20)\d{2})/i);
  if (!m) return "";
  return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

function applyGroupContext(documents) {
  const groups = new Map();
  for (const doc of documents) {
    const key = doc.group || `SINGLE::${doc.originalName}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(doc);
  }

  for (const [key, docs] of groups) {
    const strongEntities = docs.filter((d) => d.refinedEntity.code !== "INCONNU" && d.refinedEntity.confidence >= 0.85);
    const counts = new Map();
    for (const d of strongEntities) counts.set(d.refinedEntity.code, (counts.get(d.refinedEntity.code) || 0) + 1);
    const dominant = [...counts.entries()].sort((a,b) => b[1]-a[1])[0];
    if (!dominant || dominant[1] < 2) continue;

    for (const doc of docs) {
      if (doc.refinedEntity.code === "INCONNU") {
        doc.refinedEntity = {
          code: dominant[0],
          source: "contexte_lot_camscanner",
          confidence: 0.82,
          inherited: true
        };
      }
      if (doc.refinedType.code === "NON_IDENTIFIE") {
        doc.contextualRole = "ANNEXE_OU_CONTINUATION_A_VERIFIER";
      }
      doc.contextGroup = key;
    }
  }
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Résultat V4 introuvable : ${INPUT}`);
  const input = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const docs = (input.documents || []).map((doc) => {
    const refined = {
      ...doc,
      refinedEntity: refinedEntity(doc),
      refinedType: refinedType(doc),
      factsV5: {},
      internalEvents: [],
      documentPrintDate: "",
      contextualRole: ""
    };

    if (refined.refinedType.code === "EXTRACTO_VALES_ALMAZARA") {
      refined.factsV5 = extractValesFacts(doc.reading?.textExcerpt || "");
    }
    if (refined.refinedType.code === "EXTRAIT_COMPTE") {
      refined.internalEvents = extractInternalEvents({ ...doc, type: "EXTRAIT_COMPTE" });
      refined.documentPrintDate = documentPrintDate(doc.reading?.textExcerpt || "");
    }
    return refined;
  });

  applyGroupContext(docs);

  const events = docs.flatMap((d) => d.internalEvents || []);
  const unknownEntity = docs.filter((d) => d.refinedEntity.code === "INCONNU").length;
  const unknownType = docs.filter((d) => d.refinedType.code === "NON_IDENTIFIE").length;
  const fullUnknown = docs.filter((d) => d.refinedEntity.code === "INCONNU" && d.refinedType.code === "NON_IDENTIFIE").length;
  const annexes = docs.filter((d) => d.contextualRole === "ANNEXE_OU_CONTINUATION_A_VERIFIER").length;
  const vales = docs.filter((d) => d.refinedType.code === "EXTRACTO_VALES_ALMAZARA");
  const accountDocs = docs.filter((d) => d.refinedType.code === "EXTRAIT_COMPTE");

  const payload = {
    version: 5,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Affiner les erreurs OCR tolérables, reconnaître les extraits de vales et distinguer les événements internes d'un extrait de compte sans inventer de date.",
    summary: {
      documents: docs.length,
      unknownEntity,
      unknownType,
      completelyUnknown: fullUnknown,
      contextualAnnexesToReview: annexes,
      extractoValesAlmazara: vales.length,
      accountExtracts: accountDocs.length,
      internalEventsExtracted: events.length,
      internalEventsNeedingReview: events.filter((e) => e.needsReview).length
    },
    documents: docs,
    internalEvents: events
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(EVENTS, JSON.stringify({ generatedAt: payload.generatedAt, events }, null, 2), "utf-8");

  console.log("=== FINCA MARIA — AFFINAGE V5 ===");
  console.log("Documents :", payload.summary.documents);
  console.log("Interlocuteurs encore inconnus :", unknownEntity);
  console.log("Types encore inconnus :", unknownType);
  console.log("Documents totalement inconnus :", fullUnknown);
  console.log("Annexes/contextes à revoir :", annexes);
  console.log("Extracto Vales Almazara reconnus :", vales.length);
  if (vales[0]) console.log("Faits Vales :", vales[0].factsV5);
  console.log("Extraits de compte :", accountDocs.length);
  console.log("Événements internes extraits :", events.length);
  console.log("Événements internes à vérifier :", payload.summary.internalEventsNeedingReview);
  for (const d of accountDocs) {
    console.log(`Extrait compte rang ${d.rank} : entité ${d.refinedEntity.code} | date impression ${d.documentPrintDate || "?"}`);
  }
  console.log("Sortie :", OUTPUT);
  console.log("Événements :", EVENTS);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
