#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const V18 = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const V22 = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V22.json");
const OUTPUT = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V24.json");
const CORRECTIONS = path.join(ROOT, "_CORRECTIONS_LIQUIDATION_2016_V24.json");
const REPORT = path.join(ROOT, "_RAPPORT_CORRECTION_LIQUIDATION_2016_V24.md");

const TARGET = "CamScanner 14-08-2026 21.30_25.jpg";

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function validCampaign(value) {
  if (!value) return true;
  const m = String(value).match(/^((?:19|20)\d{2})-((?:19|20)\d{2})$/);
  return !!(m && Number(m[2]) === Number(m[1]) + 1);
}

function main() {
  const v18 = readJson(V18);
  const v22 = readJson(V22);
  const observations = structuredClone(Array.isArray(v22.observations) ? v22.observations : []);
  const sourceDoc = (v18.documents || []).find((d) => d.originalName === TARGET);
  const obs = observations.find((o) => o.document === TARGET);

  if (!sourceDoc) throw new Error(`Document source introuvable dans V18 : ${TARGET}`);
  if (!obs) throw new Error(`Observation introuvable dans V22 : ${TARGET}`);

  const before = {
    date: obs.date || sourceDoc.date || "",
    campaign: obs.campaign || "",
    campaignSource: obs.campaignSource || "",
    campaignConfidence: obs.campaignConfidence || 0,
    facts: structuredClone(obs.facts || {}),
    parsedFromText: structuredClone(obs.parsedFromText || {}),
    recoveredFactKeys: structuredClone(obs.recoveredFactKeys || [])
  };

  // Audit humain + OCR multi-modes effectué le 16/08/2026 sur l'original privé.
  // Les lectures concordent sur 14/04/2016, la campagne 2015-2016 et 9 064 kg d'olives.
  // Le poids d'huile reste ambigu graphiquement : il est volontairement retiré des faits fiables.
  obs.date = "2016-04-14";
  obs.campaign = "2015-2016";
  obs.campaignSource = "audit_ocr_multimode_2016";
  obs.campaignConfidence = 0.99;
  obs.explicitCampaign = "2015-2016";
  obs.explicitCampaignEvidence = "Concepto/periodo OCR multi-modes compatible avec CPÑA 15/16 et 01/11/2015-14/04/2016";

  obs.facts = {
    oliveKg: 9064,
    yieldPct: 21.4,
    acidity: 0.22,
    grossLiquidation: 662.69,
    taxBase: 662.69
  };

  obs.parsedFromText = {
    oliveKg: 9064,
    yieldPct: 21.4,
    acidity: 0.22,
    grossLiquidation: 662.69,
    taxBase: 662.69
  };

  obs.recoveredFactKeys = ["oliveKg", "yieldPct", "acidity", "grossLiquidation", "taxBase"];
  obs.factProvenance = {
    oliveKg: { status: "document_lisible", confidence: 0.99, evidence: "Kg Aceituna 9.064" },
    yieldPct: { status: "document_lisible_ocr_multimode", confidence: 0.9, evidence: "Rdto ~21,40" },
    acidity: { status: "document_lisible_ocr_multimode", confidence: 0.9, evidence: "Acidez 0,22 ; distinct de Penaliza/Bonif Acidez 0,00" },
    grossLiquidation: { status: "document_lisible_et_coherent", confidence: 0.99, evidence: "Bruto Liquidaciones/Base Imponible 662,69 ; Total Base + IVA 742,21" },
    taxBase: { status: "document_lisible_et_coherent", confidence: 0.99, evidence: "Base Imponible 662,69" },
    oilKg: { status: "a_verifier_visuellement", confidence: 0, evidence: "OCR divergent : valeur imprimée non suffisamment sûre" }
  };
  obs.needsReview = true;
  obs.reviewReasons = [
    "Kg d'huile non fiabilisés : ne pas utiliser pour calcul de rendement ou total annuel avant contrôle visuel.",
    "Le fichier classé porte encore un ancien nom avec 2010-04-14 ; V24 ne renomme ni ne déplace aucun fichier."
  ];
  obs.productionFingerprint = "9064|?|21.4";

  const invalidBefore = (v22.observations || [])
    .filter((o) => o.campaign && !validCampaign(o.campaign))
    .map((o) => ({ document: o.document, campaign: o.campaign }));
  const invalidAfter = observations
    .filter((o) => o.campaign && !validCampaign(o.campaign))
    .map((o) => ({ document: o.document, campaign: o.campaign }));

  if (invalidAfter.length) {
    throw new Error(`Campagne(s) impossible(s) encore présente(s) après V24 : ${JSON.stringify(invalidAfter)}`);
  }

  const payload = {
    ...v22,
    version: 24,
    generatedAt: new Date().toISOString(),
    basedOn: { v22: V22, v18DocumentSource: V18 },
    purpose: "Corriger l'anomalie auditée de la liquidation du 14/04/2016, neutraliser les faux faits issus du décalage OCR des colonnes et refuser toute campagne au format chronologiquement impossible dans cette couche analytique.",
    observations,
    v24Audit: {
      targetDocument: TARGET,
      invalidCampaignsBefore: invalidBefore,
      invalidCampaignsAfter: invalidAfter,
      oilKgStatus: "a_verifier_visuellement",
      originalsModified: false,
      classifiedCopiesModified: false
    }
  };

  writeJson(OUTPUT, payload);
  writeJson(CORRECTIONS, {
    generatedAt: payload.generatedAt,
    document: TARGET,
    before,
    after: {
      date: obs.date,
      campaign: obs.campaign,
      campaignSource: obs.campaignSource,
      campaignConfidence: obs.campaignConfidence,
      facts: obs.facts,
      factProvenance: obs.factProvenance,
      needsReview: obs.needsReview,
      reviewReasons: obs.reviewReasons
    },
    invalidCampaignsBefore: invalidBefore,
    invalidCampaignsAfter: invalidAfter
  });

  const lines = [
    "# FINCA MARIA — Correction liquidation 2016 V24",
    "",
    `- Document : **${TARGET}**`,
    `- Date corrigée : **${obs.date}**`,
    `- Campagne corrigée : **${obs.campaign}**`,
    `- Kg olives fiables : **${obs.facts.oliveKg}**`,
    `- Rendement lu : **${obs.facts.yieldPct} %** (confiance moyenne/forte, à conserver avec provenance)`,
    `- Acidez lue : **${obs.facts.acidity}**`,
    `- Bruto/Base : **${obs.facts.grossLiquidation} €**`,
    `- Kg huile : **À VÉRIFIER VISUELLEMENT**`,
    `- Campagnes impossibles avant V24 : **${invalidBefore.length}**`,
    `- Campagnes impossibles après V24 : **${invalidAfter.length}**`,
    "",
    "V24 ne renomme, ne déplace et ne modifie aucun original ni copie classée."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CORRECTION LIQUIDATION 2016 V24 ===");
  console.log("Document :", TARGET);
  console.log("Date :", `${before.date || "?"} -> ${obs.date}`);
  console.log("Campagne :", `${before.campaign || "?"} -> ${obs.campaign}`);
  console.log("Kg olives fiables :", obs.facts.oliveKg);
  console.log("Rendement lu :", obs.facts.yieldPct);
  console.log("Acidez lue :", obs.facts.acidity);
  console.log("Bruto/Base :", obs.facts.grossLiquidation);
  console.log("Kg huile : A_VERIFIER_VISUELLEMENT");
  console.log("Campagnes impossibles :", `${invalidBefore.length} -> ${invalidAfter.length}`);
  console.log("Sortie :", OUTPUT);
  console.log("Corrections :", CORRECTIONS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V24 :", error.message || error);
  process.exitCode = 1;
}
