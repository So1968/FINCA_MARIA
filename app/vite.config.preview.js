import { defineConfig, mergeConfig } from "vite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import baseConfig from "./vite.config.js";
import { readBaulIndex } from "./lib/baul-index.mjs";

const BAUL_ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INDEX_FILE = path.join(BAUL_ROOT, "_INDEX_BAUL.json");
const INBOX_ROOT = path.join(BAUL_ROOT, "00_A_CLASSER", "00_RECEPTION_A_VALIDER");
const ORIGINALS_ROOT = path.join(BAUL_ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB");
const VALIDATED_ROOT = path.join(BAUL_ROOT, "01_CLASSES_VALIDES");

const BAUL_CATEGORIES = {
  factures: "01_FACTURES",
  cooperative: "02_AGRI_SAN_JUAN",
  pac: "03_PAC_SUBVENTIONS",
  pelaez: "04_PELAEZ",
  terrain: "05_PHOTOS_VIDEOS_TERRAIN",
  casa: "06_CASA_MAISON_LOCATION",
  reunions: "07_REUNIONS_DECISIONS",
  messages: "08_WHATSAPP_MAILS_CAPTURE",
  plans: "09_CADASTRE_SIGPAC_PLANS",
  verifier: "10_A_VERIFIER_URGENT"
};

const CATEGORY_CODES = {
  factures: "FACTURE",
  cooperative: "AGRI_SAN_JUAN",
  pac: "PAC",
  pelaez: "PELAEZ",
  terrain: "FINCA",
  casa: "CASA",
  reunions: "REUNION",
  messages: "MESSAGE",
  plans: "PLAN",
  verifier: "A_VERIFIER"
};

const MIME_BY_EXTENSION = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/plain; charset=utf-8",
  ".csv": "text/csv; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".log": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogv": "video/ogg",
  ".m4v": "video/mp4",
  ".mov": "video/quicktime"
};

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readJsonBody(request, maxBytes = 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error("Données de validation trop volumineuses."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });

    request.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf-8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error("Données de validation illisibles."));
      }
    });

    request.on("error", reject);
  });
}

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

