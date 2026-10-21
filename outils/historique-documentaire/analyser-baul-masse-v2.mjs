#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const BAUL_ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INDEX_FILE = path.join(BAUL_ROOT, "_INDEX_BAUL.json");
const CACHE_ROOT = path.join(BAUL_ROOT, "_CACHE_OCR");
const ANALYSIS_FILE = path.join(BAUL_ROOT, "_ANALYSE_EXPLOITATION_V2.json");
const REQUESTS_FILE = path.join(BAUL_ROOT, "_PIECES_A_DEMANDER_V2.json");
const UNKNOWN_FILE = path.join(BAUL_ROOT, "_INCONNUS_A_RECONNAITRE_V2.json");
const REPORT_FILE = path.join(BAUL_ROOT, "_RAPPORT_ANALYSE_BAUL_V2.md");

const OCR_VERSION = "tesseract-psm1-spa-fra-eng-v2";
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"]);
const TEXT_EXTENSIONS = new Set([".txt", ".md", ".csv", ".json", ".log"]);

const args = process.argv.slice(2);
const limitArg = args.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Math.max(1, Number(limitArg.split("=")[1]) || 0) : 0;
const FORCE_OCR = args.includes("--force-ocr");

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

function readIndex() {
  if (!fs.existsSync(INDEX_FILE)) throw new Error(`Index BAÚL introuvable : ${INDEX_FILE}`);
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
  if (!Array.isArray(index.documents)) throw new Error("Index BAÚL illisible : documents absent.");
  return index;
}

