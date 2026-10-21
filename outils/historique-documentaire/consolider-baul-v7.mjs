#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V3.json");
const CACHE = path.join(ROOT, "_CACHE_OCR");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V7.json");
const CHRONOLOGY = path.join(ROOT, "_CHRONOLOGIE_EXPLOITATION_V7.json");
const EVENTS = path.join(ROOT, "_EVENEMENTS_INTERNES_V7.json");
const ANOMALIES = path.join(ROOT, "_ANOMALIES_V7.json");
const REQUESTS = path.join(ROOT, "_PIECES_A_DEMANDER_V7.json");
const REPORT = path.join(ROOT, "_RAPPORT_ANALYSE_BAUL_V7.md");

const OCR_VERSION = "tesseract-psm1-spa-fra-eng-v2";
const OPERATIONAL_TYPES = new Set([
  "TICKET_APPORT",
  "LIQUIDATION",
  "LIQUIDATION_FACTURE",
  "FACTURE",
  "DEVIS",
  "RECU",
  "PAC_SOLICITUD_UNICA",
  "PAC_RESOLUTION",
  "EXTRACTO_VALES_ALMAZARA"
]);

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function inside(candidate) {
  const c = path.resolve(candidate);
  const r = path.resolve(ROOT);
  return c === r || c.startsWith(`${r}${path.sep}`);
}

function portable(relative) {
  const candidate = path.resolve(ROOT, String(relative || "").split("/").join(path.sep));
  if (!inside(candidate)) throw new Error("Chemin BAÚL invalide");
  return candidate;
}

