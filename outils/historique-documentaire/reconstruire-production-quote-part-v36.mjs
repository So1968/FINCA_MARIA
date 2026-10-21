#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_NORMALISATION_PRODUCTION_SURFACES_V34.json");
const OUTPUT = path.join(ROOT, "_RECONSTRUCTION_PRODUCTION_QUOTE_PART_V36.json");
const REPORT = path.join(ROOT, "_RAPPORT_RECONSTRUCTION_PRODUCTION_QUOTE_PART_V36.md");

const MOTHER_SHARE_PCT = 15;
const MOTHER_SHARE = MOTHER_SHARE_PCT / 100;

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function round(v, digits = 2) {
  if (!Number.isFinite(v)) return null;
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

function main() {
  const base = readJson(INPUT);
  const rows = Array.isArray(base.normalizedCampaigns) ? base.normalizedCampaigns : [];

  const reconstructed = rows.map((row) => {
    const recordedKg = Number(row.oliveKg);
    const lowKgHa = Number(row?.kgOlivesPerHaRange?.lowUsingLargestDocumentedOliveArea);
    const highKgHa = Number(row?.kgOlivesPerHaRange?.highUsingSmallestDocumentedOliveArea);

    const estimatedWholeFincaKg = Number.isFinite(recordedKg)
      ? round(recordedKg / MOTHER_SHARE, 2)
      : null;

    return {
      campaign: row.campaign,
      kgRecordedInDocumentaryLayer: recordedKg,
      shareScenario: {
        sharePct: MOTHER_SHARE_PCT,
        provenance: "user_provided_family_context",
        interpretation: "Hypothèse de travail : les kg enregistrés au nom de la mère correspondent à sa quote-part de 15 % de la production totale de la finca. Cette relation doit être confirmée par les documents de propriété, partage, coopérative ou comptabilité avant d'être promue en fait documentaire."
      },
      estimatedWholeFincaKgIfShareApplies: estimatedWholeFincaKg,
      estimatedWholeFincaTonnesIfShareApplies: estimatedWholeFincaKg === null ? null : round(estimatedWholeFincaKg / 1000, 3),
      estimatedWholeFincaKgPerHaRangeIfShareApplies: Number.isFinite(lowKgHa) && Number.isFinite(highKgHa)
        ? {
            low: round(lowKgHa / MOTHER_SHARE, 2),
            high: round(highKgHa / MOTHER_SHARE, 2),
            unit: "kg_olives_par_ha_olivier",
            status: "scenario_quote_part__pas_total_documente"
          }
        : null,
      inFamilyMemory25to30tBand: estimatedWholeFincaKg !== null
        ? estimatedWholeFincaKg >= 25000 && estimatedWholeFincaKg <= 30000
        : null
    };
  });

  const inBand = reconstructed.filter(r => r.inFamilyMemory25to30tBand);
  const sorted = reconstructed
    .filter(r => Number.isFinite(r.estimatedWholeFincaKgIfShareApplies))
    .slice()
    .sort((a,b) => b.estimatedWholeFincaKgIfShareApplies - a.estimatedWholeFincaKgIfShareApplies);

  const payload = {
    version: 36,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Ajouter une couche de scénario fondée sur la quote-part familiale de 15 % attribuée à la mère, sans modifier les quantités documentées et sans présenter la production totale reconstruite comme un fait tant que la règle des 15 % n'est pas corroborée par une pièce.",
    shareContext: {
      motherSharePct: MOTHER_SHARE_PCT,
      provenance: "user_provided_family_context",
      documentaryStatus: "a_corroborrer",
      formula: "production_totale_estimee = kg_documentes / 0.15"
    },
    reconstructedCampaigns: reconstructed,
    summary: {
      campaignsReconstructed: reconstructed.length,
      campaignsIn25to30tScenarioBand: inBand.map(r => ({
        campaign: r.campaign,
        kgRecorded: r.kgRecordedInDocumentaryLayer,
        estimatedWholeFincaKg: r.estimatedWholeFincaKgIfShareApplies
      })),
      highestScenario: sorted[0] || null,
      lowestScenario: sorted.at(-1) || null,
      interpretation: "Cette couche peut expliquer pourquoi des quantités documentées de quelques tonnes coexistent avec une mémoire familiale de productions de l'ordre de 25 à 30 tonnes, mais uniquement si les kg documentés représentent effectivement 15 % du total."
    },
    exclusions: {
      campaign2015_2016: "non reconstruite ici car V34 l'exclut tant que les groupes 3854 kg et 9064 kg ne sont pas résolus",
      campaign2024_2025: "non reconstruite ici car V34 ne la normalise pas encore avec une surface contemporaine précise"
    },
    safeguards: {
      documentedKgLeftUntouched: true,
      userProvidedShareKeptSeparateFromDocumentProof: true,
      noAutomaticPromotionToCanonicalTotal: true,
      unresolved2015_2016NotForcedIntoScenario: true,
      noOriginalModified: true,
      noClassifiedCopyModified: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Reconstruction production / quote-part V36",
    "",
    `Contexte familial saisi : la mère reçoit **${MOTHER_SHARE_PCT} %** de la production. V36 teste donc le scénario où les kg documentés dans la couche coopérative représentent cette quote-part. Ce scénario reste séparé de la preuve documentaire jusqu'à corroboration.`,
    "",
    "## Campagnes reconstruites en scénario 15 %",
    "",
    ...reconstructed.map(r => `- **${r.campaign}** : ${r.kgRecordedInDocumentaryLayer} kg documentés → **${r.estimatedWholeFincaKgIfShareApplies} kg (${r.estimatedWholeFincaTonnesIfShareApplies} t)** pour l'ensemble de la finca si ces kg représentent exactement 15 %.`),
    "",
    "## Correspondance avec la mémoire familiale 25–30 t",
    "",
    ...(inBand.length
      ? inBand.map(r => `- **${r.campaign}** : ${r.kgRecordedInDocumentaryLayer} kg documentés → **${r.estimatedWholeFincaKgIfShareApplies} kg**, donc dans la bande 25–30 t.`)
      : ["- Aucune campagne de la couche V34 ne tombe dans cette bande avec l'hypothèse 15 %."]),
    "",
    "## Prudence",
    "",
    "Cette reconstruction ne modifie aucune quantité source. Elle ne dit pas encore que le compte Agri San Juan représente juridiquement ou comptablement 15 % de toute la production. Il faudra chercher une pièce qui relie explicitement cette quote-part aux kg enregistrés au nom de la mère.",
    "",
    "2015-2016 reste volontairement hors de cette reconstruction tant que la pièce 9 064 kg n'est pas résolue par contrôle visuel."
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — QUOTE-PART 15% V36 ===");
  console.log("Quote-part familiale utilisée comme scénario :", `${MOTHER_SHARE_PCT}%`);
  console.log("Campagnes reconstruites :", reconstructed.length);
  console.log("Campagnes tombant dans la bande 25-30 t :", inBand.length);
  for (const r of inBand) {
    console.log("  ", `${r.campaign} | ${r.kgRecordedInDocumentaryLayer} kg -> ${r.estimatedWholeFincaKgIfShareApplies} kg`);
  }
  console.log("Production totale promue en fait documentaire : NON");
  console.log("2015-2016 reconstruite : NON, groupe 9 064 kg encore non résolu");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try { main(); }
catch (error) {
  console.error("ERREUR V36 :", error.message || error);
  process.exitCode = 1;
}
