import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { readBaulIndex } from "./lib/baul-index.mjs";

const INDEX_VERSION = 3;

const BAUL_ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INBOX_ROOT = path.join(BAUL_ROOT, "00_A_CLASSER", "00_RECEPTION_A_VALIDER");
const VALIDATED_ROOT = path.join(BAUL_ROOT, "01_CLASSES_VALIDES");
const EXPORT_ROOT = path.join(BAUL_ROOT, "02_EXPORTS_PREPARES");
const ORIGINALS_ROOT = path.join(BAUL_ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB");
const INDEX_FILE = path.join(BAUL_ROOT, "_INDEX_BAUL.json");
const LEGACY_AGRI_FOLDER = path.join(VALIDATED_ROOT, "02_COOPERATIVE_SAN_JUAN");
const AGRI_FOLDER = path.join(VALIDATED_ROOT, "02_AGRI_SAN_JUAN");

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

function migrationTarget(folder, name) {
  const extension = path.extname(name);
  const stem = extension ? name.slice(0, -extension.length) : name;
  let candidate = path.join(folder, name);
  let counter = 2;
  while (fs.existsSync(candidate)) {
    candidate = path.join(folder, `${stem}__ANCIEN_${String(counter).padStart(2, "0")}${extension}`);
    counter += 1;
  }
  return candidate;
}

function migrateAgriSanJuanStorage() {
  // A damaged index must not trigger a folder migration or overwrite.
  try { readBaulIndex(INDEX_FILE); } catch { return; }
  if (fs.existsSync(LEGACY_AGRI_FOLDER)) {
    if (!fs.existsSync(AGRI_FOLDER)) {
      fs.renameSync(LEGACY_AGRI_FOLDER, AGRI_FOLDER);
    } else {
      for (const entry of fs.readdirSync(LEGACY_AGRI_FOLDER, { withFileTypes: true })) {
        const source = path.join(LEGACY_AGRI_FOLDER, entry.name);
        const target = migrationTarget(AGRI_FOLDER, entry.name);
        fs.renameSync(source, target);
      }
      fs.rmSync(LEGACY_AGRI_FOLDER, { recursive: true, force: true });
    }
  }

  if (fs.existsSync(INDEX_FILE)) {
    try {
      const index = JSON.parse(fs.readFileSync(INDEX_FILE, "utf-8"));
      let changed = false;
      const documents = Array.isArray(index.documents) ? index.documents : [];
      for (const document of documents) {
        if (typeof document.currentRelativePath === "string" && document.currentRelativePath.includes("01_CLASSES_VALIDES/02_COOPERATIVE_SAN_JUAN/")) {
          document.currentRelativePath = document.currentRelativePath.replace(
            "01_CLASSES_VALIDES/02_COOPERATIVE_SAN_JUAN/",
            "01_CLASSES_VALIDES/02_AGRI_SAN_JUAN/"
          );
          changed = true;
        }
      }
      if (changed) fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2), "utf-8");
    } catch {
      // Si un ancien index est momentanément illisible, la migration sera retentée au prochain démarrage.
    }
  }
}

