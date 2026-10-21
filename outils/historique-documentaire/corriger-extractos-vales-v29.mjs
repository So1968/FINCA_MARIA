#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const BASE = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V25.json");
const OUTPUT = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V29.json");
const REPORT = path.join(ROOT, "_RAPPORT_CORRECTIONS_EXTRACTOS_V29.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function getCampaign(base, campaign) {
  const c = (base.campaigns || []).find((x) => x.campaign === campaign);
  if (!c) throw new Error(`Campagne absente : ${campaign}`);
  return c;
}

function getGroup(campaign, id) {
  const g = (campaign.productionEvidence || []).find((x) => x.evidenceGroupId === id);
  if (!g) throw new Error(`Groupe absent ${campaign.campaign} : ${id}`);
  return g;
}

function mergeGroups(campaign, keepId, removeId, auditedFacts, audit) {
  const keep = getGroup(campaign, keepId);
  const remove = getGroup(campaign, removeId);

  keep.facts = { ...(keep.facts || {}), ...auditedFacts };
  keep.documents = unique([...(keep.documents || []), ...(remove.documents || [])]);
  keep.documentTypes = unique([...(keep.documentTypes || []), ...(remove.documentTypes || [])]);
  keep.campaignSources = unique([...(keep.campaignSources || []), ...(remove.campaignSources || [])]);
  keep.quantitativeFields = unique([
    ...(keep.quantitativeFields || []),
    ...(remove.quantitativeFields || []),
    ...Object.keys(auditedFacts).filter((k) => ["oliveKg", "oilKg", "yieldPct", "acidity"].includes(k))
  ]);
  keep.provenance = [...(keep.provenance || []), ...(remove.provenance || [])];
  keep.evidenceCount = unique(keep.documents).length;
  keep.completeness = ["oliveKg", "oilKg", "yieldPct"].every((k) => Number.isFinite(Number(keep.facts?.[k])))
    ? "olive_huile_rendement"
    : "production_partielle";
  keep.sameUnderlyingProductionFact = true;
  keep.doNotSumEvidenceDocuments = true;
  keep.auditedExtractionCorrectionV29 = audit;

  campaign.productionEvidence = (campaign.productionEvidence || []).filter((g) => g.evidenceGroupId !== removeId);
  campaign.productionEvidenceGroups = campaign.productionEvidence.length;
}

function updateGroup(campaign, id, auditedFacts, audit) {
  const group = getGroup(campaign, id);
  group.facts = { ...(group.facts || {}), ...auditedFacts };
  group.quantitativeFields = unique([
    ...(group.quantitativeFields || []),
    ...Object.keys(auditedFacts).filter((k) => ["oliveKg", "oilKg", "yieldPct", "acidity"].includes(k))
  ]);
  group.completeness = ["oliveKg", "oilKg", "yieldPct"].every((k) => Number.isFinite(Number(group.facts?.[k])))
    ? "olive_huile_rendement"
    : "production_partielle";
  group.auditedExtractionCorrectionV29 = audit;
}

