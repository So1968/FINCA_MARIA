#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_STRUCTURATION_DOCUMENTAIRE_NOUVEAU_LOT_V40.json");
const OUTPUT = path.join(ROOT, "_STRUCTURATION_DOCUMENTAIRE_NOUVEAU_LOT_V41.json");
const REPORT = path.join(ROOT, "_RAPPORT_STRUCTURATION_DOCUMENTAIRE_V41.md");

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`V40 introuvable : ${INPUT}`);
  const v40 = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const units = clone(Array.isArray(v40.units) ? v40.units : []);
  const alerts = clone(Array.isArray(v40.alerts) ? v40.alerts : []);
  const corrections = [];

  const u2018 = units.find((u) => u.id === "AGRI_SAN_JUAN_FACTURES_ANNEE_A_VERIFIER");
  if (!u2018) throw new Error("Unité Agri San Juan à année indéterminée introuvable.");
  u2018.id = "AGRI_SAN_JUAN_FACTURES_2018";
  u2018.title = "Agri San Juan — état de factures reçues 2018";
  u2018.status = "VALIDABLE";
  u2018.facts = [{ type: "annee_documentaire", value: "2018" }];
  u2018.cautions = [
    "Année 2018 confirmée par revue visuelle humaine de la page cible.",
    "Cet état de factures ne vaut pas, à lui seul, total annuel de production d'olives."
  ];
  corrections.push({ code: "AGRI_SAN_JUAN_2018_CONFIRME", basis: "REVUE_VISUELLE_HUMAINE" });

  const u2125 = units.find((u) => u.sourceGroup === "CamScanner_14-08-2026_21.25");
  if (!u2125) throw new Error("Série 21.25 introuvable.");
  u2125.id = "CORRESPONDANCE_PREPARATION_CONTRAT_21_25";
  u2125.title = "Correspondance préparatoire à la rédaction d'un contrat";
  u2125.category = "CORRESPONDANCE_PREPARATION_CONTRAT_ARRENDAMIENTO";
  u2125.evidenceLevel = "PRIMAIRE_CORRESPONDANCE_CONTENU_RAPPORTE";
  u2125.status = "VALIDABLE_COMME_CORRESPONDANCE";
  u2125.cautions = [
    "Cette série n'est pas la preuve contractuelle primaire : elle prépare un contrat et rapporte les conditions d'un contrat antérieur.",
    "Ne pas fusionner automatiquement la série 21.25 avec la série 21.23."
  ];
  corrections.push({ code: "21_25_REQUALIFIE_CORRESPONDANCE", basis: "REVUE_CONTENU" });

  const compare = alerts.find((a) => a.code === "COMPARER_CONTRATS_21_23_21_25");
  if (compare) {
    compare.severity = "RESOLU";
    compare.code = "21_23_21_25_QUALIFICATION_RESOLUE";
    compare.message = "21.23 reste la preuve contractuelle primaire ; 21.25 est une correspondance préparatoire distincte.";
  }
  alerts.push({
    severity: "RESOLU",
    code: "AGRI_SAN_JUAN_2018_CONFIRME_VISUELLEMENT",
    message: "La page auparavant sans année exploitable est confirmée comme document 2018 par revue visuelle humaine."
  });

  const countsByEvidence = {};
  const countsByCategory = {};
  for (const u of units) {
    countsByEvidence[u.evidenceLevel] = (countsByEvidence[u.evidenceLevel] || 0) + 1;
    countsByCategory[u.category] = (countsByCategory[u.category] || 0) + 1;
  }

  const agriYears = units
    .filter((u) => /^AGRI_SAN_JUAN_FACTURES_\d{4}$/.test(u.id))
    .map((u) => u.id.slice(-4))
    .sort();

  const payload = {
    version: 41,
    generatedAt: new Date().toISOString(),
    sourceVersion: 40,
    sourceImageCount: v40.sourceImageCount,
    sourceGroupCount: v40.sourceGroupCount,
    documentUnitCount: units.length,
    countsByEvidence,
    countsByCategory,
    agriSanJuanDocumentYears: agriYears,
    corrections,
    units,
    alerts,
    unassignedFiles: clone(v40.unassignedFiles || []),
    safeguards: {
      noOcrRerun: true,
      noOriginalMoved: true,
      noOriginalRenamed: true,
      noOriginalModified: true,
      noAutomaticDeletion: true,
      contractualPercentStillScopedToPrimaryLease: true,
      correspondence21_25NotPromotedToContractProof: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Structuration documentaire V41",
    "",
    `Images sources : **${v40.sourceImageCount ?? "?"}**`,
    `Unités documentaires : **${units.length}**`,
    `Fichiers non affectés : **${(v40.unassignedFiles || []).length}**`,
    "",
    "## Corrections validées",
    "",
    "- **Agri San Juan 2018** : année confirmée par revue visuelle humaine.",
    "- **Série 21.25** : requalifiée en correspondance préparatoire, distincte de la preuve contractuelle primaire 21.23.",
    "",
    `Années documentaires Agri San Juan présentes : **${agriYears.join(", ")}**`,
    "",
    "## Alertes",
    ""
  ];
  for (const a of alerts) lines.push(`- **${a.code}** (${a.severity}) — ${a.message}`);
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CORRECTION STRUCTURATION V41 ===");
  console.log("Images sources :", v40.sourceImageCount);
  console.log("Unités documentaires :", units.length);
  console.log("Fichiers non affectés :", (v40.unassignedFiles || []).length);
  console.log("Agri San Juan 2018 confirmé : OUI");
  console.log("Série Agri San Juan :", agriYears.join(", "));
  console.log("21.23 = preuve contractuelle primaire : OUI");
  console.log("21.25 = correspondance préparatoire : OUI");
  console.log("OCR relancé : NON");
  console.log("Déplacement effectué : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
}

try { main(); }
catch (error) {
  console.error("ERREUR V41 :", error.message || error);
  process.exitCode = 1;
}
