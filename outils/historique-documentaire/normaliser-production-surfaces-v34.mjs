#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const SURFACES_FILE = path.join(ROOT, "_CHRONOLOGIE_SURFACES_V33.json");
const PRODUCTION_FILE = path.join(ROOT, "_TABLEAU_HISTORIQUE_CAMPAGNES_V30.json");
const OUTPUT = path.join(ROOT, "_NORMALISATION_PRODUCTION_SURFACES_V34.json");
const REPORT = path.join(ROOT, "_RAPPORT_NORMALISATION_PRODUCTION_SURFACES_V34.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function round(v, digits = 2) {
  if (!Number.isFinite(v)) return null;
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

function campaignStart(campaign) {
  const m = String(campaign || "").match(/^(\d{4})-(\d{4})$/);
  return m ? Number(m[1]) : null;
}

function main() {
  const surfaces = readJson(SURFACES_FILE);
  const production = readJson(PRODUCTION_FILE);

  const evidence = Array.isArray(surfaces.evidence) ? surfaces.evidence : [];
  const e2002 = evidence.find(e => e.period === "2002" && e.sourceType === "cadastre_officiel");
  const e2017 = evidence.find(e => e.period === "2017" && e.sourceType === "cadastre_officiel");

  if (!e2002?.oliveHa || !e2017?.oliveHa) {
    throw new Error("Les deux références cadastrales officielles 2002 et 2017 avec surface oléicole sont nécessaires.");
  }

  const surfaceA = Number(e2002.oliveHa);
  const surfaceB = Number(e2017.oliveHa);
  const minOliveHa = Math.min(surfaceA, surfaceB);
  const maxOliveHa = Math.max(surfaceA, surfaceB);
  const midpoint = (minOliveHa + maxOliveHa) / 2;
  const surfaceSpreadPct = midpoint > 0 ? ((maxOliveHa - minOliveHa) / midpoint) * 100 : null;

  const exploitable = Array.isArray(production.exploitable) ? production.exploitable : [];
  const normalized = [];
  const excluded = [];

  for (const row of exploitable) {
    const start = campaignStart(row.campaign);
    const oliveKg = Number(row.oliveKg);
    if (!Number.isFinite(start) || !Number.isFinite(oliveKg)) continue;

    // V34 ne prétend pas connaître la surface exacte de chaque campagne.
    // Il calcule uniquement une fourchette de sensibilité entre deux surfaces officielles documentées.
    if (start >= 2007 && start <= 2018) {
      normalized.push({
        campaign: row.campaign,
        oliveKg,
        oilKg: Number.isFinite(Number(row.oilKg)) ? Number(row.oilKg) : null,
        yieldPct: Number.isFinite(Number(row.yieldPct)) ? Number(row.yieldPct) : null,
        kgOlivesPerHaRange: {
          lowUsingLargestDocumentedOliveArea: round(oliveKg / maxOliveHa, 2),
          highUsingSmallestDocumentedOliveArea: round(oliveKg / minOliveHa, 2),
          unit: "kg_olives_par_ha_olivier",
          status: "fourchette_de_sensibilite__pas_surface_annuelle_prouvee"
        },
        current180TreesScenarioOnly: {
          kgOlivesPerTree: round(oliveKg / 180, 2),
          status: "scenario_uniquement__180_est_un_nombre_actuel_fourni_par_la_famille__pas_un_nombre_historique_prouve"
        }
      });
    } else {
      excluded.push({
        campaign: row.campaign,
        reason: "hors_fenetre_de_sensibilite_2007_2018"
      });
    }
  }

  const oliveOnly = Array.isArray(production.oliveOnly) ? production.oliveOnly : [];
  for (const row of oliveOnly) {
    excluded.push({
      campaign: row.campaign,
      oliveKg: row.oliveKg,
      reason: "surface_oleicole_contemporaine_non_encore_extraite_avec_precision__pas_de_normalisation"
    });
  }

  const unresolved = Array.isArray(production.unresolved) ? production.unresolved : [];
  for (const row of unresolved) {
    excluded.push({
      campaign: row.campaign,
      reason: "production_non_resolue__notamment_groupe_9064kg_en_2015_2016"
    });
  }

  const ranked = normalized.slice().sort((a,b) => b.oliveKg - a.oliveKg);
  const highest = ranked[0] || null;
  const lowest = ranked.at(-1) || null;

  const payload = {
    version: 34,
    generatedAt: new Date().toISOString(),
    basedOn: {
      surfaces: SURFACES_FILE,
      production: PRODUCTION_FILE
    },
    purpose: "Normaliser prudemment les productions historiques par hectare d'oliveraie sans inventer une surface annuelle : utiliser comme test de sensibilité les deux surfaces oléicoles cadastrales officielles retrouvées (2002 et 2017).",
    surfaceEvidenceBracket: {
      official2002OliveHa: surfaceA,
      official2017OliveHa: surfaceB,
      minOliveHa,
      maxOliveHa,
      midpointOliveHa: round(midpoint, 4),
      spreadPctAroundMidpoint: round(surfaceSpreadPct, 2),
      interpretation: "Cette fourchette mesure l'incertitude liée aux deux états cadastraux officiels disponibles. Elle ne constitue pas une interpolation de surface entre 2002 et 2017."
    },
    normalizedCampaigns: normalized,
    excludedCampaigns: excluded,
    summary: {
      normalizedCampaignCount: normalized.length,
      excludedCount: excluded.length,
      highestOliveQuantityWithinNormalizedSet: highest ? {
        campaign: highest.campaign,
        oliveKg: highest.oliveKg,
        kgHaRange: highest.kgOlivesPerHaRange
      } : null,
      lowestOliveQuantityWithinNormalizedSet: lowest ? {
        campaign: lowest.campaign,
        oliveKg: lowest.oliveKg,
        kgHaRange: lowest.kgOlivesPerHaRange
      } : null,
      surfaceUncertaintyPct: round(surfaceSpreadPct, 2),
      conclusion: "Si les deux références cadastrales officielles encadrent raisonnablement la surface oléicole de la période, l'incertitude de surface est faible par rapport aux fortes variations de kilos d'olives entre campagnes. La surface seule ne peut donc pas expliquer les grands écarts observés. Cette conclusion reste un test de sensibilité, pas une preuve de causalité."
    },
    safeguards: {
      noAnnualSurfaceInterpolation: true,
      noSingleSurfaceAppliedAsFactToAllCampaigns: true,
      unresolved2015_2016Excluded: true,
      campaign2024_2025NotNormalizedWithoutContemporarySurface: true,
      current180TreeCountScenarioOnly: true,
      noCausalityClaim: true,
      originalsModified: false,
      classifiedCopiesModified: false
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Normalisation production / surfaces V34",
    "",
    "## Fourchette cadastrale officielle utilisée comme test de sensibilité",
    "",
    `- 2002 : **${surfaceA} ha d'oliviers**`,
    `- 2017 : **${surfaceB} ha d'oliviers**`,
    `- Écart relatif autour du point milieu : **${round(surfaceSpreadPct,2)} %**`,
    "",
    "Cette fourchette n'est pas une interpolation : V34 ne prétend pas connaître la surface exacte de chaque campagne.",
    "",
    "## Campagnes normalisées en fourchette kg/ha",
    "",
    ...normalized.map(r => `- **${r.campaign}** : ${r.oliveKg} kg olives → **${r.kgOlivesPerHaRange.lowUsingLargestDocumentedOliveArea} à ${r.kgOlivesPerHaRange.highUsingSmallestDocumentedOliveArea} kg/ha d'oliveraie**.`),
    "",
    "## Lecture",
    "",
    "L'écart entre les deux surfaces cadastrales officielles est limité. Il ne suffit donc pas, à lui seul, à expliquer les fortes variations de kilos d'olives constatées entre campagnes. Il faut poursuivre sur les facteurs de production, le nombre d'arbres réellement récoltés, les travaux, la météo et la complétude des apports.",
    "",
    "2015-2016 reste exclue tant que le groupe 9 064 kg n'est pas résolu. 2024-2025 n'est pas normalisée tant qu'une surface oléicole contemporaine précise n'est pas extraite de la PAC. Le scénario à 180 arbres est conservé comme contexte actuel, pas comme fait historique."
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — NORMALISATION SURFACES V34 ===");
  console.log("Surface oléicole officielle 2002 :", `${surfaceA} ha`);
  console.log("Surface oléicole officielle 2017 :", `${surfaceB} ha`);
  console.log("Écart relatif de la fourchette :", `${round(surfaceSpreadPct,2)}%`);
  console.log("Campagnes normalisées en fourchette :", normalized.length);
  if (highest) console.log("Plus forte production normalisée :", `${highest.campaign} | ${highest.oliveKg} kg | ${highest.kgOlivesPerHaRange.lowUsingLargestDocumentedOliveArea}-${highest.kgOlivesPerHaRange.highUsingSmallestDocumentedOliveArea} kg/ha`);
  if (lowest) console.log("Plus faible production normalisée :", `${lowest.campaign} | ${lowest.oliveKg} kg | ${lowest.kgOlivesPerHaRange.lowUsingLargestDocumentedOliveArea}-${lowest.kgOlivesPerHaRange.highUsingSmallestDocumentedOliveArea} kg/ha`);
  console.log("Surface exacte inventée par campagne : NON");
  console.log("2015-2016 exclue : OUI");
  console.log("2024-2025 normalisée : NON, surface contemporaine précise encore à extraire");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V34 :", error.message || error);
  process.exitCode = 1;
}