function ensureBaulTree() {
  [BAUL_ROOT, INBOX_ROOT, VALIDATED_ROOT, EXPORT_ROOT, ORIGINALS_ROOT].forEach((folder) => {
    fs.mkdirSync(folder, { recursive: true });
  });

  migrateAgriSanJuanStorage();

  Object.values(BAUL_CATEGORIES).forEach((folderName) => {
    fs.mkdirSync(path.join(VALIDATED_ROOT, folderName), { recursive: true });
  });

  if (!fs.existsSync(INDEX_FILE)) {
    fs.writeFileSync(
      INDEX_FILE,
      JSON.stringify({ version: INDEX_VERSION, documents: [] }, null, 2),
      "utf-8"
    );
  }
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function sanitizeFilename(name) {
  const cleaned = String(name || "document")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return cleaned || "document";
}

function uniquePrefix() {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "");
  return `${stamp}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashBuffer(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function hashFilePath(filePath) {
  return hashBuffer(fs.readFileSync(filePath));
}

function toPortablePath(absolutePath) {
  return path.relative(BAUL_ROOT, absolutePath).split(path.sep).join("/");
}

function fromPortablePath(relativePath) {
  const normalized = String(relativePath || "").split("/").join(path.sep);
  const candidate = path.resolve(BAUL_ROOT, normalized);
  const root = path.resolve(BAUL_ROOT);

  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error("Chemin BAÚL invalide.");
  }

  return candidate;
}

function isInsideBaul(candidatePath) {
  if (!candidatePath || !path.isAbsolute(candidatePath)) return false;
  const candidate = path.resolve(candidatePath);
  const root = path.resolve(BAUL_ROOT);
  return candidate === root || candidate.startsWith(`${root}${path.sep}`);
}

function defaultCurrentPath(document) {
  if (document.status === "Classé" && BAUL_CATEGORIES[document.category]) {
    return path.join(VALIDATED_ROOT, BAUL_CATEGORIES[document.category], document.storedName);
  }
  return path.join(INBOX_ROOT, document.storedName);
}

function documentOriginalPath(document) {
  if (document.originalRelativePath) {
    return fromPortablePath(document.originalRelativePath);
  }
  return path.join(ORIGINALS_ROOT, document.storedName);
}

function normalizeIndex(index) {
  let changed = index.version !== INDEX_VERSION;
  const documents = Array.isArray(index.documents) ? index.documents.map((document) => {
    const normalized = { ...document };

    if (!normalized.originalRelativePath) {
      const legacyOriginal = isInsideBaul(normalized.originalPath) && fs.existsSync(normalized.originalPath)
        ? normalized.originalPath
        : path.join(ORIGINALS_ROOT, normalized.storedName);
      normalized.originalRelativePath = toPortablePath(legacyOriginal);
      changed = true;
    }

    if (!normalized.currentRelativePath) {
      const legacyCurrent = isInsideBaul(normalized.currentPath) && fs.existsSync(normalized.currentPath)
        ? normalized.currentPath
        : defaultCurrentPath(normalized);
      normalized.currentRelativePath = toPortablePath(legacyCurrent);
      changed = true;
    }

    if ("originalPath" in normalized || "currentPath" in normalized) {
      delete normalized.originalPath;
      delete normalized.currentPath;
      changed = true;
    }

    if (!normalized.sha256) {
      const candidates = [
        normalized.originalRelativePath ? fromPortablePath(normalized.originalRelativePath) : null,
        normalized.currentRelativePath ? fromPortablePath(normalized.currentRelativePath) : null
      ].filter(Boolean);

      const existingPath = candidates.find((candidate) => fs.existsSync(candidate));
      if (existingPath) {
        try {
          normalized.sha256 = hashFilePath(existingPath);
          changed = true;
        } catch {
          // Un ancien fichier inaccessible reste sans empreinte jusqu'à ce qu'il redevienne lisible.
        }
      }
    }

    return normalized;
  }) : [];

  return {
    changed,
    index: {
      version: INDEX_VERSION,
      documents
    }
  };
}

function readIndex() {
  ensureBaulTree();
  const parsed = readBaulIndex(INDEX_FILE);
  const normalized = normalizeIndex(parsed);
  if (normalized.changed) writeIndex(normalized.index);
  return normalized.index;
}

function writeIndex(index) {
  const temporaryFile = `${INDEX_FILE}.tmp`;
  fs.writeFileSync(
    temporaryFile,
    JSON.stringify({ ...index, version: INDEX_VERSION }, null, 2),
    "utf-8"
  );
  fs.renameSync(temporaryFile, INDEX_FILE);
}

function findDuplicateByHash(index, sha256) {
  if (!sha256) return null;
  return index.documents.find((document) => document.sha256 === sha256) || null;
}

function duplicateSummary(document) {
  if (!document) return null;
  return {
    id: document.id,
    originalName: document.originalName,
    status: document.status,
    category: document.category || document.suggestedCategory || "verifier",
    receivedAt: document.receivedAt,
    sha256: document.sha256
  };
}

function detectCategory(name, mimeType) {
  const text = normalizeText(name);
  const mime = normalizeText(mimeType);
  const rules = [
    { category: "cooperative", confidence: 0.96, words: ["agri san juan", "agricola san juan", "agrícola san juan", "san juan", "cooperativa", "cooperative", "molino", "albaran", "liquidacion", "reparto", "rendimiento", "ticket_apport", "ticket apport"] },
    { category: "pac", confidence: 0.95, words: ["solicitud unica", "pac", "subvencion", "ayuda", "eco-regimen", "ecoregimen", "droits pac"] },
    { category: "pelaez", confidence: 0.94, words: ["pelaez", "gestor", "gestoria", "comptable", "contabilidad"] },
    { category: "plans", confidence: 0.94, words: ["catastro", "cadastral", "sigpac", "parcela", "parcelacion", "plano", "plan finca"] },
    { category: "casa", confidence: 0.91, words: ["casa", "maison", "location", "inventaire", "inventario", "travaux maison", "devis maison", "diagnostic maison"] },
    { category: "reunions", confidence: 0.91, words: ["reunion", "acta", "decision", "compte rendu", "proces verbal", "pv reunion"] },
    { category: "messages", confidence: 0.9, words: ["whatsapp", "capture", "screenshot", "courriel", "email", "mail", "message"] },
    { category: "factures", confidence: 0.88, words: ["facture", "factura", "invoice", "devis", "presupuesto", "recu", "receipt"] },
    { category: "terrain", confidence: 0.86, words: ["terrain", "finca", "olivier", "olivar", "oliva", "recolte", "cosecha", "debroussaillage", "traitement"] }
  ];

  for (const rule of rules) {
    const matchedWord = rule.words.find((word) => text.includes(normalizeText(word)));
    if (matchedWord) {
      return {
        category: rule.category,
        confidence: rule.confidence,
        reason: `Mot repéré : ${matchedWord}`
      };
    }
  }

  if (mime.startsWith("image/") || mime.startsWith("video/")) {
    return {
      category: "terrain",
      confidence: 0.58,
      reason: "Photo ou vidéo : classement terrain proposé, à confirmer"
    };
  }

  return {
    category: "verifier",
    confidence: 0.35,
    reason: "Type non reconnu : validation nécessaire"
  };
}

function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
}

function readJsonBody(request, maxBytes = 220 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    let received = 0;
    const chunks = [];

    request.on("data", (chunk) => {
      received += chunk.length;
      if (received > maxBytes) {
        reject(new Error("Fichier trop lourd pour l’import direct. Utilise le bouton Ouvrir le dossier BAÚL."));
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
        reject(new Error("Données d’import illisibles."));
      }
    });

    request.on("error", reject);
  });
}

function openFolder(folderPath) {
  const platform = process.platform;
  const command = platform === "win32" ? "explorer.exe" : platform === "darwin" ? "open" : "xdg-open";
  execFile(command, [folderPath], { detached: true, stdio: "ignore" }).unref();
}

function copyAsHardLinkOrFile(sourcePath, targetPath) {
  try {
    fs.linkSync(sourcePath, targetPath);
  } catch {
    fs.copyFileSync(sourcePath, targetPath);
  }
}

function baulStatus() {
  const index = readIndex();
  const documents = [...index.documents].sort((a, b) => String(b.receivedAt).localeCompare(String(a.receivedAt)));
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

function cortijoBaulLocalPlugin() {
  return {
    name: "cortijo-baul-local",
    configureServer(server) {
      ensureBaulTree();

      server.middlewares.use("/api/finca/local-identity", (request, response) => {
        sendJson(response, 200, { application: "finca-maria", checkout: fs.realpathSync(server.config.root) });
      });

      server.middlewares.use("/api/baul/status", (request, response) => {
        if (request.method !== "GET") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }
        try {
          sendJson(response, 200, baulStatus());
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message });
        }
      });

      server.middlewares.use("/api/baul/check", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }

        try {
          const body = await readJsonBody(request, 5 * 1024 * 1024);
          const requestedFiles = Array.isArray(body.files) ? body.files : [];
          const index = readIndex();

          const duplicates = requestedFiles
            .map((file) => {
              const sha256 = String(file.sha256 || "").toLowerCase();
              const existing = findDuplicateByHash(index, sha256);
              return existing
                ? { sha256, requestedName: String(file.name || ""), existing: duplicateSummary(existing) }
                : null;
            })
            .filter(Boolean);

          sendJson(response, 200, {
            ok: true,
            duplicates,
            checked: requestedFiles.length
          });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Vérification des doublons impossible." });
        }
      });

      server.middlewares.use("/api/baul/upload", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }

        try {
          const body = await readJsonBody(request);
          const fileBuffer = Buffer.from(String(body.contentBase64 || ""), "base64");
          if (!fileBuffer.length) {
            sendJson(response, 400, { ok: false, error: "Aucun contenu de fichier reçu." });
            return;
          }

          const sha256 = hashBuffer(fileBuffer);
          const declaredSha256 = String(body.sha256 || "").toLowerCase();
          if (declaredSha256 && declaredSha256 !== sha256) {
            sendJson(response, 400, {
              ok: false,
              error: "L’empreinte du fichier a changé pendant l’import. Réessaie ce fichier."
            });
            return;
          }

          const index = readIndex();
          const existing = findDuplicateByHash(index, sha256);
          if (existing) {
            sendJson(response, 200, {
              ok: true,
              duplicate: true,
              existing: duplicateSummary(existing),
              root: BAUL_ROOT
            });
            return;
          }

          const detection = body.category && body.category !== "auto" && BAUL_CATEGORIES[body.category]
            ? { category: body.category, confidence: 1, reason: "Catégorie choisie manuellement" }
            : detectCategory(body.name, body.type);

          const id = uniquePrefix();
          const originalName = sanitizeFilename(body.name);
          const storedName = `${id}_${originalName}`;
          const originalPath = path.join(ORIGINALS_ROOT, storedName);
          const inboxPath = path.join(INBOX_ROOT, storedName);

          fs.writeFileSync(originalPath, fileBuffer);
          copyAsHardLinkOrFile(originalPath, inboxPath);

          const record = {
            id,
            originalName: String(body.name || originalName),
            storedName,
            mimeType: String(body.type || "application/octet-stream"),
            size: Number(body.size || fileBuffer.length),
            sha256,
            batchId: String(body.batchId || ""),
            receivedAt: new Date().toISOString(),
            status: "À valider",
            suggestedCategory: detection.category,
            confidence: detection.confidence,
            reason: detection.reason,
            originalRelativePath: toPortablePath(originalPath),
            currentRelativePath: toPortablePath(inboxPath)
          };

          index.documents.unshift(record);
          writeIndex(index);

          sendJson(response, 200, {
            ok: true,
            duplicate: false,
            document: record,
            root: BAUL_ROOT
          });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Erreur d’import BAÚL." });
        }
      });

      server.middlewares.use("/api/baul/confirm", async (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }

        try {
          const body = await readJsonBody(request, 1024 * 1024);
          const category = BAUL_CATEGORIES[body.category] ? body.category : "verifier";
          const index = readIndex();
          const document = index.documents.find((item) => item.id === body.id);

          if (!document) {
            sendJson(response, 404, { ok: false, error: "Document introuvable dans l’index du BAÚL." });
            return;
          }

          const sourcePath = document.currentRelativePath
            ? fromPortablePath(document.currentRelativePath)
            : defaultCurrentPath(document);
          const originalPath = documentOriginalPath(document);
          const targetFolder = path.join(VALIDATED_ROOT, BAUL_CATEGORIES[category]);
          fs.mkdirSync(targetFolder, { recursive: true });
          const targetPath = path.join(targetFolder, document.storedName);

          if (fs.existsSync(sourcePath)) {
            fs.renameSync(sourcePath, targetPath);
          } else if (fs.existsSync(originalPath)) {
            copyAsHardLinkOrFile(originalPath, targetPath);
          } else {
            throw new Error("L’original du document est introuvable.");
          }

          document.status = "Classé";
          document.category = category;
          document.validatedAt = new Date().toISOString();
          document.currentRelativePath = toPortablePath(targetPath);
          writeIndex(index);

          sendJson(response, 200, { ok: true, document, status: baulStatus() });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Classement impossible." });
        }
      });

      server.middlewares.use("/api/baul/open", (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }

        try {
          ensureBaulTree();
          openFolder(BAUL_ROOT);
          sendJson(response, 200, { ok: true, folder: BAUL_ROOT });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Impossible d’ouvrir le BAÚL." });
        }
      });

      server.middlewares.use("/api/baul/export", (request, response) => {
        if (request.method !== "POST") {
          sendJson(response, 405, { ok: false, error: "Méthode non autorisée." });
          return;
        }

        try {
          ensureBaulTree();
          const exportName = `INDEX_BAUL_${new Date().toISOString().slice(0, 10)}_${Date.now()}.json`;
          const exportPath = path.join(EXPORT_ROOT, exportName);
          const payload = {
            generatedAt: new Date().toISOString(),
            project: "FINCA MARIA",
            storageRoot: "BAUL_PRIVE",
            duplicateProtection: "SHA-256",
            ...readIndex()
          };
          fs.writeFileSync(exportPath, JSON.stringify(payload, null, 2), "utf-8");
          sendJson(response, 200, { ok: true, path: exportPath, folder: EXPORT_ROOT });
        } catch (error) {
          sendJson(response, 500, { ok: false, error: error.message || "Export impossible." });
        }
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), cortijoBaulLocalPlugin()]
});