function isInsideBaul(candidatePath) {
  const candidate = path.resolve(candidatePath);
  const root = path.resolve(BAUL_ROOT);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function toPortablePath(absolutePath) {
  return path.relative(BAUL_ROOT, absolutePath).split(path.sep).join("/");
}

function fromPortablePath(relativePath) {
  const normalized = String(relativePath || "").split("/").join(path.sep);
  const candidate = path.resolve(BAUL_ROOT, normalized);
  if (!isInsideBaul(candidate)) throw new Error("Chemin BAÚL invalide.");
  return candidate;
}

function readIndex() {
  return readBaulIndex(INDEX_FILE);
}

function readIndexDocuments() {
  return readIndex().documents;
}

function writeIndex(index) {
  const temporaryFile = `${INDEX_FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(index, null, 2), "utf-8");
  fs.renameSync(temporaryFile, INDEX_FILE);
}

function resolveDocumentFile(document) {
  const candidates = [];

  if (document.currentRelativePath) candidates.push(fromPortablePath(document.currentRelativePath));
  if (document.originalRelativePath) candidates.push(fromPortablePath(document.originalRelativePath));
  if (document.storedName) candidates.push(path.join(ORIGINALS_ROOT, document.storedName));

  const existingPath = candidates.find((candidate) => isInsideBaul(candidate) && fs.existsSync(candidate));
  if (!existingPath) throw new Error("Le fichier demandé est introuvable dans le BAÚL.");
  return existingPath;
}

function resolveOriginalFile(document) {
  if (document.originalRelativePath) {
    const candidate = fromPortablePath(document.originalRelativePath);
    if (fs.existsSync(candidate)) return candidate;
  }

  const fallback = path.join(ORIGINALS_ROOT, document.storedName || "");
  if (isInsideBaul(fallback) && fs.existsSync(fallback)) return fallback;
  return null;
}

function previewMimeType(document, filePath) {
  const declared = String(document.mimeType || "").trim();
  if (declared && declared !== "application/octet-stream") return declared;
  return MIME_BY_EXTENSION[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

function sanitizePart(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function sanitizeStem(value) {
  const parts = String(value || "document")
    .split(/__+/)
    .map(sanitizePart)
    .filter(Boolean);
  return (parts.join("__") || "document").slice(0, 160);
}

function logicalFilename(document, requestedName) {
  const originalExtension = path.extname(String(document.originalName || document.storedName || ""));
  const requestedBase = path.basename(String(requestedName || ""));
  const requestedExtension = path.extname(requestedBase);
  const requestedStem = requestedExtension
    ? requestedBase.slice(0, -requestedExtension.length)
    : requestedBase;

  return `${sanitizeStem(requestedStem)}${originalExtension}`;
}

function uniqueTargetPath(folder, fileName) {
  const extension = path.extname(fileName);
  const stem = extension ? fileName.slice(0, -extension.length) : fileName;
  let candidate = path.join(folder, fileName);
  let counter = 2;

  while (fs.existsSync(candidate)) {
    candidate = path.join(folder, `${stem}__${String(counter).padStart(2, "0")}${extension}`);
    counter += 1;
  }

  return candidate;
}

function copyAsHardLinkOrFile(sourcePath, targetPath) {
  try {
    fs.linkSync(sourcePath, targetPath);
  } catch {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function statusSummary(index) {
  const documents = Array.isArray(index.documents) ? index.documents : [];
  return {
    counts: {
      total: documents.length,
      pending: documents.filter((document) => document.status === "À valider").length,
      validated: documents.filter((document) => document.status === "Classé").length
    }
  };
}

function statusPayload(index) {
  const documents = [...(Array.isArray(index.documents) ? index.documents : [])]
    .sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")));
  return {
    ok: true,
    root: BAUL_ROOT,
    inbox: INBOX_ROOT,
    duplicateProtection: true,
    counts: {
      total: documents.length,
      pending: documents.filter((document) => document.status === "À valider").length,
      validated: documents.filter((document) => document.status === "Classé").length
    },
    pending: documents.filter((document) => document.status === "À valider").slice(0, 300),
    recent: documents.slice(0, 10)
  };
}

function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    execFile(command, args, { encoding: "utf-8", maxBuffer: 8 * 1024 * 1024 }, (error, stdout) => {
      if (error) {
        reject(error);
        return;
      }
      resolve(String(stdout || ""));
    });
  });
}

async function readImageWithTesseract(filePath) {
  try {
    const text = (await runCommand("tesseract", [
      filePath,
      "stdout",
      "-l",
      "spa+fra+eng",
      "--psm",
      "3"
    ])).trim();

    return text.length >= 12
      ? { text: text.slice(0, 200000), method: "tesseract_spa_fra_eng", status: "lu_ocr" }
      : { text: text.slice(0, 200000), method: "tesseract_spa_fra_eng", status: "ocr_peu_lisible" };
  } catch {
    return { text: "", method: "tesseract", status: "ocr_indisponible" };
  }
}

async function readDocumentText(document, filePath) {
  const mime = String(document.mimeType || previewMimeType(document, filePath)).toLowerCase();
  const extension = path.extname(filePath).toLowerCase();

  if (mime === "application/pdf" || extension === ".pdf") {
    try {
      const text = (await runCommand("pdftotext", ["-layout", "-nopgbrk", filePath, "-"])).trim();
      return text.length >= 20
        ? { text: text.slice(0, 200000), method: "pdftotext", status: "lu" }
        : { text: "", method: "pdftotext", status: "ocr_requis" };
    } catch {
      return { text: "", method: "pdftotext", status: "lecteur_pdf_indisponible" };
    }
  }

  if (mime.startsWith("text/") || [".txt", ".csv", ".json", ".md", ".log"].includes(extension)) {
    try {
      return {
        text: fs.readFileSync(filePath, "utf-8").slice(0, 200000),
        method: "texte_local",
        status: "lu"
      };
    } catch {
      return { text: "", method: "texte_local", status: "lecture_impossible" };
    }
  }

  if (mime.startsWith("image/")) {
    return readImageWithTesseract(filePath);
  }

  if (mime.startsWith("video/")) {
    return { text: "", method: "analyse_visuelle", status: "analyse_visuelle_requise" };
  }

  return { text: "", method: "aucun", status: "format_non_lu" };
}

function includesAny(text, words) {
  const normalized = normalizeText(text);
  return words.some((word) => normalized.includes(normalizeText(word)));
}

function detectDocumentType(text, name) {
  const source = `${text || ""}\n${name || ""}`;
  const hasInvoice = includesAny(source, ["factura", "facture", "invoice", "nº factura", "num factura"]);
  const hasLiquidation = includesAny(source, ["liquidacion", "liquidación", "reparto"]);

  if (hasInvoice && hasLiquidation) return "LIQUIDATION_FACTURE";
  if (includesAny(source, ["ticket de entrega", "ticket apport", "albaran", "albarán"])) return "TICKET_APPORT";
  if (hasInvoice) return "FACTURE";
  if (hasLiquidation) return "LIQUIDATION";
  if (includesAny(source, ["solicitud unica", "solicitud única"])) return "SOLICITUD_UNICA";
  if (includesAny(source, ["presupuesto", "devis"])) return "DEVIS";
  if (includesAny(source, ["recibo", "reçu", "receipt"])) return "RECU";
  return "";
}

function detectDocumentNumber(text, documentType) {
  const source = String(text || "").replace(/\s+/g, " ");
  const patterns = [
    /liquidaci[oó]n\s*\/\s*factura\s*(?:n(?:[º°o.]|um(?:ero)?)?\s*)?[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /(?:n(?:[º°o.]|um(?:ero)?)?\s*)?(?:de\s+)?factura\s*[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /factura\s*(?:n(?:[º°o.]|um(?:ero)?)?\s*)?[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /liquidaci[oó]n\s*(?:n(?:[º°o.]|um(?:ero)?)?\s*)?[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i,
    /albar[aá]n\s*(?:n(?:[º°o.]|um(?:ero)?)?\s*)?[:#-]?\s*([A-Z0-9][A-Z0-9./-]{1,20})/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      const token = normalizeToken(match[1]).slice(0, 28);
      if (token && !["DE", "DEL", "FECHA", "EMISION", "FACTURA", "LIQUIDACION"].includes(token)) return token;
    }
  }

  if (documentType && includesAny(source, ["nº", "n°", "num", "numero", "número"])) {
    const loose = source.match(/(?:n[º°o.]?|n[uú]m(?:ero)?\.?)[\s:#-]*([0-9]{2,12})/i);
    if (loose?.[1]) return loose[1];
  }

  return "";
}

function detectDate(text) {
  const source = String(text || "");
  const labelled = source.match(/(?:fecha(?:\s+de\s+emisi[oó]n)?|date)\s*[:.-]?\s*(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/i);
  if (labelled) return `${labelled[3]}-${String(labelled[2]).padStart(2, "0")}-${String(labelled[1]).padStart(2, "0")}`;

  const ymd = source.match(/\b((?:19|20)\d{2})[-/.](0?[1-9]|1[0-2])[-/.](0?[1-9]|[12]\d|3[01])\b/);
  if (ymd) return `${ymd[1]}-${String(ymd[2]).padStart(2, "0")}-${String(ymd[3]).padStart(2, "0")}`;

  const dmy = source.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2, "0")}-${String(dmy[1]).padStart(2, "0")}`;
  return "";
}

function classifyDocument(document, text) {
  const name = String(document.originalName || "");
  const content = String(text || "");
  const combined = `${content}\n${name}`;
  const hasReadableContent = content.trim().length >= 20;

  const coop = includesAny(combined, [
    "agri san juan", "agricola san juan", "agrícola san juan", "s.c.a. agricola san juan", "s.c.a. agrícola san juan",
    "cooperativa", "coop san juan", "san juan", "s.c.a. san juan", "s.c.a san juan",
    "almazara", "molino", "rendimiento", "liquidacion", "liquidación", "reparto", "albaran", "albarán"
  ]);
  const invoice = includesAny(combined, ["factura", "facture", "invoice", "nº factura", "num factura"]);

  if (coop && invoice) {
    return {
      category: "cooperative",
      confidence: hasReadableContent ? 0.99 : 0.9,
      reason: hasReadableContent ? "Contenu lu : facture Agri San Juan" : "Nom évocateur : facture / Agri San Juan"
    };
  }

  if (coop) {
    return {
      category: "cooperative",
      confidence: hasReadableContent ? 0.97 : 0.86,
      reason: hasReadableContent ? "Contenu lu : document Agri San Juan" : "Nom évocateur : Agri San Juan"
    };
  }

  const rules = [
    { category: "pac", confidence: 0.95, words: ["solicitud unica", "solicitud única", "pac", "subvencion", "subvención", "eco-regimen", "ecoregimen"] },
    { category: "pelaez", confidence: 0.94, words: ["pelaez", "peláez", "gestoria", "gestoría", "contabilidad"] },
    { category: "plans", confidence: 0.94, words: ["catastro", "cadastral", "sigpac", "parcela", "plano"] },
    { category: "casa", confidence: 0.91, words: ["casa", "maison", "location", "inventario", "inventaire", "diagnostic maison"] },
    { category: "reunions", confidence: 0.91, words: ["reunion", "réunion", "acta", "decision", "décision", "compte rendu"] },
    { category: "messages", confidence: 0.9, words: ["whatsapp", "capture", "screenshot", "courriel", "email", "message"] },
    { category: "factures", confidence: 0.9, words: ["factura", "facture", "invoice", "presupuesto", "devis", "recibo", "reçu"] },
    { category: "terrain", confidence: 0.88, words: ["terrain", "finca", "olivier", "olivar", "cosecha", "récolte", "debroussaillage", "débroussaillage", "traitement"] }
  ];

  for (const rule of rules) {
    const match = rule.words.find((word) => includesAny(combined, [word]));
    if (match) {
      return {
        category: rule.category,
        confidence: hasReadableContent ? rule.confidence : Math.min(rule.confidence, 0.82),
        reason: `${hasReadableContent ? "Contenu lu" : "Nom analysé"} : ${match}`
      };
    }
  }

  return {
    category: "verifier",
    confidence: 0.2,
    reason: "Contenu non identifié : aucun classement automatique"
  };
}

function originalStem(document) {
  const name = path.basename(String(document.originalName || "document"), path.extname(String(document.originalName || "")));
  const token = normalizeToken(name);
  const generic = /^(IMG|DSC|PXL|VID|SCAN|SCANNED|PHOTO|DOCUMENT|CAMSCANNER)(_?[0-9]+)*$/;
  return !token || generic.test(token) ? "" : token.slice(0, 70);
}

function proposeLogicalName(document, category, documentType, documentDate, documentNumber) {
  const extension = path.extname(String(document.originalName || document.storedName || "")).toLowerCase();
  const date = documentDate || "DATE_A_VERIFIER";
  const code = CATEGORY_CODES[category] || "A_VERIFIER";
  const type = normalizeToken(documentType);
  const number = normalizeToken(documentNumber);
  const stem = originalStem(document);
  const parts = [date, code];

  if (type) parts.push(type);
  if (number) parts.push(number);
  if (!type && !number && stem) parts.push(stem);
  if (!type && !number && !stem) parts.push("DOCUMENT_A_IDENTIFIER");

  return `${parts.join("__")}${extension}`;
}

function shouldReanalyze(document) {
  if (!document.contentAnalyzedAt) return true;
  const mime = String(document.mimeType || "").toLowerCase();
  const name = String(document.originalName || "").toLowerCase();
  const isImage = mime.startsWith("image/") || /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(name);
  return isImage && ["ocr_requis", "ocr_indisponible"].includes(String(document.contentReadStatus || ""));
}

async function analyzePending(index) {
  const pending = [...index.documents]
    .filter((document) => document.status === "À valider")
    .sort((a, b) => String(b.receivedAt || "").localeCompare(String(a.receivedAt || "")));

  let changed = false;

  for (const document of pending) {
    if (!document.contentAnalyzedAt) {
      document.suggestedCategory = "verifier";
      document.confidence = 0.2;
      document.reason = "Lecture du contenu nécessaire avant classement";
      document.logicalName = proposeLogicalName(document, "verifier", "", "", "");
      changed = true;
    }
  }

  const toAnalyze = pending.filter(shouldReanalyze).slice(0, 20);

  for (const document of toAnalyze) {
    try {
      const filePath = resolveDocumentFile(document);
      const reading = await readDocumentText(document, filePath);
      const detection = classifyDocument(document, reading.text);
      const documentType = detectDocumentType(reading.text, document.originalName);
      const documentDate = detectDate(reading.text);
      const documentNumber = detectDocumentNumber(reading.text, documentType);

      document.suggestedCategory = detection.category;
      document.confidence = detection.confidence;
      if (reading.status === "ocr_requis") {
        document.reason = "PDF scanné : OCR PDF à ajouter avant classement fiable";
      } else if (reading.status === "ocr_indisponible") {
        document.reason = "OCR Tesseract indisponible : validation manuelle nécessaire";
      } else if (reading.status === "ocr_peu_lisible") {
        document.reason = "OCR effectué mais texte peu lisible : contrôle humain nécessaire";
      } else {
        document.reason = detection.reason;
      }
      document.detectedDocumentType = documentType;
      document.detectedDocumentNumber = documentNumber;
      document.documentDate = documentDate;
      document.contentReadMethod = reading.method;
      document.contentReadStatus = reading.status;
      document.contentAnalyzedAt = new Date().toISOString();
      document.logicalName = proposeLogicalName(document, detection.category, documentType, documentDate, documentNumber);
      changed = true;
    } catch {
      document.suggestedCategory = "verifier";
      document.confidence = 0.1;
      document.reason = "Lecture locale impossible : validation manuelle nécessaire";
      document.contentReadStatus = "erreur";
      document.contentAnalyzedAt = new Date().toISOString();
      document.logicalName = proposeLogicalName(document, "verifier", "", "", "");
      changed = true;
    }
  }

  if (changed) writeIndex(index);
  return index;
}

function streamDocument(request, response, document) {
  const filePath = resolveDocumentFile(document);
  const stats = fs.statSync(filePath);
  const total = stats.size;
  const mimeType = previewMimeType(document, filePath);

  response.setHeader("Content-Type", mimeType);
  response.setHeader("Content-Disposition", "inline");
  response.setHeader("Cache-Control", "private, no-store");
  response.setHeader("Accept-Ranges", "bytes");
  response.setHeader("X-Content-Type-Options", "nosniff");

  const range = String(request.headers.range || "");
  const match = /^bytes=(\d*)-(\d*)$/.exec(range);

  if (match && total > 0) {
    const requestedStart = match[1] ? Number(match[1]) : 0;
    const requestedEnd = match[2] ? Number(match[2]) : total - 1;
    const start = Math.max(0, Math.min(requestedStart, total - 1));
    const end = Math.max(start, Math.min(requestedEnd, total - 1));

    response.statusCode = 206;
    response.setHeader("Content-Range", `bytes ${start}-${end}/${total}`);
    response.setHeader("Content-Length", end - start + 1);

    if (request.method === "HEAD") {
      response.end();
      return;
    }

    fs.createReadStream(filePath, { start, end }).pipe(response);
    return;
  }

  response.statusCode = 200;
  response.setHeader("Content-Length", total);
  if (request.method === "HEAD") {
    response.end();
    return;
  }
  fs.createReadStream(filePath).pipe(response);
}

function baulPreviewPlugin() {
  return {
    name: "cortijo-baul-preview-logical-naming-and-reading",
    enforce: "pre",
    configureServer(server) {
      server.middlewares.use("/api/baul/status", async (request, response, next) => {
        if (request.method !== "GET") {
          next();
          return;
        }

        try {
          const index = await analyzePending(readIndex());
          sendJson(response, 200, statusPayload(index));
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Lecture du BAÚL impossible." });
        }
      });

      server.middlewares.use("/api/baul/preview", (request, response) => {
        if (request.method !== "GET" && request.method !== "HEAD") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }

        try {
          const url = new URL(request.url || "/", "http://localhost");
          const id = String(url.searchParams.get("id") || "");
          if (!id) {
            sendJson(response, 400, { ok: false, error: "Identifiant de document manquant." });
            return;
          }

          const document = readIndexDocuments().find((item) => item.id === id);
          if (!document) {
            sendJson(response, 404, { ok: false, error: "Document introuvable dans l’index du BAÚL." });
            return;
          }

          streamDocument(request, response, document);
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Aperçu impossible." });
        }
      });

      server.middlewares.use("/api/baul/confirm", async (request, response, next) => {
        if (request.method !== "POST") {
          next();
          return;
        }

        try {
          const body = await readJsonBody(request);
          const category = BAUL_CATEGORIES[body.category] ? body.category : "verifier";
          const index = readIndex();
          const document = index.documents.find((item) => item.id === body.id);

          if (!document) {
            sendJson(response, 404, { ok: false, error: "Document introuvable dans l’index du BAÚL." });
            return;
          }

          if (document.status !== "À valider") {
            sendJson(response, 409, { ok: false, error: "Ce document a déjà été classé." });
            return;
          }

          const sourcePath = resolveDocumentFile(document);
          const originalPath = resolveOriginalFile(document);
          const targetFolder = path.join(VALIDATED_ROOT, BAUL_CATEGORIES[category]);
          fs.mkdirSync(targetFolder, { recursive: true });

          const requestedLogicalName = String(body.logicalName || document.logicalName || document.originalName || document.storedName || "document");
          const proposedFileName = logicalFilename(document, requestedLogicalName);
          const targetPath = uniqueTargetPath(targetFolder, proposedFileName);
          const finalFileName = path.basename(targetPath);

          if (sourcePath !== originalPath && fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, targetPath);
          } else if (originalPath && fs.existsSync(originalPath)) {
            copyAsHardLinkOrFile(originalPath, targetPath);
          } else {
            throw new Error("L’original du document est introuvable.");
          }

          document.status = "Classé";
          document.category = category;
          document.logicalName = finalFileName;
          document.validatedAt = new Date().toISOString();
          document.renamedAt = document.validatedAt;
          document.currentRelativePath = toPortablePath(targetPath);
          writeIndex(index);

          sendJson(response, 200, {
            ok: true,
            document,
            status: statusSummary(index),
            naming: {
              originalName: document.originalName,
              logicalName: finalFileName,
              originalPreserved: true
            }
          });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Classement et renommage impossibles." });
        }
      });
    }
  };
}

export default defineConfig(mergeConfig(baseConfig, {
  plugins: [baulPreviewPlugin()]
}));
