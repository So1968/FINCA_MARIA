#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const ORIGINALS = path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB");
const INPUT = path.join(ROOT, "_PRETRI_NOUVEAU_LOT_V38.json");
const OUTPUT = path.join(ROOT, "_REGROUPEMENT_NOUVEAU_LOT_V39.json");
const REPORT = path.join(ROOT, "_RAPPORT_REGROUPEMENT_NOUVEAU_LOT_V39.md");
const STALE_REPORT = path.join(ROOT, "_RAPPORT_PRETRI_NOUVEAU_LOT_V38.md");
const PREFIX = process.env.CORTIJO_NEW_BATCH_PREFIX || "20260816T08";

function norm(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function stripIngestPrefix(name) {
  return name.replace(/^\d{8}T\d{6}_[a-z0-9]+_/i, "");
}

function scanGroupKey(name) {
  const base = stripIngestPrefix(name);
  const m = base.match(/^(CamScanner_\d{2}-\d{2}-\d{4}_\d{2}[._]\d{2})(?:_\d+(?:_\d+)?_?)?\.jpe?g$/i);
  if (m) return m[1];
  return `SINGLE:${base}`;
}

function pageNumber(name) {
  const base = stripIngestPrefix(name);
  const m = base.match(/_(\d+)(?:_\d+)?_?\.jpe?g$/i);
  return m ? Number(m[1]) : 1;
}

const MANUAL_GROUP_LABELS = new Map([
  ["CamScanner_14-08-2026_20.47", "FISCAL_IRPF_MODELO_100"],
  ["CamScanner_14-08-2026_21.00", "ADMINISTRATION_AGRICOLE_JUNTA"],
  ["CamScanner_14-08-2026_21.20", "CONTRAT_ET_NOTES_ASSOCIEES"],
  ["CamScanner_14-08-2026_21.25", "CONTRAT_ARRENDAMIENTO"],
  ["CamScanner_14-08-2026_21.26", "NOTES_HISTORIQUES_EAU_TERRAIN"],
  ["CamScanner_14-08-2026_21.28", "CORRESPONDANCE_RECOMMANDEE"],
  ["CamScanner_14-08-2026_21.29", "CORRESPONDANCE_RECOMMANDEE"],
  ["CamScanner_14-08-2026_21.30", "CORRESPONDANCE_EAU_TERRAIN"],
  ["CamScanner_14-08-2026_21.33", "DOSSIER_HISTORIQUE_EAU_PROPRIETE_FAMILLE"]
]);

function inferLabel(group) {
  if (MANUAL_GROUP_LABELS.has(group.key)) return MANUAL_GROUP_LABELS.get(group.key);

  const text = norm(group.items.map((x) => x.excerpt || "").join(" "));
  const has = (re) => re.test(text);

  if (has(/modelo 100|impuesto sobre la renta|agencia tributaria|declaracion 2017/)) {
    return "FISCAL_IRPF_MODELO_100";
  }
  if (has(/solicitud unica|ayudas directas|agricultor activo|resumen superficies|control de ayudas|consejeria de agricultura|junta de andalucia/)) {
    return "PAC_AIDES_ADMINISTRATION_AGRICOLE";
  }
  if (has(/listado de facturas recibidas|reparto|aceitun|aceite|agricola san juan/)) {
    return "AGRI_SAN_JUAN_FACTURES_PRODUCTION";
  }
  if (has(/contrato de arrendamiento|arrendamiento/)) {
    return "CONTRAT_ARRENDAMIENTO";
  }
  if (has(/agencia del agua|abrevadero|adjudicacion vecinal rustica|hoya de los alemanes|confederacion hidrogr/)) {
    return "EAU_TERRAIN_DROITS_HISTORIQUES";
  }
  if (has(/correos|telegrafos|certificado|recepcion|entrega domiciliaria/)) {
    return "CORRESPONDANCE_RECOMMANDEE";
  }
  if (group.items.some((x) => x.signals?.cortijoStrong)) return "CORTIJO_DOCUMENT_A_QUALIFIER";
  if (group.items.some((x) => x.signals?.cortijoMedium)) return "CORTIJO_CONTEXTE_A_QUALIFIER";
  return "A_REVOIR";
}

function main() {
  if (!fs.existsSync(INPUT)) {
    throw new Error(`Pré-tri V38 introuvable : ${INPUT}`);
  }

  const v38 = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const sourceResults = Array.isArray(v38.results) ? v38.results : [];

  // V39 ne relance aucun OCR : il réutilise seulement le résultat V38 et écarte
  // les fichiers qui ont depuis été supprimés physiquement après validation humaine.
  const liveItems = sourceResults.filter((r) => {
    if (!r?.file || !r.file.startsWith(PREFIX)) return false;
    return fs.existsSync(path.join(ORIGINALS, r.file));
  });

  const groupsMap = new Map();
  for (const item of liveItems) {
    const key = scanGroupKey(item.file);
    if (!groupsMap.has(key)) groupsMap.set(key, { key, items: [] });
    groupsMap.get(key).items.push(item);
  }

  const groups = [...groupsMap.values()].map((group) => {
    group.items.sort((a, b) => {
      const pa = pageNumber(a.file);
      const pb = pageNumber(b.file);
      return pa - pb || a.file.localeCompare(b.file, "fr");
    });
    const label = inferLabel(group);
    return {
      key: group.key,
      label,
      pageCount: group.items.length,
      files: group.items.map((x) => x.file),
      sourceCategories: [...new Set(group.items.map((x) => x.category))].sort(),
      evidence: group.items.map((x) => ({
        file: x.file,
        excerpt: x.excerpt || "",
        signals: x.signals || {}
      }))
    };
  }).sort((a, b) => {
    if (b.pageCount !== a.pageCount) return b.pageCount - a.pageCount;
    return a.key.localeCompare(b.key, "fr");
  });

  const countsByLabel = {};
  for (const g of groups) countsByLabel[g.label] = (countsByLabel[g.label] || 0) + 1;

  const payload = {
    version: 39,
    generatedAt: new Date().toISOString(),
    batchPrefix: PREFIX,
    sourceVersion: 38,
    imageCount: liveItems.length,
    documentGroupCount: groups.length,
    principle: "Une série CamScanner portant le même horodatage de scan est regroupée comme un dossier/document candidat. Ce regroupement structurel ne prouve pas à lui seul que toutes les pages appartiennent juridiquement au même document.",
    countsByLabel,
    groups,
    safeguards: {
      noOcrRerun: true,
      noOriginalMoved: true,
      noOriginalRenamed: true,
      noOriginalModified: true,
      deletedFilesExcludedByExistenceCheck: true,
      generatedReportsContainOnlyExcerptsInheritedFromV38: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Regroupement du nouveau lot V39",
    "",
    `Images encore présentes dans le lot : **${liveItems.length}**`,
    `Groupes documentaires candidats : **${groups.length}**`,
    "",
    "> V39 ne relance aucun OCR et ne déplace aucun original. Il regroupe d'abord les pages issues d'une même série CamScanner. La validation documentaire finale reste humaine.",
    "",
    "## Répartition proposée",
    ""
  ];

  for (const [label, count] of Object.entries(countsByLabel).sort((a, b) => a[0].localeCompare(b[0], "fr"))) {
    lines.push(`- **${label}** : ${count} groupe(s)`);
  }

  lines.push("", "## Groupes", "");
  for (const g of groups) {
    lines.push(`### ${g.key}`);
    lines.push(`- proposition : **${g.label}**`);
    lines.push(`- pages/images : **${g.pageCount}**`);
    lines.push(`- catégories V38 présentes : ${g.sourceCategories.join(", ") || "—"}`);
    for (const file of g.files) lines.push(`  - \`${file}\``);
    lines.push("");
  }

  lines.push(
    "## Règle de lecture",
    "",
    "Le nombre de groupes V39 est un nombre de dossiers/documents candidats, pas encore un nombre définitif de pièces probantes. Une série peut contenir une couverture, une enveloppe, un accusé de réception ou des annexes qui devront être reliés au document principal au moment de la validation.",
    ""
  );

  fs.writeFileSync(REPORT, lines.join("\n"), "utf-8");

  // Une fois V39 écrit avec succès, les sorties V38 devenues obsolètes sont supprimées.
  // Cela efface aussi leurs références aux fichiers personnels déjà supprimés.
  for (const stale of [INPUT, STALE_REPORT]) {
    if (fs.existsSync(stale)) fs.unlinkSync(stale);
  }

  console.log("=== FINCA MARIA — REGROUPEMENT NOUVEAU LOT V39 ===");
  console.log("Images encore présentes :", liveItems.length);
  console.log("Groupes documentaires candidats :", groups.length);
  console.log("OCR relancé : NON");
  console.log("Déplacement effectué : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Pré-tri V38 obsolète nettoyé : OUI");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V39 :", error.message || error);
  process.exitCode = 1;
}
