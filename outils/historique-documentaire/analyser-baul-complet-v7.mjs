#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const here = path.dirname(fileURLToPath(import.meta.url));

function run(label, script, extraArgs = []) {
  console.log(`\n============================================================`);
  console.log(label);
  console.log(`============================================================\n`);

  const result = spawnSync(process.execPath, [path.join(here, script), ...extraArgs], {
    stdio: "inherit",
    env: process.env
  });

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${label} a échoué avec le code ${result.status}.`);
  }
}

function main() {
  console.log("=== FINCA MARIA — ANALYSE COMPLÈTE V7 ===");
  console.log("Étapes : OCR/lecture V2 -> contexte V3 -> consolidation V7");
  console.log("Le cache OCR est réutilisé automatiquement.");
  console.log("En cas d'interruption, les OCR déjà calculés restent dans le cache et ne seront pas perdus.");
  console.log("Aucun original ne sera déplacé, renommé ou classé.\n");

  run("ÉTAPE 1/3 — Lecture et extraction de masse", "analyser-baul-masse-v2.mjs");
  run("ÉTAPE 2/3 — Regroupement contextuel des dossiers", "analyser-baul-contextuel-v3.mjs");
  run("ÉTAPE 3/3 — Consolidation fiable faits / événements / chronologie / anomalies", "consolider-baul-v7.mjs");

  console.log("\n=== ANALYSE COMPLÈTE V7 TERMINÉE ===");
  console.log("Les résultats finaux sont les fichiers _V7 dans le BAÚL.");
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error("\nERREUR V7 :", error.message || error);
  process.exitCode = 1;
}
