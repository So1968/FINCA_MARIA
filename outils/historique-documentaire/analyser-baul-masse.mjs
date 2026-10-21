#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BAUL_ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INDEX_FILE = path.join(BAUL_ROOT, "_INDEX_BAUL.json");
const ANALYSIS_FILE = path.join(BAUL_ROOT, "_ANALYSE_EXPLOITATION.json");
const REQUESTS_FILE = path.join(BAUL_ROOT, "_PIECES_A_DEMANDER.json");
const REPORT_FILE = path.join(BAUL_ROOT, "_RAPPORT_ANALYSE_BAUL.md");

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".log"]);

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeToken(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function includesAny(text, words) {
  const source = normalizeText(text);
  return words.some((word) => source.includes(normalizeText(word)));
}

function isInsideBaul(candidatePath) {
  const candidate = path.resolve(candidatePath);
  const root = path.resolve(BAUL_ROOT);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function fromPortablePath(relativePath) {
  const normalized = String(relativePath || "").split("/").join(path.sep);
  const candidate = path.resolve(BAUL_ROOT, normalized);
  if (!isInsideBaul(candidate)) throw new Error("Chemin BAÚL invalide.");
  return candidate;
}

function resolveDocumentFile(document) {
  const candidates = [];
  if (document.currentRelativePath) candidates.push(fromPortablePath(document.currentRelativePath));
  if (document.originalRelativePath) candidates.push(fromPortablePath(document.originalRelativePath));
  if (document.storedName) {
    candidates.push(path.join(BAUL_ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", document.storedName));
  }
  const existing = candidates.find((candidate) => isInsideBaul(candidate) && fs.existsSync(candidate));
  if (!existing) throw new Error("Fichier introuvable dans le BAÚL");
  return existing;
}

async function commandExists(command) {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

async function runCommand(command, args, maxBuffer = 12 * 1024 * 1024) {
  const { stdout } = await execFileAsync(command, args, { encoding: "utf-8", maxBuffer });
  return String(stdout || "");
}

async function readDocumentText(document, filePath, capabilities) {
  const extension = path.extname(filePath).toLowerCase();
  const mime = String(document.mimeType || "").toLowerCase();

  if (extension === ".pdf" || mime === "application/pdf") {
    if (!capabilities.pdftotext) {
      return { text: "", method: "pdftotext", status: "lecteur_pdf_indisponible" };
    }
    try {
      const text = (await runCommand("pdftotext", ["-layout", "-nopgbrk", filePath, "-"])).trim();
      return text.length >= 20
        ? { text: text.slice(0, 250000), method: "pdftotext", status: "lu" }
        : { text: "", method: "pdftotext", status: "pdf_scan_ocr_a_prevoir" };
    } catch {
      return { text: "", method: "pdftotext", status: "lecture_pdf_impossible" };
    }
  }

  if (IMAGE_EXTENSIONS.has(extension) || mime.startsWith("image/")) {
    if (!capabilities.tesseract) {
      return { text: "", method: "tesseract", status: "ocr_indisponible" };
    }
    try {
      const text = (await runCommand("tesseract", [filePath, "stdout", "-l", "spa+fra+eng", "--psm", "3"])).trim();
      return text.length >= 12
        ? { text: text.slice(0, 250000), method: "tesseract_spa_fra_eng", status: "lu_ocr" }
        : { text: text.slice(0, 250000), method: "tesseract_spa_fra_eng", status: "ocr_peu_lisible" };
    } catch {
      return { text: "", method: "tesseract", status: "ocr_echec" };
    }
  }

  if (TEXT_EXTENSIONS.has(extension) || mime.startsWith("text/")) {
    try {
      return { text: fs.readFileSync(filePath, "utf-8").slice(0, 250000), method: "texte_local", status: "lu" };
    } catch {
      return { text: "", method: "texte_local", status: "lecture_impossible" };
    }
  }

  return { text: "", method: "aucun", status: "format_non_lu" };
}

function detectDocumentType(text, name) {
  const source = `${text || ""}\n${name || ""}`;
  const invoice = includesAny(source, ["factura", "facture", "invoice", "nº factura", "numero factura", "número factura"]);
  const liquidation = includesAny(source, ["liquidacion", "liquidación", "reparto"]);
  const ticket = includesAny(source, ["ticket de entrega", "ticket apport", "ticket de aceituna", "albaran", "albarán", "entrada aceituna"]);

  if (invoice && liquidation) return "LIQUIDATION_FACTURE";
  if (ticket) return "TICKET_APPORT";
  if (liquidation) return "LIQUIDATION";
  if (invoice) return "FACTURE";
  if (includesAny(source, ["solicitud unica", "solicitud única"])) return "SOLICITUD_UNICA_PAC";
  if (includesAny(source, ["resolucion pac", "resolución pac", "ayuda pac", "subvencion", "subvención"])) return "PAC_AIDE_RESOLUTION";
  if (includesAny(source, ["presupuesto", "devis"])) return "DEVIS";
  if (includesAny(source, ["recibo", "reçu", "receipt"])) return "RECU";
  if (includesAny(source, ["acta", "reunion", "réunion", "compte rendu"])) return "REUNION_DECISION";
  return "NON_IDENTIFIE";
}

function detectEntity(text, name) {
  const source = `${text || ""}\n${name || ""}`;
  if (includesAny(source, [
    "s.c.a. agricola san juan", "s.c.a. agrícola san juan", "agricola san juan", "agrícola san juan", "agri san juan",
    "cooperativa san juan", "san juan"
  ])) return { code: "AGRI_SAN_JUAN", label: "Agri San Juan", confidence: 0.98 };

  if (includesAny(source, ["pelaez", "peláez", "gestoria", "gestoría"])) {
    return { code: "PELAEZ", label: "Peláez", confidence: 0.95 };
  }

  if (includesAny(source, ["pac", "solicitud unica", "solicitud única", "sigpac", "subvencion", "subvención"])) {
    return { code: "PAC", label: "PAC / administration agricole", confidence: 0.9 };
  }

  return { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0.2 };
}

function detectDate(text) {
  const source = String(text || "");
  const labelled = source.match(/(?:fecha(?:\s+de\s+emisi[oó]n)?|date)\s*[:.-]?\s*(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/i);
  if (labelled) return `${labelled[3]}-${String(labelled[2]).padStart(2, "0")}-${String(labelled[1]).padStart(2, "0")}`;

  const dmy = source.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;

  const ymd = source.match(/\b((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;
  return "";
}

function detectDocumentNumber(text, type) {
  const source = String(text || "").replace(/\s+/g, " ");
  const patterns = [
    /(?:n[uú]mero\s+)?liquidaci[oó]n\s*\/\s*factura\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /(?:n[uú]mero\s+)?factura\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /factura\s*(?:n[º°o.]?|n[uú]m(?:ero)?\.?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /(?:n[uú]mero\s+)?liquidaci[oó]n\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /albar[aá]n\s*(?:n[º°o.]?|n[uú]m(?:ero)?\.?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /ticket\s*(?:n[º°o.]?|n[uú]m(?:ero)?\.?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      const token = normalizeToken(match[1]).slice(0, 28);
      if (token && !["DE", "DEL", "FECHA", "EMISION", "FACTURA", "LIQUIDACION"].includes(token)) return token;
    }
  }

  if (type !== "NON_IDENTIFIE") {
    const loose = source.match(/(?:n[º°o.]?|n[uú]m(?:ero)?\.?)[\s:#-]*([0-9]{2,12})/i);
    if (loose?.[1]) return loose[1];
  }
  return "";
}

function parseSpanishNumber(raw) {
  const cleaned = String(raw || "").replace(/\s/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const value = Number(cleaned.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(value) ? value : null;
}

function snippetAround(text, index, radius = 65) {
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + radius);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function addFact(facts, fact) {
  if (fact.value === null || fact.value === undefined || fact.value === "") return;
  const key = `${fact.kind}|${fact.value}|${fact.unit || ""}|${fact.label || ""}`;
  if (!facts.some((item) => `${item.kind}|${item.value}|${item.unit || ""}|${item.label || ""}` === key)) facts.push(fact);
}

function extractFacts(text) {
  const source = String(text || "");
  const facts = [];

  const weightPatterns = [
    { regex: /(?:peso\s+(?:neto|total)|kilos?\s+(?:de\s+)?aceitunas?|kg\s+(?:de\s+)?aceitunas?|aceitunas?\s*[:=])\s*([0-9][0-9.\s]*[,\.]?[0-9]*)/gi, label: "Poids olives" },
    { regex: /(?:total\s+kg|kg\s+total)\s*[:=]?\s*([0-9][0-9.\s]*[,\.]?[0-9]*)/gi, label: "Poids total" }
  ];
  for (const { regex, label } of weightPatterns) {
    for (const match of source.matchAll(regex)) {
      const value = parseSpanishNumber(match[1]);
      if (value !== null && value > 0 && value < 1000000) {
        addFact(facts, { kind: "weight", value, unit: "kg", label, confidence: 0.82, sourceSnippet: snippetAround(source, match.index || 0) });
      }
    }
  }

  for (const match of source.matchAll(/rendimiento\s*[:=]?\s*([0-9]{1,2}(?:[,.][0-9]{1,3})?)\s*%/gi)) {
    const value = parseSpanishNumber(match[1]);
    if (value !== null && value >= 0 && value <= 100) {
      addFact(facts, { kind: "yield", value, unit: "%", label: "Rendement", confidence: 0.95, sourceSnippet: snippetAround(source, match.index || 0) });
    }
  }

  const oilPatterns = [
    /(?:kg\s+(?:de\s+)?aceite|aceite\s+(?:obtenido|producido)|kilos?\s+(?:de\s+)?aceite)\s*[:=]?\s*([0-9][0-9.\s]*[,\.]?[0-9]*)/gi,
    /(?:aceite\s+total)\s*[:=]?\s*([0-9][0-9.\s]*[,\.]?[0-9]*)/gi
  ];
  for (const regex of oilPatterns) {
    for (const match of source.matchAll(regex)) {
      const value = parseSpanishNumber(match[1]);
      if (value !== null && value > 0 && value < 1000000) {
        addFact(facts, { kind: "oil", value, unit: "kg", label: "Huile", confidence: 0.86, sourceSnippet: snippetAround(source, match.index || 0) });
      }
    }
  }

  const moneyPatterns = [
    { regex: /l[ií]quido\s+total\s+a\s+percibir\s*[:=]?\s*([0-9][0-9.\s]*[,\.]?[0-9]*)\s*(?:€|eur)?/gi, label: "Liquide total à percevoir", confidence: 0.97 },
    { regex: /(?:importe\s+total|total\s+a\s+pagar|total\s+factura)\s*[:=]?\s*([0-9][0-9.\s]*[,\.]?[0-9]*)\s*(?:€|eur)?/gi, label: "Montant total", confidence: 0.9 }
  ];
  for (const { regex, label, confidence } of moneyPatterns) {
    for (const match of source.matchAll(regex)) {
      const value = parseSpanishNumber(match[1]);
      if (value !== null && value >= 0 && value < 10000000) {
        addFact(facts, { kind: "money", value, unit: "EUR", label, confidence, sourceSnippet: snippetAround(source, match.index || 0) });
      }
    }
  }

  return facts;
}

function inferCampaign(date, entityCode, type) {
  if (!date) return { campaign: "", confidence: 0, method: "aucune_date" };
  if (entityCode !== "AGRI_SAN_JUAN" && !["TICKET_APPORT", "LIQUIDATION", "LIQUIDATION_FACTURE"].includes(type)) {
    return { campaign: "", confidence: 0, method: "non_agricole" };
  }

  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  if (!year || !month) return { campaign: "", confidence: 0, method: "date_invalide" };

  const startYear = month >= 8 ? year : year - 1;
  return {
    campaign: `${startYear}-${String(startYear + 1).slice(-2)}`,
    confidence: 0.72,
    method: "inference_calendaire_a_confirmer"
  };
}

function classifyCategory(entity, type, text) {
  if (entity.code === "AGRI_SAN_JUAN") return "cooperative";
  if (entity.code === "PELAEZ") return "pelaez";
  if (entity.code === "PAC" || type.includes("PAC")) return "pac";
  if (["FACTURE", "DEVIS", "RECU"].includes(type)) return "factures";
  if (type === "REUNION_DECISION") return "reunions";
  if (includesAny(text, ["sigpac", "catastro", "cadastral", "parcela", "plano"])) return "plans";
  if (includesAny(text, ["casa", "maison", "location", "inventario", "inventaire"])) return "casa";
  if (includesAny(text, ["finca", "olivar", "olivier", "cosecha", "récolte", "tratamiento", "traitement"])) return "terrain";
  return "verifier";
}

function buildConfidence(reading, entity, type, date, number, facts) {
  let score = 0;
  if (["lu", "lu_ocr"].includes(reading.status)) score += 0.35;
  if (entity.code !== "INCONNU") score += 0.2;
  if (type !== "NON_IDENTIFIE") score += 0.2;
  if (date) score += 0.12;
  if (number) score += 0.08;
  if (facts.length) score += 0.05;
  return Math.min(0.99, Number(score.toFixed(2)));
}

function groupBy(items, keyFn) {
  const map = new Map();
  for (const item of items) {
    const key = keyFn(item) || "NON_RENSEIGNE";
    map.set(key, [...(map.get(key) || []), item]);
  }
  return map;
}

function countBy(items, keyFn) {
  return Object.fromEntries([...groupBy(items, keyFn)].map(([key, values]) => [key, values.length]));
}

function makeRequest({ code, title, campaign = "", recipient, recipientConfidence, reason, evidenceDocumentIds, certainty = "probable", priority = "normale" }) {
  return {
    id: code,
    title,
    campaign,
    recipient,
    recipientConfidence,
    reason,
    certainty,
    priority,
    status: "a_demander",
    evidenceDocumentIds: [...new Set(evidenceDocumentIds || [])],
    createdBy: "analyse_baul",
    createdAt: new Date().toISOString()
  };
}

function detectMissingDocuments(analyses) {
  const requests = [];
  const byCampaign = groupBy(
    analyses.filter((item) => item.campaign),
    (item) => item.campaign
  );

  for (const [campaign, docs] of byCampaign) {
    const agri = docs.filter((item) => item.entity.code === "AGRI_SAN_JUAN");
    if (!agri.length) continue;

    const hasTicket = agri.some((item) => item.type === "TICKET_APPORT");
    const hasLiquidation = agri.some((item) => ["LIQUIDATION", "LIQUIDATION_FACTURE"].includes(item.type));

    if (hasTicket && !hasLiquidation) {
      requests.push(makeRequest({
        code: `AGRI_SAN_JUAN_${campaign}_LIQUIDATION`,
        title: `Liquidation / facture de clôture ${campaign}`,
        campaign,
        recipient: "Agri San Juan",
        recipientConfidence: 0.98,
        reason: "Des tickets/apports Agri San Juan existent pour cette campagne, mais aucune liquidation de clôture n'a été retrouvée.",
        evidenceDocumentIds: agri.filter((item) => item.type === "TICKET_APPORT").map((item) => item.documentId),
        certainty: "probable",
        priority: "haute"
      }));
    }

    if (hasLiquidation && !hasTicket) {
      requests.push(makeRequest({
        code: `AGRI_SAN_JUAN_${campaign}_TICKETS`,
        title: `Tickets / relevés d'apport ${campaign}`,
        campaign,
        recipient: "Agri San Juan",
        recipientConfidence: 0.9,
        reason: "Une liquidation Agri San Juan existe, mais aucun ticket d'apport correspondant n'a été retrouvé dans le BAÚL.",
        evidenceDocumentIds: agri.filter((item) => ["LIQUIDATION", "LIQUIDATION_FACTURE"].includes(item.type)).map((item) => item.documentId),
        certainty: "probable",
        priority: "normale"
      }));
    }
  }

  const pacByYear = groupBy(
    analyses.filter((item) => item.entity.code === "PAC" || item.type.includes("PAC")),
    (item) => item.date?.slice(0, 4)
  );
  for (const [year, docs] of pacByYear) {
    if (!year || year === "NON_RENSEIGNE") continue;
    const hasSolicitud = docs.some((item) => item.type === "SOLICITUD_UNICA_PAC");
    if (!hasSolicitud && docs.length) {
      const pelaezMention = docs.some((item) => item.entity.code === "PELAEZ");
      requests.push(makeRequest({
        code: `PAC_${year}_SOLICITUD_UNICA`,
        title: `Copie de la Solicitud Única PAC ${year}`,
        campaign: year,
        recipient: pelaezMention ? "Peláez" : "Peláez / interlocuteur PAC à confirmer",
        recipientConfidence: pelaezMention ? 0.9 : 0.6,
        reason: "Des pièces PAC de cette année existent, mais la Solicitud Única n'a pas été retrouvée.",
        evidenceDocumentIds: docs.map((item) => item.documentId),
        certainty: "probable",
        priority: "normale"
      }));
    }
  }

  return requests;
}

function buildMarkdownReport(payload, requests) {
  const lines = [];
  lines.push("# Rapport d'analyse BAÚL — FINCA MARIA", "");
  lines.push(`Généré le : ${payload.generatedAt}`, "");
  lines.push(`Documents analysés : **${payload.summary.analyzed}**`);
  lines.push(`Documents lisibles : **${payload.summary.readable}**`);
  lines.push(`Documents à revoir : **${payload.summary.needsReview}**`);
  lines.push(`Période documentaire détectée : **${payload.summary.earliestDate || "inconnue"} → ${payload.summary.latestDate || "inconnue"}**`, "");
  lines.push("## Répartition par type", "");
  for (const [type, count] of Object.entries(payload.summary.byType)) lines.push(`- ${type} : ${count}`);
  lines.push("", "## Répartition par interlocuteur", "");
  for (const [entity, count] of Object.entries(payload.summary.byEntity)) lines.push(`- ${entity} : ${count}`);
  lines.push("", "## Campagnes détectées", "");
  for (const [campaign, count] of Object.entries(payload.summary.byCampaign)) lines.push(`- ${campaign} : ${count} document(s)`);
  lines.push("", "## Pièces à demander", "");
  if (!requests.length) {
    lines.push("Aucune pièce manquante certaine/probable n'a encore été détectée à partir des documents analysés.");
  } else {
    for (const request of requests) {
      lines.push(`- **${request.title}** — à demander à **${request.recipient}** — ${request.reason}`);
    }
  }
  lines.push("", "## Règle de lecture", "");
  lines.push("Les données extraites restent des propositions automatiques reliées à leur document source. Une conclusion historique ou économique ne doit être considérée comme solide qu'après contrôle des anomalies et des pièces manquantes.");
  return lines.join("\n");
}

async function main() {
  if (!fs.existsSync(INDEX_FILE)) {
    console.error(`Index BAÚL introuvable : ${INDEX_FILE}`);
    process.exitCode = 1;
    return;
  }

  const capabilities = {
    tesseract: await commandExists("tesseract"),
    pdftotext: await commandExists("pdftotext")
  };

  console.log("BAÚL :", BAUL_ROOT);
  console.log("Tesseract :", capabilities.tesseract ? "disponible" : "absent");
  console.log("pdftotext :", capabilities.pdftotext ? "disponible" : "absent");

  const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  const documents = Array.isArray(index.documents) ? index.documents : [];
  const analyses = [];
  const errors = [];

  let current = 0;
  for (const document of documents) {
    current += 1;
    const label = document.originalName || document.storedName || document.id || `document-${current}`;
    process.stdout.write(`[${current}/${documents.length}] ${label} ... `);

    try {
      const filePath = resolveDocumentFile(document);
      const reading = await readDocumentText(document, filePath, capabilities);
      const type = detectDocumentType(reading.text, document.originalName);
      const entity = detectEntity(reading.text, document.originalName);
      const date = detectDate(reading.text) || String(document.documentDate || "");
      const number = detectDocumentNumber(reading.text, type) || String(document.detectedDocumentNumber || "");
      const facts = extractFacts(reading.text);
      const campaignInfo = inferCampaign(date, entity.code, type);
      const category = classifyCategory(entity, type, reading.text);
      const confidence = buildConfidence(reading, entity, type, date, number, facts);

      analyses.push({
        documentId: document.id,
        originalName: document.originalName,
        storedName: document.storedName,
        statusInBaul: document.status,
        source: {
          originalRelativePath: document.originalRelativePath || "",
          currentRelativePath: document.currentRelativePath || ""
        },
        reading: {
          method: reading.method,
          status: reading.status
        },
        entity,
        type,
        date,
        number,
        campaign: campaignInfo.campaign,
        campaignInference: campaignInfo,
        suggestedCategory: category,
        confidence,
        facts,
        needsReview: confidence < 0.75 || category === "verifier" || !["lu", "lu_ocr"].includes(reading.status)
      });
      console.log(`${reading.status} | ${entity.code} | ${type} | ${date || "date ?"}`);
    } catch (error) {
      errors.push({ documentId: document.id, originalName: document.originalName, error: error.message || "Erreur inconnue" });
      analyses.push({
        documentId: document.id,
        originalName: document.originalName,
        storedName: document.storedName,
        statusInBaul: document.status,
        entity: { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0 },
        type: "NON_IDENTIFIE",
        date: "",
        number: "",
        campaign: "",
        suggestedCategory: "verifier",
        confidence: 0,
        facts: [],
        needsReview: true,
        error: error.message || "Erreur inconnue"
      });
      console.log("ERREUR");
    }
  }

  const dates = analyses.map((item) => item.date).filter(Boolean).sort();
  const readable = analyses.filter((item) => ["lu", "lu_ocr"].includes(item.reading?.status)).length;
  const needsReview = analyses.filter((item) => item.needsReview).length;
  const requests = detectMissingDocuments(analyses);

  const payload = {
    version: 1,
    generatedAt: new Date().toISOString(),
    project: "FINCA MARIA",
    purpose: "Reconstituer l'histoire de l'exploitation, comparer les campagnes et détecter les pièces manquantes sans déplacer ni classer automatiquement les originaux.",
    capabilities,
    summary: {
      totalInIndex: documents.length,
      analyzed: analyses.length,
      readable,
      needsReview,
      errors: errors.length,
      earliestDate: dates[0] || "",
      latestDate: dates.at(-1) || "",
      byType: countBy(analyses, (item) => item.type),
      byEntity: countBy(analyses, (item) => item.entity?.code),
      byCategory: countBy(analyses, (item) => item.suggestedCategory),
      byCampaign: countBy(analyses.filter((item) => item.campaign), (item) => item.campaign)
    },
    documents: analyses,
    missingDocumentRequests: requests,
    errors
  };

  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify({ generatedAt: payload.generatedAt, requests }, null, 2), "utf-8");
  fs.writeFileSync(REPORT_FILE, buildMarkdownReport(payload, requests), "utf-8");

  console.log("");
  console.log("=== ANALYSE TERMINÉE ===");
  console.log("Documents analysés :", analyses.length);
  console.log("Documents à revoir :", needsReview);
  console.log("Pièces à demander détectées :", requests.length);
  console.log("Période détectée :", `${payload.summary.earliestDate || "?"} -> ${payload.summary.latestDate || "?"}`);
  console.log("Analyse :", ANALYSIS_FILE);
  console.log("Demandes :", REQUESTS_FILE);
  console.log("Rapport :", REPORT_FILE);
  console.log("");
  console.log("Aucun document n'a été déplacé ni classé automatiquement.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
