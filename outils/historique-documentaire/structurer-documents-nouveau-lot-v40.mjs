#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_REGROUPEMENT_NOUVEAU_LOT_V39.json");
const OUTPUT = path.join(ROOT, "_STRUCTURATION_DOCUMENTAIRE_NOUVEAU_LOT_V40.json");
const REPORT = path.join(ROOT, "_RAPPORT_STRUCTURATION_DOCUMENTAIRE_V40.md");

function norm(v) {
  return String(v || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function textOf(group) {
  return norm((group.evidence || []).map((e) => e.excerpt || "").join(" "));
}

function yearsIn(text) {
  return [...new Set((text.match(/\b20(?:0\d|1\d|2\d)\b/g) || []))].sort();
}

function yearForEvidence(e) {
  const t = norm(e.excerpt || "");
  const candidates = t.match(/\b20(?:0\d|1\d|2\d)\b/g) || [];
  // Pour les états Agri San Juan, privilégier l'année de la plage de factures si elle apparaît.
  const range = t.match(/01\/01\/(20\d{2})/);
  if (range) return range[1];
  return candidates[0] || "ANNEE_A_VERIFIER";
}

function makeUnit({ id, title, category, evidenceLevel, files, sourceGroup, facts = [], cautions = [], status = "VALIDABLE" }) {
  return { id, title, category, evidenceLevel, files, sourceGroup, facts, cautions, status };
}

function splitAgriSanJuan(group) {
  const byYear = new Map();
  for (const e of group.evidence || []) {
    const y = yearForEvidence(e);
    if (!byYear.has(y)) byYear.set(y, []);
    byYear.get(y).push(e.file);
  }
  return [...byYear.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([year, files]) => makeUnit({
      id: `AGRI_SAN_JUAN_FACTURES_${year}`,
      title: `Agri San Juan — états de factures / documents ${year}`,
      category: "AGRI_SAN_JUAN_FACTURES_PRODUCTION",
      evidenceLevel: "PRIMAIRE_COOPERATIVE",
      files,
      sourceGroup: group.key,
      facts: year === "ANNEE_A_VERIFIER" ? [] : [{ type: "annee_documentaire", value: year }],
      cautions: ["Un état de factures peut regrouper plusieurs écritures et ne vaut pas, à lui seul, total annuel de production d'olives."],
      status: year === "ANNEE_A_VERIFIER" ? "A_REVOIR" : "VALIDABLE"
    }));
}

function unitForGroup(group) {
  const t = textOf(group);

  switch (group.key) {
    case "CamScanner_14-08-2026_20.44":
      return [makeUnit({
        id: "MODELO_037_MARIA_JOSEFA",
        title: "Modelo 037 — activité de María Josefa de los Rios Serrano",
        category: "FISCAL_ACTIVITE_AGRICOLE_MODELO_037",
        evidenceLevel: "PRIMAIRE_FISCAL",
        files: group.files,
        sourceGroup: group.key,
        facts: [{ type: "document", value: "Modelo 037" }],
        cautions: ["Document de statut/activité : ne prouve pas une quantité de récolte ni un rendement."],
        status: "VALIDABLE"
      })];

    case "CamScanner_14-08-2026_21.13":
      return [makeUnit({
        id: "PAC_CONTROLE_TERRAIN_2007",
        title: "PAC — contrôle terrain / photo-interprétation du 12/07/2007",
        category: "PAC_CONTROLE_TERRAIN",
        evidenceLevel: "PRIMAIRE_ADMINISTRATION_AGRICOLE",
        files: group.files,
        sourceGroup: group.key,
        facts: [
          { type: "date_controle", value: "2007-07-12" },
          { type: "titulaire", value: "María Serrano García" },
          { type: "expediente", value: "7007204" },
          { type: "reference_image", value: "Vuelo Andal. Act. 2005" },
          { type: "observation", value: "Certaines pages indiquent Sin incidencia ; d'autres signalent que l'usage observé ne coïncide pas avec l'usage déclaré." }
        ],
        cautions: [
          "Les surfaces lues page par page concernent des parcelles/recintos : ne pas les additionner ni les traiter comme surface totale du Cortijo sans reconstruction SIGPAC.",
          "Le lot contient 14 images alors que plusieurs pages portent une pagination interne allant jusqu'à 15 : vérifier s'il manque une page ou si une page de couverture n'entre pas dans la pagination."
        ],
        status: "VALIDABLE_AVEC_CONTROLE_COMPLETUDE"
      })];

    case "CamScanner_14-08-2026_21.23":
      return [makeUnit({
        id: "CONTRAT_ARRENDAMIENTO_15PCT_OLIVAR",
        title: "Contrat d'arrendamiento — María Serrano García / José López Gallego — rente 15 % olivar",
        category: "CONTRAT_ARRENDAMIENTO",
        evidenceLevel: "PRIMAIRE_CONTRAT",
        files: group.files,
        sourceGroup: group.key,
        facts: [
          { type: "arrendador", value: "María Serrano García" },
          { type: "arrendatario", value: "José López Gallego" },
          { type: "rente_olivar_pct", value: 15 },
          { type: "rente_tierra_calma_pct", value: 0 },
          { type: "echeance_rente", value: "avril de chaque année" }
        ],
        cautions: [
          "Le 15 % est ici une clause contractuelle directe, mais sa portée est celle de ce contrat : ne pas l'étendre automatiquement à toutes les campagnes ou à d'autres exploitants.",
          "Comparer avec la série 21.25 pour déterminer s'il s'agit du même contrat, d'une copie, d'une version ou d'un document différent avant dédoublonnage."
        ],
        status: "VALIDABLE_AVEC_COMPARAISON_21_25"
      })];

    case "CamScanner_14-08-2026_21.17":
      return splitAgriSanJuan(group);

    default: {
      const categoryMap = {
        "FISCAL_IRPF_MODELO_100": ["FISCAL_IRPF_MODELO_100", "PRIMAIRE_FISCAL"],
        "PAC_AIDES_ADMINISTRATION_AGRICOLE": ["PAC_AIDES_ADMINISTRATION_AGRICOLE", "PRIMAIRE_ADMINISTRATION_AGRICOLE"],
        "ADMINISTRATION_AGRICOLE_JUNTA": ["ADMINISTRATION_AGRICOLE_JUNTA", "PRIMAIRE_ADMINISTRATION_AGRICOLE"],
        "CONTRAT_ARRENDAMIENTO": ["CONTRAT_ARRENDAMIENTO", "PRIMAIRE_CONTRAT_A_VERIFIER"],
        "CONTRAT_ET_NOTES_ASSOCIEES": ["CONTRAT_ET_NOTES_ASSOCIEES", "MIXTE_PRIMAIRE_SECONDAIRE"],
        "NOTES_HISTORIQUES_EAU_TERRAIN": ["NOTES_HISTORIQUES_EAU_TERRAIN", "SECONDAIRE_FAMILIAL"],
        "CORRESPONDANCE_RECOMMANDEE": ["CORRESPONDANCE_RECOMMANDEE", "PRIMAIRE_CORRESPONDANCE"],
        "CORRESPONDANCE_EAU_TERRAIN": ["CORRESPONDANCE_EAU_TERRAIN", "PRIMAIRE_CORRESPONDANCE"],
        "DOSSIER_HISTORIQUE_EAU_PROPRIETE_FAMILLE": ["DOSSIER_HISTORIQUE_EAU_PROPRIETE_FAMILLE", "MIXTE_A_QUALIFIER"],
        "CORTIJO_DOCUMENT_A_QUALIFIER": ["CORTIJO_DOCUMENT_A_QUALIFIER", "A_QUALIFIER"],
        "A_REVOIR": ["A_REVOIR", "A_QUALIFIER"]
      };
      const [category, evidenceLevel] = categoryMap[group.label] || [group.label || "A_REVOIR", "A_QUALIFIER"];
      const ys = yearsIn(t);
      return [makeUnit({
        id: group.key.replace(/[^A-Z0-9]+/gi, "_").replace(/^_|_$/g, "").toUpperCase(),
        title: `${category} — ${group.key}`,
        category,
        evidenceLevel,
        files: group.files,
        sourceGroup: group.key,
        facts: ys.length ? [{ type: "annees_reperables_ocr", value: ys }] : [],
        cautions: category === "CONTRAT_ARRENDAMIENTO"
          ? ["Comparer cette série avec le contrat 21.23 avant de conclure qu'il s'agit d'une pièce distincte."]
          : [],
        status: evidenceLevel === "A_QUALIFIER" ? "A_REVOIR" : "VALIDABLE"
      })];
    }
  }
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`V39 introuvable : ${INPUT}`);
  const v39 = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const groups = Array.isArray(v39.groups) ? v39.groups : [];

  const units = groups.flatMap(unitForGroup);
  const usedFiles = new Set(units.flatMap((u) => u.files));
  const sourceFiles = new Set(groups.flatMap((g) => g.files || []));
  const unassigned = [...sourceFiles].filter((f) => !usedFiles.has(f));

  const alerts = [];
  const control2007 = units.find((u) => u.id === "PAC_CONTROLE_TERRAIN_2007");
  if (control2007) alerts.push({
    severity: "IMPORTANT",
    code: "PAC_2007_COMPLETUDE",
    message: "Contrôle PAC 2007 : 14 images présentes, pagination interne allant jusqu'à 15. Vérifier la complétude avant extraction exhaustive des parcelles/recintos."
  });

  const contract15 = units.find((u) => u.id === "CONTRAT_ARRENDAMIENTO_15PCT_OLIVAR");
  if (contract15) alerts.push({
    severity: "MAJEUR",
    code: "PREUVE_CONTRACTUELLE_15_PCT",
    message: "Le nouveau lot contient une clause contractuelle directe fixant la rente à 15 % de la production d'olivier, payable en avril. Cette preuve renforce le 15 % dans le contexte de ce bail, sans l'étendre automatiquement à toute l'histoire de l'exploitation."
  });

  if (groups.some((g) => g.key === "CamScanner_14-08-2026_21.25")) alerts.push({
    severity: "IMPORTANT",
    code: "COMPARER_CONTRATS_21_23_21_25",
    message: "Les séries 21.23 et 21.25 doivent être comparées avant dédoublonnage : elles peuvent être deux pièces distinctes, une copie ou deux versions du même contrat."
  });

  const countsByEvidence = {};
  const countsByCategory = {};
  for (const u of units) {
    countsByEvidence[u.evidenceLevel] = (countsByEvidence[u.evidenceLevel] || 0) + 1;
    countsByCategory[u.category] = (countsByCategory[u.category] || 0) + 1;
  }

  const payload = {
    version: 40,
    generatedAt: new Date().toISOString(),
    sourceVersion: 39,
    sourceImageCount: v39.imageCount,
    sourceGroupCount: groups.length,
    documentUnitCount: units.length,
    countsByEvidence,
    countsByCategory,
    units,
    alerts,
    unassignedFiles: unassigned,
    safeguards: {
      noOcrRerun: true,
      noOriginalMoved: true,
      noOriginalRenamed: true,
      noOriginalModified: true,
      noAutomaticDeletion: true,
      contractual15PercentScopedToLeaseOnly: true,
      noSurfaceAggregationFromPacPages: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Structuration documentaire V40",
    "",
    `Images sources : **${v39.imageCount ?? "?"}**`,
    `Groupes V39 : **${groups.length}**`,
    `Unités documentaires V40 : **${units.length}**`,
    `Fichiers non affectés : **${unassigned.length}**`,
    "",
    "## Alertes importantes",
    ""
  ];
  for (const a of alerts) lines.push(`- **${a.code}** — ${a.message}`);

  lines.push("", "## Unités documentaires", "");
  for (const u of units) {
    lines.push(`### ${u.id}`);
    lines.push(`- ${u.title}`);
    lines.push(`- catégorie : **${u.category}**`);
    lines.push(`- niveau de preuve : **${u.evidenceLevel}**`);
    lines.push(`- statut : **${u.status}**`);
    lines.push(`- fichiers : **${u.files.length}**`);
    if (u.facts.length) {
      lines.push("- faits structurés :");
      for (const f of u.facts) lines.push(`  - ${f.type} : ${JSON.stringify(f.value)}`);
    }
    if (u.cautions.length) {
      lines.push("- prudences :");
      for (const c of u.cautions) lines.push(`  - ${c}`);
    }
    lines.push("");
  }

  fs.writeFileSync(REPORT, lines.join("\n"), "utf-8");

  console.log("=== FINCA MARIA — STRUCTURATION DOCUMENTAIRE V40 ===");
  console.log("Images sources :", v39.imageCount);
  console.log("Groupes V39 :", groups.length);
  console.log("Unités documentaires V40 :", units.length);
  console.log("Fichiers non affectés :", unassigned.length);
  console.log("OCR relancé : NON");
  console.log("Déplacement effectué : NON");
  console.log("Alerte 15 % contractuel :", contract15 ? "OUI" : "NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
}

try { main(); }
catch (error) {
  console.error("ERREUR V40 :", error.message || error);
  process.exitCode = 1;
}
