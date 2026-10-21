#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V10.json");
const INDEX = path.join(ROOT, "_INDEX_BAUL.json");
const OUTPUT = path.join(ROOT, "_TEST_ROTATIONS_INCONNUS_V11.json");

const ANGLES = [0, 90, 180, 270];
const PSM = [3, 6];
const MIN_ORIENTATION_GAIN = 8;
const MIN_TEXT_FOR_PERSISTENCE = 20;

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function insideRoot(candidate) {
  const c = path.resolve(candidate);
  const r = path.resolve(ROOT);
  return c === r || c.startsWith(`${r}${path.sep}`);
}

function portable(relativePath) {
  if (!relativePath) return "";
  const p = path.resolve(ROOT, String(relativePath).split("/").join(path.sep));
  return insideRoot(p) ? p : "";
}

function existing(candidates) {
  return candidates.find((p) => p && insideRoot(p) && fs.existsSync(p)) || "";
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(value, null, 2), "utf-8");
  fs.renameSync(temporary, file);
}

function findIndexedDocument(doc, indexDocs) {
  return indexDocs.find((x) => x.id === doc.documentId || x.originalName === doc.originalName || x.name === doc.originalName) || null;
}

function resolveOriginalPath(indexed, doc) {
  const candidates = [
    indexed?.originalRelativePath ? portable(indexed.originalRelativePath) : "",
    doc.source?.originalRelativePath ? portable(doc.source.originalRelativePath) : "",
    doc.originalRelativePath ? portable(doc.originalRelativePath) : ""
  ];
  if (indexed?.storedName) candidates.push(path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", indexed.storedName));
  if (doc.storedName) candidates.push(path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", doc.storedName));
  return existing(candidates);
}

function resolveCurrentPath(indexed, doc) {
  const candidates = [
    indexed?.currentRelativePath ? portable(indexed.currentRelativePath) : "",
    doc.source?.currentRelativePath ? portable(doc.source.currentRelativePath) : "",
    doc.currentRelativePath ? portable(doc.currentRelativePath) : ""
  ];
  return existing(candidates);
}

function resolveFromDocument(doc, indexDocs) {
  const indexed = findIndexedDocument(doc, indexDocs);
  const candidates = [
    resolveCurrentPath(indexed, doc),
    resolveOriginalPath(indexed, doc)
  ];
  return existing(candidates);
}

async function commandExists(command) {
  try {
    await execFileAsync("sh", ["-lc", `command -v ${command}`], { encoding: "utf-8" });
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, maxBuffer = 16 * 1024 * 1024) {
  const { stdout } = await execFileAsync(command, args, {
    encoding: "utf-8",
    maxBuffer
  });
  return String(stdout || "");
}

async function rotationBackend() {
  if (await commandExists("magick")) return "magick";
  if (await commandExists("convert")) return "convert";
  try {
    await execFileAsync("python3", ["-c", "from PIL import Image"], { encoding: "utf-8" });
    return "pillow";
  } catch {}
  if (await commandExists("ffmpeg")) return "ffmpeg";
  return "";
}

async function rotateImage(source, angle, destination, backend) {
  if (angle === 0) {
    fs.copyFileSync(source, destination);
    return;
  }

  if (backend === "magick") {
    await run("magick", [source, "-rotate", String(angle), "-strip", destination]);
    return;
  }
  if (backend === "convert") {
    await run("convert", [source, "-rotate", String(angle), "-strip", destination]);
    return;
  }
  if (backend === "pillow") {
    const code = [
      "from PIL import Image",
      "import sys",
      "src, dst, angle = sys.argv[1], sys.argv[2], int(sys.argv[3])",
      "im = Image.open(src)",
      "out = im.rotate(angle, expand=True)",
      "out.save(dst)"
    ].join("\n");
    await run("python3", ["-c", code, source, destination, String(angle)]);
    return;
  }
  if (backend === "ffmpeg") {
    const filters = {
      90: "transpose=1",
      180: "hflip,vflip",
      270: "transpose=2"
    };
    const filter = filters[angle];
    if (!filter) throw new Error(`Rotation ffmpeg non prise en charge : ${angle}°`);
    await run("ffmpeg", [
      "-hide_banner", "-loglevel", "error", "-y",
      "-i", source,
      "-vf", filter,
      "-frames:v", "1",
      "-update", "1",
      destination
    ]);
    return;
  }
  throw new Error("Aucun outil de rotation disponible (ImageMagick, Pillow ou ffmpeg)." );
}

function scoreText(text) {
  const raw = String(text || "").trim();
  if (!raw) return -1000;
  const s = norm(raw);

  const strong = [
    "agencia tributaria", "modelo 037", "modelo 100", "actividad agricola",
    "plano", "parcela", "finca", "alemanes", "termino municipal",
    "catastro", "sigpac", "ayuntamiento", "registro", "notificaciones",
    "comunicaciones", "documento nacional", "identidad", "factura",
    "recibo", "fecha", "malaga", "antequera", "colmenar"
  ];
  const weak = [
    "de los rios", "serrano", "maria", "agricola", "declaracion",
    "tributaria", "municipal", "propiedad", "actividad", "presentacion"
  ];

  let score = Math.min(raw.length, 2500) / 80;
  for (const token of strong) if (s.includes(token)) score += 16;
  for (const token of weak) if (s.includes(token)) score += 5;

  const letters = (raw.match(/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g) || []).length;
  const weird = (raw.match(/[^\sA-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9.,;:()\/\-_'"%€º°]/g) || []).length;
  const words = raw.split(/\s+/).filter((x) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{3,}/.test(x)).length;
  score += Math.min(words, 120) * 0.45;
  if (letters > 0) score -= (weird / letters) * 80;

  return Math.round(score * 100) / 100;
}

function compactExcerpt(text, max = 700) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

async function testDocument(doc, filePath, backend) {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), "cortijo-v11-"));
  const results = [];

  try {
    for (const angle of ANGLES) {
      const rotated = path.join(temp, `rot_${angle}.png`);
      await rotateImage(filePath, angle, rotated, backend);

      for (const psm of PSM) {
        let text = "";
        let error = "";
        try {
          text = (await run("tesseract", [
            rotated,
            "stdout",
            "-l", "spa+fra+eng",
            "--psm", String(psm)
          ])).trim();
        } catch (e) {
          error = String(e?.message || e);
        }

        results.push({
          angle,
          psm,
          score: scoreText(text),
          text: text.slice(0, 12000),
          error
        });
      }
    }
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }

  results.sort((a, b) => b.score - a.score);
  const best = results[0] || null;
  const bestAtZero = results.filter((x) => x.angle === 0).sort((a, b) => b.score - a.score)[0] || null;
  const orientationGain = best && bestAtZero ? Math.round((best.score - bestAtZero.score) * 100) / 100 : 0;
  const orientationConfident = Boolean(
    best &&
    best.angle !== 0 &&
    String(best.text || "").trim().length >= MIN_TEXT_FOR_PERSISTENCE &&
    orientationGain >= MIN_ORIENTATION_GAIN
  );

  return {
    originalName: doc.originalName,
    sourcePath: path.relative(ROOT, filePath).split(path.sep).join("/"),
    previousReadingStatus: doc.reading?.status || "",
    best,
    bestAtZero,
    orientationGain,
    orientationConfident,
    candidates: results
  };
}

async function persistOrientation(doc, analysis, backend, indexDocs) {
  const best = analysis.best;
  if (!best) return { persisted: false, reason: "aucun_candidat" };
  if (best.angle === 0) return { persisted: false, reason: "deja_dans_le_bon_sens", angle: 0 };
  if (!analysis.orientationConfident) {
    return {
      persisted: false,
      reason: "orientation_pas_assez_certaine",
      angle: best.angle,
      gain: analysis.orientationGain
    };
  }

  const indexed = findIndexedDocument(doc, indexDocs);
  if (!indexed) return { persisted: false, reason: "document_absent_index", angle: best.angle };

  const currentPath = resolveCurrentPath(indexed, doc);
  const originalPath = resolveOriginalPath(indexed, doc);
  if (!currentPath) return { persisted: false, reason: "copie_travail_introuvable", angle: best.angle };
  if (originalPath && path.resolve(currentPath) === path.resolve(originalPath)) {
    return { persisted: false, reason: "seul_original_disponible_protection_active", angle: best.angle };
  }

  const extension = path.extname(currentPath) || ".png";
  const temporary = path.join(path.dirname(currentPath), `.${path.basename(currentPath)}.orientation-v11-${process.pid}${extension}`);
  try {
    await rotateImage(currentPath, best.angle, temporary, backend);
    const oldStat = fs.statSync(currentPath);
    try { fs.chmodSync(temporary, oldStat.mode); } catch {}
    fs.renameSync(temporary, currentPath);

    indexed.orientation = {
      normalized: true,
      degreesApplied: best.angle,
      source: "v11_ocr_rotation",
      confidenceRule: `gain>=${MIN_ORIENTATION_GAIN}`,
      scoreGain: analysis.orientationGain,
      psmSelected: best.psm,
      normalizedAt: new Date().toISOString(),
      originalPreserved: true
    };

    return {
      persisted: true,
      reason: "copie_travail_remise_dans_le_bon_sens",
      angle: best.angle,
      currentRelativePath: indexed.currentRelativePath || "",
      originalPreserved: true
    };
  } finally {
    if (fs.existsSync(temporary)) fs.rmSync(temporary, { force: true });
  }
}

async function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Analyse V10 introuvable : ${INPUT}`);
  if (!fs.existsSync(INDEX)) throw new Error(`Index BAÚL introuvable : ${INDEX}`);
  if (!(await commandExists("tesseract"))) throw new Error("Tesseract est introuvable.");

  const backend = await rotationBackend();
  if (!backend) throw new Error("Impossible de faire les rotations : aucun moteur disponible (ImageMagick, Pillow ou ffmpeg).");

  const input = readJson(INPUT);
  const index = readJson(INDEX);
  const indexDocs = Array.isArray(index.documents) ? index.documents : [];
  const unknowns = Array.isArray(input.remainingUnknowns) ? input.remainingUnknowns : [];

  console.log("=== FINCA MARIA — RETEST ROTATIONS V11 ===");
  console.log("Documents ciblés :", unknowns.length);
  console.log("Rotations testées : 0°, 90°, 180°, 270°");
  console.log("PSM testés : 3 et 6");
  console.log("Moteur rotation :", backend);
  console.log("Les originaux privés restent intacts.");
  console.log("Quand l'orientation est suffisamment certaine, seule la copie de travail utilisée par les aperçus est remise définitivement à l'endroit.\n");

  const analyses = [];
  let persistedCount = 0;

  for (let i = 0; i < unknowns.length; i += 1) {
    const doc = unknowns[i];
    const filePath = resolveFromDocument(doc, indexDocs);
    if (!filePath) {
      analyses.push({
        originalName: doc.originalName,
        previousReadingStatus: doc.reading?.status || "",
        error: "fichier_introuvable"
      });
      console.log(`[${i + 1}/${unknowns.length}] ${doc.originalName} | FICHIER INTROUVABLE`);
      continue;
    }

    const result = await testDocument(doc, filePath, backend);
    result.orientationPersistence = await persistOrientation(doc, result, backend, indexDocs);
    if (result.orientationPersistence.persisted) persistedCount += 1;
    analyses.push(result);

    const best = result.best;
    console.log(`\n[${i + 1}/${unknowns.length}] ${doc.originalName}`);
    console.log(`meilleur : rotation ${best?.angle ?? "?"}° | psm ${best?.psm ?? "?"} | score ${best?.score ?? "?"} | gain vs 0° ${result.orientationGain}`);
    if (result.orientationPersistence.persisted) {
      console.log(`orientation conservée : OUI — copie de travail tournée de ${best.angle}°, original privé préservé`);
    } else if (best?.angle === 0) {
      console.log("orientation conservée : déjà dans le bon sens");
    } else {
      console.log(`orientation conservée : NON — ${result.orientationPersistence.reason}`);
    }
    console.log(compactExcerpt(best?.text || "", 650) || "[aucun texte exploitable]");
  }

  index.updatedAt = new Date().toISOString();
  writeJsonAtomic(INDEX, index);

  const payload = {
    version: 11,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    targetedDocuments: unknowns.length,
    rotationBackend: backend,
    rotations: ANGLES,
    psm: PSM,
    orientationPersistence: {
      enabled: true,
      persistedDocuments: persistedCount,
      originalPolicy: "original_prive_intact",
      previewPolicy: "copie_travail_orientee_definitivement_si_confiance_suffisante",
      minimumScoreGainVersusZero: MIN_ORIENTATION_GAIN
    },
    analyses
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  console.log("\n=== FIN RETEST V11 ===");
  console.log("Documents retestés :", analyses.length);
  console.log("Copies de travail remises définitivement à l'endroit :", persistedCount);
  console.log("Sortie :", OUTPUT);
  console.log("Les originaux privés n'ont pas été modifiés. Les copies de travail corrigées seront désormais utilisées par les aperçus/liens existants.");
}

main().catch((error) => {
  console.error("ERREUR V11 :", error.message || error);
  process.exitCode = 1;
});