function main() {
  const source = readJson(BASE);
  const base = structuredClone(source);
  const corrections = [];

  // 2009-2010 : le vale 1 114 kg est une ligne d'apport comprise dans le total 2 537 kg.
  {
    const c = getCampaign(base, "2009-2010");
    mergeGroups(c, "2009-2010__V25P04", "2009-2010__V25P03",
      { oliveKg: 2537, oilKg: 520.98, yieldPct: 20.5353 },
      {
        status: "audite_manuellement",
        rule: "ligne_apport_incluse_dans_total_extracto",
        note: "1114 kg + 1423 kg = 2537 kg ; ne pas additionner 1114 au total 2537.",
        sourceDocuments: ["CamScanner 14-08-2026 21.19_3.jpg", "CamScanner 14-08-2026 21.20_2.jpg", "CamScanner 14-08-2026 21.20_4.jpg"]
      });
    corrections.push({ campaign: "2009-2010", action: "fusion_ligne_dans_total", canonical: { oliveKg: 2537, oilKg: 520.98, yieldPct: 20.5353 } });
  }

  // 2012-2013 : utiliser les totaux de l'Extracto, pas la première ligne de vale.
  {
    const c = getCampaign(base, "2012-2013");
    mergeGroups(c, "2012-2013__V25P10", "2012-2013__V25P11",
      { oliveKg: 2174, oilKg: 390.25, yieldPct: 17.9508, acidity: 0 },
      {
        status: "audite_manuellement",
        rule: "total_extracto_prioritaire_sur_ligne_vale",
        evidence: "Agrupación: 3 vales, 2174 kg aceituna, 390,25 kg aceite, 17,9508 %, acidez 0,00",
        sourceDocument: "CamScanner 14-08-2026 21.24_18.jpg"
      });
    corrections.push({ campaign: "2012-2013", action: "fusion_extracto_total", canonical: { oliveKg: 2174, oilKg: 390.25, yieldPct: 17.9508, acidity: 0 } });
  }

  // 2013-2014 : le total Agrupación est 3463 / 696,14 / 20,1022.
  {
    const c = getCampaign(base, "2013-2014");
    mergeGroups(c, "2013-2014__V25P09", "2013-2014__V25P08",
      { oliveKg: 3463, oilKg: 696.14, yieldPct: 20.1022, acidity: 0.04 },
      {
        status: "audite_manuellement",
        rule: "total_agrupacion_prioritaire_sur_ligne_vale",
        evidence: "Agrupación: 5 vales, 3463 kg aceituna, 696,14 kg aceite, 20,1022 %, acidez 0,04",
        sourceDocument: "CamScanner 14-08-2026 21.24_8.jpg"
      });
    corrections.push({ campaign: "2013-2014", action: "fusion_extracto_total", canonical: { oliveKg: 3463, oilKg: 696.14, yieldPct: 20.1022, acidity: 0.04 } });
  }

  // 2015-2016 : l'Extracto prouve 3854 / 828,37 / 21,4938. Le groupe 9064 reste séparé et à contrôler visuellement.
  {
    const c = getCampaign(base, "2015-2016");
    mergeGroups(c, "2015-2016__V25P18", "2015-2016__V25P17",
      { oliveKg: 3854, oilKg: 828.37, yieldPct: 21.4938, acidity: 0.22 },
      {
        status: "audite_manuellement",
        rule: "total_extracto_prioritaire_sur_ligne_vale",
        evidence: "Total Vales: 6 ; 3854 kg aceituna ; 828,37 kg aceite ; 21,4938 % ; acidez 0,22",
        sourceDocument: "CamScanner 14-08-2026 21.30_18.jpg"
      });
    const unresolved = getGroup(c, "2015-2016__V25P19");
    unresolved.needsVisualReview = true;
    unresolved.reviewReason = "Le document 21.30_25 indique 9064 kg avec rendement ~21,4 %, mais son OCR reste ambigu. Ne pas fusionner avec le total Extracto 3854 kg sans contrôle visuel du document source.";
    corrections.push({ campaign: "2015-2016", action: "fusion_extracto_total_et_conservation_groupe_9064", canonicalExtracto: { oliveKg: 3854, oilKg: 828.37, yieldPct: 21.4938, acidity: 0.22 }, unresolvedGroup: "2015-2016__V25P19" });
  }

  // 2016-2017 : 1056 kg est une ligne de vale comprise dans le total 1722 kg.
  {
    const c = getCampaign(base, "2016-2017");
    mergeGroups(c, "2016-2017__V25P15", "2016-2017__V25P16",
      { oliveKg: 1722, oilKg: 390.26, yieldPct: 22.6632, acidity: 0 },
      {
        status: "audite_manuellement",
        rule: "ligne_vale_incluse_dans_total_extracto",
        evidence: "Total Vales: 2 ; 1722 kg aceituna ; 390,26 kg aceite ; 22,6632 % ; acidez 0,00",
        sourceDocument: "CamScanner 14-08-2026 21.30_14.jpg"
      });
    corrections.push({ campaign: "2016-2017", action: "fusion_extracto_total", canonical: { oliveKg: 1722, oilKg: 390.26, yieldPct: 22.6632, acidity: 0 } });
  }

  // 2018-2019 : 18,2811 était le rendement brut, pas des kg d'huile ; l'huile totale est 289,36 kg.
  {
    const c = getCampaign(base, "2018-2019");
    updateGroup(c, "2018-2019__V25P02",
      { oliveKg: 1590, oilKg: 289.36, yieldPct: 18.1987, acidity: 0 },
      {
        status: "audite_manuellement",
        rule: "correction_colonnes_extracto",
        evidence: "Agrupación: 3 vales, 1590 kg aceituna, 289,36 kg aceite, 18,1987 %, acidez 0,00",
        sourceDocument: "CamScanner 14-08-2026 21.17_2.jpg",
        replacedMisread: { oilKg: 18.2811 }
      });
    corrections.push({ campaign: "2018-2019", action: "correction_colonnes", canonical: { oliveKg: 1590, oilKg: 289.36, yieldPct: 18.1987, acidity: 0 } });
  }

  const multiGroupCampaigns = (base.campaigns || [])
    .filter((c) => (c.productionEvidence || []).length > 1)
    .map((c) => ({ campaign: c.campaign, groups: c.productionEvidence.map((g) => g.evidenceGroupId) }));

  const unresolved2015 = multiGroupCampaigns.find((x) => x.campaign === "2015-2016") || null;

  const output = {
    ...base,
    version: 29,
    generatedAt: new Date().toISOString(),
    basedOn: BASE,
    correctionsV29: corrections,
    summaryV29: {
      auditedCampaignCorrections: corrections.length,
      campaignsWithMultipleProductionGroupsRemaining: multiGroupCampaigns.length,
      multiGroupCampaigns,
      unresolved2015_2016: unresolved2015,
      annualTotalsCalculated: false
    },
    safeguardsV29: {
      noBlindSummation: true,
      extractoTotalPreferredOverIndividualValeWhenSameDocument: true,
      unresolved9064KgPreservedForVisualReview: true,
      originalsModified: false,
      classifiedCopiesModified: false
    }
  };

  writeJson(OUTPUT, output);

  const lines = [
    "# FINCA MARIA — Corrections Extracto Vales V29",
    "",
    "Les valeurs ci-dessous proviennent d'une relecture ciblée des lignes Total/Agrupación des Extracto Vales. Les lignes individuelles de vale ne sont plus traitées comme des productions distinctes lorsqu'elles sont incluses dans le total du même document.",
    "",
    ...corrections.map((c) => `- **${c.campaign}** : ${c.action}.`),
    "",
    `Campagnes encore multi-groupes : **${multiGroupCampaigns.length}**.`,
    ...(multiGroupCampaigns.length ? multiGroupCampaigns.map((x) => `- ${x.campaign} : ${x.groups.join(", ")}`) : ["- Aucune."]),
    "",
    "Le groupe 2015-2016 à 9 064 kg reste volontairement non fusionné tant que le document 21.30_25 n'a pas été contrôlé visuellement.",
    "",
    "Aucun total annuel définitif n'est calculé. Aucun original ni copie classée n'est modifié."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CORRECTIONS EXTRACTO VALES V29 ===");
  console.log("Corrections auditées :", corrections.length);
  console.log("2009-2010 consolidé à 2 537 kg : OUI");
  console.log("2012-2013 total Extracto : 2 174 kg | 390,25 kg huile | 17,9508 %");
  console.log("2013-2014 total Extracto : 3 463 kg | 696,14 kg huile | 20,1022 %");
  console.log("2015-2016 total Extracto : 3 854 kg | 828,37 kg huile | 21,4938 %");
  console.log("2016-2017 total Extracto : 1 722 kg | 390,26 kg huile | 22,6632 %");
  console.log("2018-2019 total Extracto : 1 590 kg | 289,36 kg huile | 18,1987 %");
  console.log("Campagnes multi-groupes restantes :", multiGroupCampaigns.length);
  console.log("2015-2016 / groupe 9 064 kg conservé pour contrôle visuel :", unresolved2015 ? "OUI" : "NON");
  console.log("Totaux annuels définitifs calculés : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V29 :", error.message || error);
  process.exitCode = 1;
}