function resolveFile(doc) {
  const candidates = [];
  if (doc.source?.currentRelativePath) candidates.push(portable(doc.source.currentRelativePath));
  if (doc.source?.originalRelativePath) candidates.push(portable(doc.source.originalRelativePath));
  if (doc.storedName) candidates.push(path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", doc.storedName));
  return candidates.find((p) => inside(p) && fs.existsSync(p)) || "";
}

function cachedOcrText(doc) {
  const filePath = resolveFile(doc);
  if (!filePath || !fs.existsSync(filePath)) return "";
  try {
    const stat = fs.statSync(filePath);
    const signature = `${OCR_VERSION}|${filePath}|${stat.size}|${Math.trunc(stat.mtimeMs)}`;
    const hash = crypto.createHash("sha256").update(signature).digest("hex");
    const cachePath = path.join(CACHE, `${hash}.json`);
    if (!fs.existsSync(cachePath)) return "";
    const cache = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    if (cache.version !== OCR_VERSION) return "";
    return String(cache.reading?.text || "");
  } catch {
    return "";
  }
}

function fullText(doc) {
  return cachedOcrText(doc) || String(doc.reading?.textExcerpt || "");
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

  const agricolaLike = /\b(?:a|ag|aq|ao)[a-z]{0,3}micola\b/.test(s) || s.includes("almazara");
  const sanJuanLike = /\b(?:san|sam|gan|bam)\s+juan\b/.test(s);
  const knownAddress = s.includes("villanueva del") && (s.includes("linda, 2") || s.includes("linda 2"));
  if ((agricolaLike && sanJuanLike) || (sanJuanLike && knownAddress)) {
    return { matched: true, reason: "signature_ocr_toleree", confidence: 0.88 };
  }
  return { matched: false, reason: "aucune_signature", confidence: 0 };
}

function refineEntity(doc, text) {
  if (doc.entity?.code && doc.entity.code !== "INCONNU") return { ...doc.entity, sourceV7: "v3" };
  const hit = tolerantSanJuan(text);
  if (hit.matched) {
    return {
      code: "AGRI_SAN_JUAN",
      label: "S.C.A. Agrícola San Juan",
      confidence: hit.confidence,
      sourceV7: hit.reason
    };
  }
  return doc.entity || { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0 };
}

function refineType(doc, text) {
  const s = norm(text);
  if (s.includes("extracto vales almazara") || (s.includes("vales kg") && s.includes("aceituna") && s.includes("aceite"))) {
    return { code: "EXTRACTO_VALES_ALMAZARA", source: "texte", confidence: 0.98 };
  }
  return { code: doc.type || "NON_IDENTIFIE", source: "v3", confidence: doc.type === "NON_IDENTIFIE" ? 0 : 0.95 };
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

function extractValesFacts(text) {
  const source = String(text || "");
  const m = source.match(/Vales\s+Kg\.?\s*Aceituna\s+Kg\.?\s*Aceite\s+%Rdto\.?\s*Acidez\s*\n?\s*(\d+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)\s+([0-9.,]+)/i);
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
  const m = String(token || "").trim().match(/^(0?[1-9]|[12]\d|3[01])[\/.](0?[1-9]|1[0-2])[\/.]((?:19|20)\d{2})$/);
  if (!m) return "";
  return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
}

function normalizeCampaignParts(aRaw, bRaw) {
  const aText = String(aRaw || "");
  const bText = String(bRaw || "");
  let start = Number(aText);
  let end = Number(bText);
  if (!Number.isFinite(start) || !Number.isFinite(end)) return { campaign: "", coherent: false };

  if (aText.length === 2) start = start >= 70 ? 1900 + start : 2000 + start;
  if (bText.length === 2) {
    const expected = (start + 1) % 100;
    if (Number(bText) === expected) end = start + 1;
    else end = Number(bText) >= 70 ? 1900 + Number(bText) : 2000 + Number(bText);
  }

  return {
    campaign: `${start}-${end}`,
    coherent: end === start + 1
  };
}

function campaignFromLine(line) {
  const match = String(line || "").match(/(?:CAMPA[ÑN]A|CP[ÑN]A)\s*[:.-]?\s*(\d{2,4})\s*[\/]\s*(\d{2,4})/i);
  if (!match) return { campaign: "", coherent: true, source: "absente" };
  const normalized = normalizeCampaignParts(match[1], match[2]);
  return { ...normalized, source: "ligne_extrait_compte" };
}

function isPeriodHeader(line) {
  const s = norm(line);
  return /(periodo|penodo|perodo|period)\s+desde/.test(s) && /hasta/.test(s);
}

function extractInternalEvents(doc, text) {
  if (doc.refinedType.code !== "EXTRAIT_COMPTE" && !norm(text).includes("extracto de cuenta")) return [];
  const lines = String(text || "").split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  const events = [];

  for (const line of lines) {
    if (isPeriodHeader(line)) continue;
    const conceptHit = /(LIQUIDACI[OÓ]N[^\n]*|LIQUIDA\s+CP[ÑN]A[^\n]*|REPARTO[^\n]*|RETENC\.?[^\n]*|SALDO\s+ANTERIOR[^\n]*)/i.exec(line);
    if (!conceptHit) continue;

    const dateTokens = [...line.matchAll(/\b(?:0?[1-9]|[12]\d|3[01])[\/.](?:0?[1-9]|1[0-2])[\/.](?:19|20)\d{2}\b/g)].map((m) => m[0]);
    const dateCandidates = dateTokens.map(parseDateToken).filter(Boolean);
    const years = [...new Set(dateCandidates.map((d) => d.slice(0, 4)))];
    const campaign = campaignFromLine(line);
    const reasons = [];
    if (years.length > 1) reasons.push("annees_contradictoires_ocr");
    if (campaign.campaign && !campaign.coherent) reasons.push("campagne_incoherente_ocr");
    if (!dateCandidates.length) reasons.push("date_absente_ou_illisible");

    events.push({
      sourceDocumentId: doc.documentId,
      sourceDocument: doc.originalName,
      dossierKey: doc.dossierKey,
      rawLine: line,
      concept: conceptHit[1].replace(/\s+/g, " ").trim(),
      dateCandidates,
      eventDate: reasons.length === 0 ? dateCandidates[0] : "",
      campaignCandidate: campaign.campaign,
      campaignStatus: campaign.campaign ? (campaign.coherent ? "coherente" : "ocr_a_verifier") : "absente",
      usable: reasons.length === 0,
      anomalyReasons: reasons
    });
  }
  return events;
}

function documentPrintDate(text) {
  const s = String(text || "");
  const patterns = [
    /(?:fecha\w*\s*)?documento\s+(0?[1-9]|[12]\d|3[01])\s+(0?[1-9]|1[0-2])\s+((?:19|20)\d{2})/i,
    /fecha\s*[-:]?\s*hora\s*(?:impresi[oó]n)?\s*[:.-]?\s*(0?[1-9]|[12]\d|3[01])[\/.](0?[1-9]|1[0-2])[\/.]((?:19|20)\d{2})/i
  ];
  for (const p of patterns) {
    const m = s.match(p);
    if (m) return `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
  }
  return "";
}

function buildMissingRequests(documents, internalEvents) {
  const byCampaign = new Map();
  function ensure(campaign) {
    if (!campaign) return null;
    if (!byCampaign.has(campaign)) byCampaign.set(campaign, { docs: [], events: [] });
    return byCampaign.get(campaign);
  }

  for (const doc of documents) {
    if (doc.refinedEntity.code !== "AGRI_SAN_JUAN" || !doc.campaign) continue;
    ensure(doc.campaign).docs.push(doc);
  }
  for (const event of internalEvents) {
    if (!event.campaignCandidate) continue;
    ensure(event.campaignCandidate).events.push(event);
  }

  const requests = [];
  for (const [campaign, bucket] of [...byCampaign.entries()].sort()) {
    const types = new Set(bucket.docs.map((d) => d.refinedType.code));
    const liquidationPresent = types.has("LIQUIDATION") || types.has("LIQUIDATION_FACTURE");
    const accountMentionsLiquidation = bucket.events.some((e) => /liquid/i.test(e.concept || ""));
    const supportingEvidence = types.has("EXTRAIT_COMPTE") || types.has("TICKET_APPORT") || types.has("EXTRACTO_VALES_ALMAZARA") || accountMentionsLiquidation;
    if (supportingEvidence && !liquidationPresent) {
      requests.push({
        id: `AGRI_SAN_JUAN__${campaign}__LIQUIDATION`,
        priority: "haute",
        certainty: "probable",
        documentWanted: `Liquidation(s) / facture(s) de la campagne ${campaign}`,
        campaign,
        askTo: "S.C.A. Agrícola San Juan",
        askToCode: "AGRI_SAN_JUAN",
        reason: "Des preuves de campagne sont présentes mais aucune liquidation/facture complète correspondante n'a été retrouvée.",
        evidenceDocumentIds: bucket.docs.map((d) => d.documentId),
        evidenceEvents: bucket.events.filter((e) => /liquid/i.test(e.concept || "")).map((e) => ({ sourceDocument: e.sourceDocument, rawLine: e.rawLine }))
      });
    }
  }
  return requests;
}

function buildReport(payload) {
  const s = payload.summary;
  const lines = [
    "# FINCA MARIA — Analyse complète V7",
    "",
    `Généré le ${payload.generatedAt}`,
    "",
    "## Résumé",
    "",
    `- Documents/pages analysés : **${s.documents}**`,
    `- Dossiers documentaires : **${s.dossiers}**`,
    `- Documents totalement inconnus : **${s.completelyUnknown}**`,
    `- Annexes / continuations à revoir : **${s.contextualAnnexesToReview}**`,
    `- Extraits de compte : **${s.accountExtracts}**`,
    `- Événements internes extraits : **${s.internalEvents}**`,
    `- Événements internes utilisables : **${s.usableInternalEvents}**`,
    `- Anomalies d'événements exclues de la chronologie : **${s.eventAnomalies}**`,
    `- Événements de chronologie fiables : **${s.chronologyEvents}**`,
    `- Période d'exploitation prouvée par les documents analysés : **${s.earliestOperationalDate || "?"} → ${s.latestOperationalDate || "?"}**`,
    `- Pièces probables à demander : **${s.missingRequests}**`,
    "",
    "## Garde-fous",
    "",
    "Les dates de plans, références anciennes et dates d'impression ne fixent pas à elles seules le début de l'exploitation. Les lignes OCR contradictoires sont conservées comme anomalies et exclues de la chronologie. Aucun original n'est déplacé, renommé ou classé par cette analyse."
  ];
  return lines.join("\n") + "\n";
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Analyse V3 introuvable : ${INPUT}`);
  const input = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const sourceDocs = Array.isArray(input.documents) ? input.documents : [];

  const documents = sourceDocs.map((source) => {
    const text = fullText(source);
    const refinedEntity = refineEntity(source, text);
    const refinedType = refineType(source, text);
    const doc = {
      ...source,
      refinedEntity,
      refinedType,
      factsV7: { ...(source.facts || {}) },
      documentPrintDate: "",
      internalEvents: [],
      contextualRole: ""
    };

    if (refinedType.code === "EXTRACTO_VALES_ALMAZARA") {
      doc.factsV7 = { ...doc.factsV7, ...extractValesFacts(text) };
    }
    if (refinedType.code === "EXTRAIT_COMPTE") {
      doc.documentPrintDate = documentPrintDate(text);
      doc.internalEvents = extractInternalEvents(doc, text);
    }
    if (refinedType.code === "NON_IDENTIFIE" && refinedEntity.code !== "INCONNU" && doc.context?.multipage) {
      doc.contextualRole = "ANNEXE_OU_CONTINUATION_A_VERIFIER";
    }
    return doc;
  });

  const internalEvents = documents.flatMap((d) => d.internalEvents || []);
  const eventAnomalies = internalEvents
    .filter((e) => !e.usable)
    .map((e) => ({
      type: "EVENEMENT_INTERNE_OCR_A_VERIFIER",
      sourceDocument: e.sourceDocument,
      dossierKey: e.dossierKey,
      rawLine: e.rawLine,
      dateCandidates: e.dateCandidates,
      campaignCandidate: e.campaignCandidate,
      reasons: e.anomalyReasons,
      excludedFromChronology: true
    }));

  const documentAnomalies = [];
  for (const doc of documents) {
    if (doc.refinedEntity.code === "INCONNU" && doc.refinedType.code === "NON_IDENTIFIE") {
      documentAnomalies.push({ type: "DOCUMENT_TOTALEMENT_INCONNU", document: doc.originalName, dossierKey: doc.dossierKey, priority: "haute" });
    } else if (doc.refinedType.code === "NON_IDENTIFIE") {
      documentAnomalies.push({ type: "ANNEXE_OU_TYPE_A_REVOIR", document: doc.originalName, dossierKey: doc.dossierKey, priority: "basse", contextualRole: doc.contextualRole });
    }
    if (doc.date && !doc.dateTrust?.trusted) {
      documentAnomalies.push({ type: "DATE_DOCUMENTAIRE_NON_FIABLE", document: doc.originalName, dossierKey: doc.dossierKey, value: doc.date, priority: "basse", excludedFromChronology: true });
    }
  }

  const chronology = [];
  const documentaryDates = [];

  for (const doc of documents) {
    if (doc.refinedType.code === "EXTRAIT_COMPTE") {
      if (doc.documentPrintDate) {
        documentaryDates.push({
          date: doc.documentPrintDate,
          scope: "date_impression_extrait_compte",
          documentId: doc.documentId,
          document: doc.originalName,
          dossierKey: doc.dossierKey
        });
      }
      continue;
    }

    if (doc.date && doc.dateTrust?.trusted && OPERATIONAL_TYPES.has(doc.refinedType.code)) {
      chronology.push({
        date: doc.date,
        source: "document",
        entity: doc.refinedEntity.code,
        type: doc.refinedType.code,
        campaign: doc.campaign || "",
        documentId: doc.documentId,
        document: doc.originalName,
        dossierKey: doc.dossierKey,
        facts: doc.factsV7 || {}
      });
    } else if (doc.date) {
      documentaryDates.push({
        date: doc.date,
        scope: doc.dateTrust?.trusted ? "date_documentaire_reference" : "date_non_fiable",
        documentId: doc.documentId,
        document: doc.originalName,
        dossierKey: doc.dossierKey,
        type: doc.refinedType.code
      });
    }
  }

  for (const event of internalEvents.filter((e) => e.usable && e.eventDate)) {
    chronology.push({
      date: event.eventDate,
      source: "evenement_interne_extrait_compte",
      entity: "AGRI_SAN_JUAN",
      type: "MOUVEMENT_EXTRAIT_COMPTE",
      campaign: event.campaignCandidate || "",
      document: event.sourceDocument,
      dossierKey: event.dossierKey,
      concept: event.concept,
      rawLine: event.rawLine
    });
  }

  chronology.sort((a, b) => String(a.date).localeCompare(String(b.date)));
  documentaryDates.sort((a, b) => String(a.date).localeCompare(String(b.date)));

  const requests = buildMissingRequests(documents, internalEvents);
  const anomalies = [...documentAnomalies, ...eventAnomalies];
  const completelyUnknown = documents.filter((d) => d.refinedEntity.code === "INCONNU" && d.refinedType.code === "NON_IDENTIFIE").length;
  const contextualAnnexesToReview = documents.filter((d) => d.contextualRole === "ANNEXE_OU_CONTINUATION_A_VERIFIER").length;
  const accountExtracts = documents.filter((d) => d.refinedType.code === "EXTRAIT_COMPTE").length;
  const operationalDates = chronology.map((e) => e.date).filter(Boolean).sort();

  const payload = {
    version: 7,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    project: "FINCA MARIA",
    purpose: "Transformer le fonds documentaire en faits, événements, anomalies, chronologie fiable et demandes de pièces, tout en gardant chaque donnée reliée à sa preuve source.",
    summary: {
      documents: documents.length,
      dossiers: Array.isArray(input.dossiers) ? input.dossiers.length : 0,
      completelyUnknown,
      contextualAnnexesToReview,
      accountExtracts,
      internalEvents: internalEvents.length,
      usableInternalEvents: internalEvents.filter((e) => e.usable).length,
      eventAnomalies: eventAnomalies.length,
      chronologyEvents: chronology.length,
      earliestOperationalDate: operationalDates[0] || "",
      latestOperationalDate: operationalDates.at(-1) || "",
      documentaryDates: documentaryDates.length,
      anomalies: anomalies.length,
      missingRequests: requests.length
    },
    dossiers: input.dossiers || [],
    documents,
    chronology,
    documentaryDates,
    internalEvents,
    anomalies,
    missingDocumentRequests: requests
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(CHRONOLOGY, JSON.stringify({ generatedAt: payload.generatedAt, chronology, documentaryDates }, null, 2), "utf-8");
  fs.writeFileSync(EVENTS, JSON.stringify({ generatedAt: payload.generatedAt, events: internalEvents }, null, 2), "utf-8");
  fs.writeFileSync(ANOMALIES, JSON.stringify({ generatedAt: payload.generatedAt, anomalies }, null, 2), "utf-8");
  fs.writeFileSync(REQUESTS, JSON.stringify({ generatedAt: payload.generatedAt, requests }, null, 2), "utf-8");
  fs.writeFileSync(REPORT, buildReport(payload), "utf-8");

  console.log("=== FINCA MARIA — CONSOLIDATION V7 ===");
  console.log("Documents/pages :", payload.summary.documents);
  console.log("Dossiers :", payload.summary.dossiers);
  console.log("Documents totalement inconnus :", payload.summary.completelyUnknown);
  console.log("Annexes/contextes à revoir :", payload.summary.contextualAnnexesToReview);
  console.log("Extraits de compte :", payload.summary.accountExtracts);
  console.log("Événements internes extraits :", payload.summary.internalEvents);
  console.log("Événements internes utilisables :", payload.summary.usableInternalEvents);
  console.log("Anomalies d'événements hors chronologie :", payload.summary.eventAnomalies);
  console.log("Événements chronologiques fiables :", payload.summary.chronologyEvents);
  console.log("Période exploitation prouvée :", `${payload.summary.earliestOperationalDate || "?"} -> ${payload.summary.latestOperationalDate || "?"}`);
  console.log("Dates documentaires gardées à part :", payload.summary.documentaryDates);
  console.log("Pièces probables à demander :", payload.summary.missingRequests);
  console.log("Analyse :", OUTPUT);
  console.log("Chronologie :", CHRONOLOGY);
  console.log("Événements :", EVENTS);
  console.log("Anomalies :", ANOMALIES);
  console.log("Demandes :", REQUESTS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
