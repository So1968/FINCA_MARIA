#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const ORIGINALS = path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB");
const PREFIX = process.env.CORTIJO_NEW_BATCH_PREFIX || "20260816T08";
const OUTPUT = path.join(ROOT, "_PRETRI_NOUVEAU_LOT_V38.json");
const REPORT = path.join(ROOT, "_RAPPORT_PRETRI_NOUVEAU_LOT_V38.md");

function norm(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function hasAny(text, patterns) {
  return patterns.some((re) => re.test(text));
}

function snippet(raw, patterns) {
  const n = norm(raw);
  for (const re of patterns) {
    const m = n.match(re);
    if (!m || m.index == null) continue;
    const start = Math.max(0, m.index - 110);
    const end = Math.min(raw.length, m.index + m[0].length + 180);
    return raw.slice(start, end).replace(/\s+/g, " ").trim();
  }
  return raw.replace(/\s+/g, " ").trim().slice(0, 300);
}

function runOcr(file) {
  const args = [file, "stdout", "-l", "fra+spa+eng", "--psm", "1"];
  const res = spawnSync("tesseract", args, {
    encoding: "utf-8",
    maxBuffer: 12 * 1024 * 1024,
    timeout: 90000
  });
  return {
    ok: res.status === 0 || Boolean(res.stdout),
    text: res.stdout || "",
    stderr: (res.stderr || "").slice(0, 800),
    status: res.status
  };
}

const PATTERNS = {
  banquePopulaire: [
    /banque\s+populaire/i,
    /bpce/i,
    /cyberplus/i
  ],
  michele: [
    /michele\s+de\s+los\s+rios/i,
    /de\s+los\s+rios[^\n]{0,80}michele/i,
    /michele[^\n]{0,80}de\s+los\s+rios/i
  ],
  cortijoStrong: [
    /cortijo\s+alemanes/i,
    /cjo\.?\s+alemanes/i,
    /agricola\s+san\s+juan/i,
    /s\.?c\.?a\.?\s+agricola\s+san\s+juan/i,
    /sigpac/i,
    /olivar/i,
    /aceitun/i,
    /triticale/i,
    /parcela/i,
    /poligono/i,
    /recinto/i,
    /campana\s+\d{2}\s*\/\s*\d{2}/i,
    /reparto\s+cp/i,
    /subvencion[^\n]{0,100}(olivar|agricol)/i,
    /explotacion\s+agricol/i
  ],
  cortijoMedium: [
    /junta\s+de\s+andalucia/i,
    /malaga/i,
    /antequera/i,
    /villanueva\s+del\s+rosario/i,
    /catastro/i,
    /rustic/i,
    /hectarea/i,
    /cultiv/i,
    /agricol/i,
    /finca/i
  ]
};

function classify(raw) {
  const text = norm(raw);
  const banque = hasAny(text, PATTERNS.banquePopulaire);
  const michele = hasAny(text, PATTERNS.michele);
  const cortijoStrong = hasAny(text, PATTERNS.cortijoStrong);
  const cortijoMedium = hasAny(text, PATTERNS.cortijoMedium);
  const meaningfulChars = text.replace(/[^a-z0-9]/g, "").length;
  const lowText = meaningfulChars < 35;

  if ((banque || michele) && cortijoStrong) {
    return {
      category: "MIXTE_A_REVOIR",
      reason: "Un signal personnel explicite et un signal Cortijo fort apparaissent ensemble : pas de séparation automatique."
    };
  }
  if (banque) {
    return {
      category: "PERSONNEL_BANQUE_POPULAIRE",
      reason: "Mention explicite Banque Populaire/BPCE/Cyberplus."
    };
  }
  if (michele) {
    return {
      category: "PERSONNEL_MICHELE_DE_LOS_RIOS",
      reason: "Mention explicite de Michèle de los Rios."
    };
  }
  if (cortijoStrong || (cortijoMedium && meaningfulChars >= 80)) {
    return {
      category: "CORTIJO_PROBABLE",
      reason: cortijoStrong
        ? "Au moins un marqueur agricole/Cortijo fort est présent."
        : "Plusieurs éléments contextuels agricoles/andalous sont présents dans un document suffisamment textuel."
    };
  }
  if (lowText) {
    return {
      category: "PHOTO_OU_IMAGE_SANS_TEXTE_A_REVOIR",
      reason: "Très peu de texte exploitable. Cette catégorie doit être revue visuellement ; aucune reconnaissance faciale n'est utilisée."
    };
  }
  return {
    category: "DOCUMENT_AMBIGU_A_REVOIR",
    reason: "Document textuel sans marqueur suffisamment sûr pour le ranger automatiquement."
  };
}

function main() {
  if (!fs.existsSync(ORIGINALS)) throw new Error(`Dossier introuvable : ${ORIGINALS}`);

  const probe = spawnSync("tesseract", ["--version"], { encoding: "utf-8" });
  if (probe.error || probe.status !== 0) {
    throw new Error("Tesseract est introuvable. V38 ne lance aucun autre traitement en remplacement.");
  }

  const files = fs.readdirSync(ORIGINALS)
    .filter((name) => name.startsWith(PREFIX))
    .map((name) => path.join(ORIGINALS, name))
    .filter((file) => fs.statSync(file).isFile())
    .sort((a, b) => a.localeCompare(b, "fr"));

  if (!files.length) throw new Error(`Aucun fichier du lot ${PREFIX} trouvé.`);

  const results = [];
  let i = 0;
  for (const file of files) {
    i += 1;
    const name = path.basename(file);
    process.stdout.write(`[${i}/${files.length}] ${name}\n`);
    const ocr = runOcr(file);
    const decision = classify(ocr.text);

    const relevantPatterns = [
      ...PATTERNS.banquePopulaire,
      ...PATTERNS.michele,
      ...PATTERNS.cortijoStrong,
      ...PATTERNS.cortijoMedium
    ];

    results.push({
      file: name,
      sourcePath: file,
      category: decision.category,
      reason: decision.reason,
      ocrOk: ocr.ok,
      ocrChars: ocr.text.length,
      excerpt: snippet(ocr.text, relevantPatterns),
      signals: {
        banquePopulaire: hasAny(norm(ocr.text), PATTERNS.banquePopulaire),
        micheleDeLosRios: hasAny(norm(ocr.text), PATTERNS.michele),
        cortijoStrong: hasAny(norm(ocr.text), PATTERNS.cortijoStrong),
        cortijoMedium: hasAny(norm(ocr.text), PATTERNS.cortijoMedium)
      }
    });
  }

  const counts = {};
  for (const r of results) counts[r.category] = (counts[r.category] || 0) + 1;

  const payload = {
    version: 38,
    generatedAt: new Date().toISOString(),
    batchPrefix: PREFIX,
    sourceDirectory: ORIGINALS,
    totalFiles: results.length,
    purpose: "Pré-trier uniquement le nouveau lot entre Cortijo, documents personnels explicitement demandés et éléments à revoir, avant tout déplacement.",
    requestedPersonalTargets: [
      "Banque Populaire",
      "Michèle de los Rios",
      "photo du frère — à identifier par validation humaine, sans reconnaissance faciale"
    ],
    counts,
    results,
    safeguards: {
      newBatchOnly: true,
      noOld302ReOcr: true,
      noFaceRecognition: true,
      noOriginalMoved: true,
      noOriginalRenamed: true,
      noOriginalModified: true,
      noReceptionCopyMoved: true,
      ambiguousFilesRequireHumanReview: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const groups = Object.groupBy
    ? Object.groupBy(results, (r) => r.category)
    : results.reduce((acc, r) => ((acc[r.category] ||= []).push(r), acc), {});

  const lines = [
    "# FINCA MARIA — Pré-tri nouveau lot V38",
    "",
    `Lot : **${PREFIX}**`,
    `Fichiers examinés : **${results.length}**`,
    "",
    "## Comptage",
    ""
  ];

  for (const [category, count] of Object.entries(counts).sort()) {
    lines.push(`- **${category}** : ${count}`);
  }

  const order = [
    "PERSONNEL_BANQUE_POPULAIRE",
    "PERSONNEL_MICHELE_DE_LOS_RIOS",
    "MIXTE_A_REVOIR",
    "PHOTO_OU_IMAGE_SANS_TEXTE_A_REVOIR",
    "DOCUMENT_AMBIGU_A_REVOIR",
    "CORTIJO_PROBABLE"
  ];

  for (const category of order) {
    const group = groups[category] || [];
    if (!group.length) continue;
    lines.push("", `## ${category}`, "");
    for (const r of group) {
      lines.push(`- \`${r.file}\``);
      lines.push(`  - raison : ${r.reason}`);
      if (r.excerpt) lines.push(`  - extrait OCR : ${r.excerpt}`);
    }
  }

  lines.push(
    "",
    "## Règle de sécurité",
    "",
    "V38 ne déplace rien. Banque Populaire et Michèle de los Rios sont seulement isolés comme candidats personnels lorsqu'une mention explicite est détectée. Les images sans texte sont laissées à la revue visuelle ; la photo du frère ne sera jamais identifiée par reconnaissance faciale.",
    "",
    "Les documents Cortijo restent des candidats tant que le pré-tri n'a pas été validé humainement."
  );

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("\n=== FINCA MARIA — PRE-TRI NOUVEAU LOT V38 ===");
  console.log("Lot :", PREFIX);
  console.log("Fichiers examinés :", results.length);
  for (const [category, count] of Object.entries(counts).sort()) {
    console.log(`${category} : ${count}`);
  }
  console.log("Déplacement effectué : NON");
  console.log("Reconnaissance faciale : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
}

try { main(); }
catch (error) {
  console.error("ERREUR V38 :", error.message || error);
  process.exitCode = 1;
}