function resolveDocumentFile(document) {
  const candidates = [];
  if (document.currentRelativePath) candidates.push(fromPortablePath(document.currentRelativePath));
  if (document.originalRelativePath) candidates.push(fromPortablePath(document.originalRelativePath));
  if (document.storedName) {
    candidates.push(path.join(BAUL_ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", document.storedName));
  }
  const existing = candidates.find((candidate) => isInsideBaul(candidate) && fs.existsSync(candidate));
  if (!existing) throw new Error("Fichier introuvable dans le BAÚL.");
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

async function runCommand(command, commandArgs, maxBuffer = 16 * 1024 * 1024) {
  const { stdout } = await execFileAsync(command, commandArgs, {
    encoding: "utf-8",
    maxBuffer
  });
  return String(stdout || "");
}

function fileSignature(filePath) {
  const stat = fs.statSync(filePath);
  return `${OCR_VERSION}|${filePath}|${stat.size}|${Math.trunc(stat.mtimeMs)}`;
}

function cachePathFor(filePath) {
  const hash = crypto.createHash("sha256").update(fileSignature(filePath)).digest("hex");
  return path.join(CACHE_ROOT, `${hash}.json`);
}

function readCache(filePath) {
  if (FORCE_OCR) return null;
  const cachePath = cachePathFor(filePath);
  if (!fs.existsSync(cachePath)) return null;
  try {
    const cached = JSON.parse(fs.readFileSync(cachePath, "utf-8"));
    if (cached.version !== OCR_VERSION) return null;
    return { ...cached.reading, cached: true };
  } catch {
    return null;
  }
}

function writeCache(filePath, reading) {
  fs.mkdirSync(CACHE_ROOT, { recursive: true });
  const cachePath = cachePathFor(filePath);
  fs.writeFileSync(cachePath, JSON.stringify({
    version: OCR_VERSION,
    createdAt: new Date().toISOString(),
    reading: {
      text: String(reading.text || "").slice(0, 300000),
      method: reading.method,
      status: reading.status
    }
  }), "utf-8");
}

async function ocrImage(filePath) {
  const cached = readCache(filePath);
  if (cached) return cached;

  const text = (await runCommand("tesseract", [
    filePath,
    "stdout",
    "-l",
    "spa+fra+eng",
    "--psm",
    "1"
  ])).trim();

  const reading = {
    text: text.slice(0, 300000),
    method: "tesseract_psm1_auto_orientation_spa_fra_eng",
    status: text.length >= 20 ? "lu_ocr" : "ocr_peu_lisible",
    cached: false
  };
  writeCache(filePath, reading);
  return reading;
}

async function ocrScannedPdf(filePath, capabilities) {
  if (!capabilities.pdftoppm || !capabilities.tesseract) {
    return { text: "", method: "pdf_scan", status: "ocr_pdf_indisponible", cached: false };
  }

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "cortijo-pdf-"));
  const prefix = path.join(tempRoot, "page");
  try {
    await runCommand("pdftoppm", ["-f", "1", "-l", "12", "-jpeg", "-r", "170", filePath, prefix]);
    const images = fs.readdirSync(tempRoot)
      .filter((name) => name.toLowerCase().endsWith(".jpg"))
      .sort()
      .map((name) => path.join(tempRoot, name));

    const parts = [];
    for (const image of images) {
      const text = (await runCommand("tesseract", [image, "stdout", "-l", "spa+fra+eng", "--psm", "1"])).trim();
      if (text) parts.push(text);
    }
    const text = parts.join("\n\n--- PAGE ---\n\n").slice(0, 300000);
    return {
      text,
      method: "pdftoppm+tesseract_psm1",
      status: text.length >= 20 ? "lu_ocr" : "ocr_peu_lisible",
      cached: false
    };
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

async function readDocumentText(document, filePath, capabilities) {
  const extension = path.extname(filePath).toLowerCase();

  if (IMAGE_EXTENSIONS.has(extension)) {
    if (!capabilities.tesseract) return { text: "", method: "aucun", status: "ocr_indisponible", cached: false };
    return ocrImage(filePath);
  }

  if (extension === ".pdf") {
    if (capabilities.pdftotext) {
      const text = (await runCommand("pdftotext", ["-layout", "-nopgbrk", filePath, "-"])).trim();
      if (text.length >= 30) {
        return { text: text.slice(0, 300000), method: "pdftotext", status: "lu", cached: false };
      }
    }
    return ocrScannedPdf(filePath, capabilities);
  }

  if (TEXT_EXTENSIONS.has(extension)) {
    return {
      text: fs.readFileSync(filePath, "utf-8").slice(0, 300000),
      method: "texte_local",
      status: "lu",
      cached: false
    };
  }

  return { text: "", method: "aucun", status: "format_non_lu", cached: false };
}

function detectEntity(text, name) {
  const source = `${text || ""}\n${name || ""}`;

  if (includesAny(source, [
    "agricola san juan", "agrícola san juan", "s.c.a. agricola san juan", "s.c.a. agrícola san juan",
    "sociedad cooperativa andaluza", "agri san juan", "almazara", "san juan"
  ])) {
    return { code: "AGRI_SAN_JUAN", label: "S.C.A. Agrícola San Juan", confidence: 0.98 };
  }
  if (includesAny(source, ["pelaez", "peláez"])) {
    return { code: "PELAEZ", label: "Peláez", confidence: 0.96 };
  }
  if (includesAny(source, ["junta de andalucia", "junta de andalucía", "fega", "solicitud unica", "solicitud única", "pac"])) {
    return { code: "PAC_ADMINISTRATION", label: "Administration PAC", confidence: 0.9 };
  }
  if (includesAny(source, ["banco", "bank", "caixabank", "unicaja", "cajamar", "santander", "bbva"])) {
    return { code: "BANQUE", label: "Banque", confidence: 0.85 };
  }
  return { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0 };
}

function detectDocumentType(text, name) {
  const source = `${text || ""}\n${name || ""}`;
  const invoice = includesAny(source, ["factura", "facture", "invoice", "factura/liq"]);
  const liquidation = includesAny(source, ["liquidacion", "liquidación", "reparto", "liq.", "liquido total a percibir", "líquido total a percibir"]);

  if (includesAny(source, ["extracto de cuenta", "extrait de compte", "saldo anterior"])) return "EXTRAIT_COMPTE";
  if (invoice && liquidation) return "LIQUIDATION_FACTURE";
  if (includesAny(source, ["ticket de entrega", "ticket de aportacion", "ticket de aportación", "albaran", "albarán"])) return "TICKET_APPORT";
  if (liquidation) return "LIQUIDATION";
  if (includesAny(source, ["solicitud unica", "solicitud única"])) return "PAC_SOLICITUD_UNICA";
  if (includesAny(source, ["resolucion", "resolución"]) && includesAny(source, ["pac", "fega", "ayuda", "subvencion", "subvención"])) return "PAC_RESOLUTION";
  if (invoice) return "FACTURE";
  if (includesAny(source, ["presupuesto", "devis"])) return "DEVIS";
  if (includesAny(source, ["recibo", "reçu", "receipt"])) return "RECU";
  if (includesAny(source, ["catastro", "sigpac", "parcela", "recinto"])) return "PLAN_PARCELLE";
  return "NON_IDENTIFIE";
}

function normalizeYearPart(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (String(value).length === 4) return String(n);
  return n >= 70 ? String(1900 + n) : String(2000 + n);
}

function detectExplicitCampaign(text) {
  const source = String(text || "");
  const patterns = [
    /(?:cp[ñn]a|campa[ñn]a|campagne)\s*[:.-]?\s*(\d{2,4})\s*[\/-]\s*(\d{2,4})/i,
    /(?:reparto|cosecha)\s+(?:cp[ñn]a\s*)?(\d{2,4})\s*[\/-]\s*(\d{2,4})/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      const a = normalizeYearPart(match[1]);
      const b = normalizeYearPart(match[2]);
      if (a && b) return `${a}-${b}`;
    }
  }
  return "";
}

function detectDate(text) {
  const source = String(text || "");
  const labelledPatterns = [
    /(?:fecha\s*(?:de\s*)?emisi[oó]n|fecha\s*emisi[oó]n|date)\s*[:.-]?\s*(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/i,
    /(?:desde\s+fecha|hasta\s+fecha)\s*[:.-]?\s*(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/i
  ];
  for (const pattern of labelledPatterns) {
    const match = source.match(pattern);
    if (match) return `${match[3]}-${String(match[2]).padStart(2, "0")}-${String(match[1]).padStart(2, "0")}`;
  }

  const ymd = source.match(/\b((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;

  const dmy = source.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  return "";
}

function detectDocumentNumber(text, type) {
  const source = String(text || "").replace(/\s+/g, " ");
  const patterns = [
    /factura\s*\/\s*liq\.?\s*n[º°o.]?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /liquidaci[oó]n\s*\/\s*factura\s*(?:n[º°o.]?|n[uú]m(?:ero)?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /(?:n[º°o.]?|n[uú]m(?:ero)?\.?)[\s:#-]*(\d{2,12})/i,
    /factura\s*(?:n[º°o.]?|n[uú]m(?:ero)?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /liquidaci[oó]n\s*(?:n[º°o.]?|n[uú]m(?:ero)?)?\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      const token = normalizeToken(match[1]).slice(0, 28);
      if (token && !["DE", "DEL", "FECHA", "EMISION", "FACTURA", "LIQUIDACION"].includes(token)) return token;
    }
  }
  return type === "NON_IDENTIFIE" ? "" : "";
}

function parseSpanishNumber(raw) {
  let s = String(raw || "").trim().replace(/\s/g, "").replace(/€/g, "");
  if (!s) return null;
  s = s.replace(/[^0-9,.-]/g, "");
  if (!s || s === "-" || s === "." || s === ",") return null;

  const hasComma = s.includes(",");
  const hasDot = s.includes(".");
  if (hasComma && hasDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    s = s.replace(",", ".");
  } else if (hasDot) {
    const parts = s.split(".");
    if (parts.length === 2 && parts[1].length === 3 && parts[0].replace("-", "").length <= 3) {
      s = parts.join("");
    }
  }
  const value = Number(s);
  return Number.isFinite(value) ? value : null;
}

function firstLabeledNumber(text, labels) {
  const source = String(text || "").replace(/\u00a0/g, " ");
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:=]?\\s*(-?[0-9][0-9.,\\s]*)`, "i");
    const match = source.match(pattern);
    if (match?.[1]) {
      const value = parseSpanishNumber(match[1].trim());
      if (value !== null) return value;
    }
  }
  return null;
}

function extractFacts(text) {
  const facts = {};
  const definitions = [
    ["oliveKg", ["kg\\.?\\s*aceituna", "kilos?\\s*(?:de\\s*)?aceituna"]],
    ["oilKg", ["kg\\.?\\s*aceite", "kilos?\\s*(?:de\\s*)?aceite"]],
    ["yieldPct", ["%\\s*rdto", "rendimiento\\s*%?", "%\\s*rendimiento"]],
    ["acidity", ["acidez"]],
    ["grossLiquidation", ["bruto\\s*liquidaciones?", "importe\\s*bruto"]],
    ["taxBase", ["base\\s*imponible"]],
    ["netToReceive", ["l[ií]quido\\s*total\\s*a\\s*percibir", "total\\s*a\\s*percibir", "importe\\s*neto"]],
    ["oliveAveragePrice", ["precio\\s*medio\\s*aceituna"]],
    ["oilAveragePrice", ["precio\\s*medio\\s*aceite"]],
    ["vatPct", ["%\\s*iva", "iva\\s*%"]],
    ["withholdingPct", ["%\\s*retenci[oó]n", "retenci[oó]n\\s*%"]]
  ];

  for (const [key, labels] of definitions) {
    const value = firstLabeledNumber(text, labels);
    if (value !== null) facts[key] = value;
  }
  return facts;
}

function inferCampaign(date, explicitCampaign, entityCode, type) {
  if (explicitCampaign) return { campaign: explicitCampaign, source: "document", confidence: 1 };
  if (!date || entityCode !== "AGRI_SAN_JUAN" || !["LIQUIDATION", "LIQUIDATION_FACTURE", "TICKET_APPORT", "EXTRAIT_COMPTE"].includes(type)) {
    return { campaign: "", source: "none", confidence: 0 };
  }
  const [year, month] = date.split("-").map(Number);
  if (!year || !month) return { campaign: "", source: "none", confidence: 0 };
  const start = month >= 9 ? year : year - 1;
  return { campaign: `${start}-${start + 1}`, source: "date_inference", confidence: 0.55 };
}

function classifyCategory(entity, type, text) {
  if (entity.code === "AGRI_SAN_JUAN") return "cooperative";
  if (entity.code === "PELAEZ") return "pelaez";
  if (entity.code === "PAC_ADMINISTRATION" || type.startsWith("PAC_")) return "pac";
  if (type === "PLAN_PARCELLE") return "plans";
  if (["FACTURE", "DEVIS", "RECU"].includes(type)) return "factures";
  if (includesAny(text, ["casa", "maison", "alquiler", "location"])) return "casa";
  return "verifier";
}

function buildConfidence(reading, entity, type, date, number, facts, campaignInfo) {
  let score = 0;
  if (["lu", "lu_ocr"].includes(reading.status)) score += 0.30;
  if (entity.code !== "INCONNU") score += 0.20 * Math.max(0.5, entity.confidence || 0);
  if (type !== "NON_IDENTIFIE") score += 0.15;
  if (date) score += 0.12;
  if (number) score += 0.08;
  if (Object.keys(facts).length >= 1) score += 0.08;
  if (Object.keys(facts).length >= 3) score += 0.04;
  if (campaignInfo.source === "document") score += 0.03;
  return Math.min(1, Number(score.toFixed(2)));
}

function groupCounts(items, keyFn) {
  const result = {};
  for (const item of items) {
    const key = keyFn(item) || "INCONNU";
    result[key] = (result[key] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(result).sort((a, b) => b[1] - a[1]));
}

function detectMissingDocuments(analyses) {
  const requests = [];
  const byCampaign = new Map();

  for (const item of analyses.filter((x) => x.entity.code === "AGRI_SAN_JUAN" && x.campaign)) {
    if (!byCampaign.has(item.campaign)) byCampaign.set(item.campaign, []);
    byCampaign.get(item.campaign).push(item);
  }

  for (const [campaign, docs] of [...byCampaign.entries()].sort()) {
    const types = new Set(docs.map((d) => d.type));
    const hasLiquidation = types.has("LIQUIDATION") || types.has("LIQUIDATION_FACTURE");
    const hasAccountEvidence = types.has("EXTRAIT_COMPTE");
    const hasTicket = types.has("TICKET_APPORT");

    if ((hasAccountEvidence || hasTicket) && !hasLiquidation) {
      requests.push({
        id: `AGRI_SAN_JUAN__${campaign}__LIQUIDATION`,
        priority: "haute",
        certainty: "probable",
        documentWanted: `Liquidation(s) / facture(s) de la campagne ${campaign}`,
        campaign,
        askTo: "S.C.A. Agrícola San Juan",
        askToCode: "AGRI_SAN_JUAN",
        reason: "Des pièces de la campagne sont présentes mais aucune liquidation/facture correspondante n'a été retrouvée.",
        evidenceDocumentIds: docs.map((d) => d.documentId)
      });
    }
  }

  return requests;
}

function buildMarkdownReport(payload) {
  const s = payload.summary;
  const lines = [
    "# FINCA MARIA — Analyse documentaire V2",
    "",
    `Généré le ${payload.generatedAt}`,
    "",
    "## Vue d'ensemble",
    "",
    `- Documents analysés : **${s.analyzed}**`,
    `- Documents lisibles : **${s.readable}**`,
    `- Documents nécessitant encore une revue : **${s.needsReview}**`,
    `- Documents non identifiés : **${s.unknown}**`,
    `- OCR servis depuis le cache : **${s.cachedOcr}**`,
    `- Période détectée : **${s.earliestDate || "?"} → ${s.latestDate || "?"}**`,
    `- Pièces à demander détectées : **${payload.missingDocumentRequests.length}**`,
    "",
    "## Familles reconnues",
    ""
  ];

  for (const [key, count] of Object.entries(s.byFamily)) lines.push(`- ${key} : ${count}`);

  lines.push("", "## Campagnes détectées", "");
  for (const [key, count] of Object.entries(s.byCampaign)) lines.push(`- ${key} : ${count} document(s)`);

  lines.push("", "## Pièces à demander", "");
  if (!payload.missingDocumentRequests.length) {
    lines.push("- Aucune demande certaine/probable détectée avec les documents analysés à ce stade.");
  } else {
    for (const req of payload.missingDocumentRequests) {
      lines.push(`- **${req.documentWanted}** — à demander à **${req.askTo}** — ${req.reason}`);
    }
  }

  lines.push("", "## Principe de sécurité", "");
  lines.push("Cette analyse ne déplace, ne renomme et ne classe automatiquement aucun original. Les sorties sont des données de travail dérivées des preuves conservées dans le BAÚL.");
  return lines.join("\n") + "\n";
}

async function main() {
  const index = readIndex();
  let documents = [...index.documents]
    .sort((a, b) => String(a.receivedAt || "").localeCompare(String(b.receivedAt || "")));
  if (LIMIT) documents = documents.slice(0, LIMIT);

  const capabilities = {
    tesseract: await commandExists("tesseract"),
    pdftotext: await commandExists("pdftotext"),
    pdftoppm: await commandExists("pdftoppm")
  };

  console.log("=== FINCA MARIA — ANALYSE DE MASSE V2 ===");
  console.log("Documents sélectionnés :", documents.length, LIMIT ? `(limite ${LIMIT})` : "(tous)");
  console.log("OCR auto-orienté : Tesseract --psm 1");
  console.log("Cache OCR local :", CACHE_ROOT);
  console.log("Capacités :", capabilities);
  console.log("Aucun document ne sera déplacé, renommé ou classé.\n");

  const analyses = [];
  const errors = [];
  let current = 0;

  for (const document of documents) {
    current += 1;
    const label = document.originalName || document.storedName || document.id || "document";
    process.stdout.write(`[${current}/${documents.length}] ${label} ... `);

    try {
      const filePath = resolveDocumentFile(document);
      const reading = await readDocumentText(document, filePath, capabilities);
      const type = detectDocumentType(reading.text, document.originalName);
      const entity = detectEntity(reading.text, document.originalName);
      const date = detectDate(reading.text) || String(document.documentDate || "");
      const number = detectDocumentNumber(reading.text, type) || String(document.detectedDocumentNumber || "");
      const explicitCampaign = detectExplicitCampaign(reading.text);
      const facts = extractFacts(reading.text);
      const campaignInfo = inferCampaign(date, explicitCampaign, entity.code, type);
      const category = classifyCategory(entity, type, reading.text);
      const confidence = buildConfidence(reading, entity, type, date, number, facts, campaignInfo);
      const family = `${entity.code}__${type}`;
      const needsReview = confidence < 0.72 || category === "verifier" || !["lu", "lu_ocr"].includes(reading.status);

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
          status: reading.status,
          cached: Boolean(reading.cached),
          textExcerpt: String(reading.text || "").slice(0, 1400)
        },
        entity,
        type,
        family,
        date,
        number,
        campaign: campaignInfo.campaign,
        campaignInference: campaignInfo,
        suggestedCategory: category,
        confidence,
        facts,
        needsReview
      });

      console.log(`${reading.cached ? "CACHE | " : ""}${reading.status} | ${entity.code} | ${type} | ${date || "date ?"} | ${campaignInfo.campaign || "campagne ?"}`);
    } catch (error) {
      errors.push({ documentId: document.id, originalName: document.originalName, error: error.message || "Erreur inconnue" });
      analyses.push({
        documentId: document.id,
        originalName: document.originalName,
        storedName: document.storedName,
        statusInBaul: document.status,
        entity: { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0 },
        type: "NON_IDENTIFIE",
        family: "INCONNU__NON_IDENTIFIE",
        date: "",
        number: "",
        campaign: "",
        suggestedCategory: "verifier",
        confidence: 0,
        facts: {},
        needsReview: true,
        error: error.message || "Erreur inconnue"
      });
      console.log("ERREUR");
    }
  }

  const dates = analyses.map((item) => item.date).filter(Boolean).sort();
  const readable = analyses.filter((item) => ["lu", "lu_ocr"].includes(item.reading?.status)).length;
  const unknowns = analyses.filter((item) => item.entity.code === "INCONNU" || item.type === "NON_IDENTIFIE");
  const needsReview = analyses.filter((item) => item.needsReview).length;
  const cachedOcr = analyses.filter((item) => item.reading?.cached).length;
  const requests = detectMissingDocuments(analyses);

  const payload = {
    version: 2,
    generatedAt: new Date().toISOString(),
    project: "FINCA MARIA",
    purpose: "Reconstituer l'histoire de l'exploitation, comparer les campagnes, extraire les faits et préparer les demandes de pièces manquantes sans altérer les preuves originales.",
    ocrVersion: OCR_VERSION,
    capabilities,
    selection: { totalInIndex: index.documents.length, analyzedThisRun: analyses.length, limit: LIMIT || null },
    summary: {
      analyzed: analyses.length,
      readable,
      needsReview,
      unknown: unknowns.length,
      cachedOcr,
      errors: errors.length,
      earliestDate: dates[0] || "",
      latestDate: dates.at(-1) || "",
      byFamily: groupCounts(analyses, (item) => item.family),
      byEntity: groupCounts(analyses, (item) => item.entity.code),
      byType: groupCounts(analyses, (item) => item.type),
      byCampaign: groupCounts(analyses.filter((item) => item.campaign), (item) => item.campaign)
    },
    documents: analyses,
    missingDocumentRequests: requests,
    errors
  };

  fs.writeFileSync(ANALYSIS_FILE, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(REQUESTS_FILE, JSON.stringify({ generatedAt: payload.generatedAt, requests }, null, 2), "utf-8");
  fs.writeFileSync(UNKNOWN_FILE, JSON.stringify({
    generatedAt: payload.generatedAt,
    unknowns: unknowns.map((item) => ({
      documentId: item.documentId,
      originalName: item.originalName,
      entity: item.entity,
      type: item.type,
      date: item.date,
      campaign: item.campaign,
      confidence: item.confidence,
      textExcerpt: item.reading?.textExcerpt || ""
    }))
  }, null, 2), "utf-8");
  fs.writeFileSync(REPORT_FILE, buildMarkdownReport(payload), "utf-8");

  console.log("\n=== ANALYSE V2 TERMINÉE ===");
  console.log("Documents analysés :", analyses.length);
  console.log("Documents lisibles :", readable);
  console.log("Documents inconnus :", unknowns.length);
  console.log("Documents à revoir :", needsReview);
  console.log("OCR récupérés du cache :", cachedOcr);
  console.log("Pièces à demander détectées :", requests.length);
  console.log("Période détectée :", `${payload.summary.earliestDate || "?"} -> ${payload.summary.latestDate || "?"}`);
  console.log("Analyse :", ANALYSIS_FILE);
  console.log("Demandes :", REQUESTS_FILE);
  console.log("Inconnus :", UNKNOWN_FILE);
  console.log("Rapport :", REPORT_FILE);
  console.log("\nAucun document n'a été déplacé, renommé ni classé automatiquement.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
