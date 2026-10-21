#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const AUDIT = path.join(ROOT, "_AUDIT_SURFACES_PARCELLES_V32.json");
const OUTPUT = path.join(ROOT, "_CHRONOLOGIE_SURFACES_V33.json");
const REPORT = path.join(ROOT, "_RAPPORT_CHRONOLOGIE_SURFACES_V33.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function round(v, digits = 4) {
  if (!Number.isFinite(v)) return null;
  const p = 10 ** digits;
  return Math.round(v * p) / p;
}

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function findDoc(docs, fragment) {
  const f = norm(fragment);
  return docs.find(d => norm(d.originalName).includes(f)) || null;
}

function hasAll(text, parts) {
  const n = norm(text);
  return parts.every(p => n.includes(norm(p)));
}

function sourceRef(doc) {
  return doc ? {
    documentId: doc.documentId,
    originalName: doc.originalName,
    method: doc.method
  } : null;
}

function main() {
  const audit = readJson(AUDIT);
  const docs = Array.isArray(audit.documents) ? audit.documents : [];

  const d2002 = findDoc(docs, "19.22_1") || findDoc(docs, "19.22_2");
  const d2017p25 = findDoc(docs, "19.12_7");
  const d2017p27 = findDoc(docs, "19.12_9");
  const dRegistral = findDoc(docs, "19.18_1");
  const d2020 = findDoc(docs, "19.54");
  const d2024 = findDoc(docs, "18.47_16");

  const evidence = [];
  const alerts = [];

  // 2002 — cadastre/municipal list, official figures printed in hectares.
  if (d2002 && hasAll(d2002.fullText, ["Olivos secano", "1,8572", "3,6657", "Labor", "2,7317", "2,1976"])) {
    const olive = 1.8572 + 3.6657;
    const arable = 2.7317 + 2.1976;
    evidence.push({
      period: "2002",
      sourceType: "cadastre_officiel",
      confidence: "haute",
      scope: "parcelles_25_et_27",
      oliveHa: round(olive),
      arableHa: round(arable),
      pastureHa: null,
      knownTotalHa: round(olive + arable),
      note: "Le document 2002 liste les sous-parcelles oliviers et labour des parcelles 25 et 27. Il ne suffit pas, à lui seul, à expliquer toute la superficie cadastrale moderne.",
      source: sourceRef(d2002)
    });
  }

  // 2017 — two official cadastral sheets, parcel by parcel, in m².
  const ok25 = d2017p25 && hasAll(d2017p25.fullText, ["Poligono 185 Parcela 25", "Olivos secano", "20.009", "Labor", "34.924", "Pastos", "1.384"]);
  const ok27 = d2017p27 && hasAll(d2017p27.fullText, ["Poligono 185 Parcela 27", "Olivos secano", "36.657", "Labor", "21.977", "58.634"]);
  if (ok25 && ok27) {
    const olive = (20009 + 36657) / 10000;
    const arable = (34924 + 21977) / 10000;
    const pasture = 1384 / 10000;
    const total = olive + arable + pasture;
    evidence.push({
      period: "2017",
      sourceType: "cadastre_officiel",
      confidence: "haute",
      scope: "parcelles_25_et_27",
      oliveHa: round(olive),
      arableHa: round(arable),
      pastureHa: round(pasture),
      knownTotalHa: round(total),
      oliveSharePct: round((olive / total) * 100, 2),
      arableSharePct: round((arable / total) * 100, 2),
      pastureSharePct: round((pasture / total) * 100, 2),
      parcel25: { oliveHa: 2.0009, arableHa: 3.4924, pastureHa: 0.1384, totalHa: 5.6317 },
      parcel27: { oliveHa: 3.6657, arableHa: 2.1977, pastureHa: 0, totalHa: 5.8634 },
      note: "C'est la première répartition moderne complète retrouvée qui permet de distinguer sans ambiguïté olivier, labour et pâture.",
      sources: [sourceRef(d2017p25), sourceRef(d2017p27)]
    });
  }

  // Registral description — keep distinct, because it describes a legal finca and not necessarily the same cadastral breakdown/date.
  if (dRegistral && hasAll(dRegistral.fullText, ["ONCE HECTÁREAS", "seis", "hectáreas", "olivar", "monte alto", "cereal secano"])) {
    const total = 11.3933;
    const olive = 6.9767;
    const monte = 0.3130;
    const cereal = round(total - olive - monte);
    evidence.push({
      period: "date_du_document_a_confirmer",
      sourceType: "description_registrale_officielle",
      confidence: "haute_sur_les_valeurs__date_a_confirmer",
      scope: "finca_registrale",
      oliveHa: olive,
      cerealHa: cereal,
      monteAltoHa: monte,
      knownTotalHa: total,
      note: "Cette description registrale ne doit pas être écrasée par le cadastre moderne : elle atteste une répartition historique différente ou une définition foncière différente. La date exacte de validité de cette description doit être rattachée au dossier registral avant usage par campagne.",
      source: sourceRef(dRegistral)
    });
  }

  // 2020 family reconstruction — secondary source only.
  if (d2020 && hasAll(d2020.fullText, ["RECINTOS PARCELAS 25", "PAC", "Olivar", "Tierras arables"])) {
    evidence.push({
      period: "2020",
      sourceType: "reconstruction_familiale_secondaire",
      confidence: "moyenne",
      scope: "recintos_PAC_parcelles_25_27",
      valuesStatus: "ne_pas_agreger_automatiquement",
      note: "Le tableau familial contient plusieurs recintos et valeurs PAC mais l'OCR mélange les colonnes. Il est conservé comme source secondaire à rapprocher du document PAC original, sans remplacer le cadastre.",
      source: sourceRef(d2020)
    });
  }

  // 2024 PAC summary — strong source but OCR currently insufficient for all numbers.
  if (d2024 && hasAll(d2024.fullText, ["RESUMEN SUPERFICIES", "OLIVO HOJIBLANCA", "TRITICALE"])) {
    evidence.push({
      period: "2024",
      sourceType: "PAC_officiel",
      confidence: "haute_sur_usages__surfaces_a_extraire",
      scope: "exploitation_declaree_PAC",
      cropsConfirmed: ["OLIVO_HOJIBLANCA", "TRITICALE"],
      valuesStatus: "surfaces_precises_a_relire_visuellement_si_necessaire",
      note: "La PAC 2024 confirme simultanément olivier Hojiblanca et triticale. Les valeurs numériques complètes ne sont pas retenues depuis cet OCR tant que les colonnes n'ont pas été lues proprement.",
      source: sourceRef(d2024)
    });
  }

  if (!evidence.some(e => e.period === "2017")) {
    alerts.push("Répartition cadastrale 2017 complète non reconstituée automatiquement : contrôle manuel nécessaire.");
  }
  if (!evidence.some(e => e.period === "2002")) {
    alerts.push("Répartition cadastrale 2002 non reconstituée automatiquement : contrôle manuel nécessaire.");
  }

  const modern = evidence.find(e => e.period === "2017" && e.sourceType === "cadastre_officiel") || null;
  const densityAt180 = modern?.oliveHa ? round(180 / modern.oliveHa, 2) : null;

  const payload = {
    version: 33,
    generatedAt: new Date().toISOString(),
    basedOn: AUDIT,
    purpose: "Construire une chronologie des surfaces et usages de la finca à partir des preuves déjà relues, sans assimiler la surface totale à la surface oléicole et sans appliquer une surface unique à toutes les campagnes historiques.",
    evidence,
    modernReference: modern ? {
      period: modern.period,
      oliveHa: modern.oliveHa,
      arableHa: modern.arableHa,
      pastureHa: modern.pastureHa,
      totalHa: modern.knownTotalHa,
      oliveTreesUserProvidedCurrentCount: 180,
      treesPerOliveHaIfCurrentCountApplied: densityAt180,
      caveat: "Le nombre de 180 arbres est une donnée familiale actuelle. Il ne doit pas être supposé identique pour toutes les campagnes historiques sans preuve."
    } : null,
    alerts,
    safeguards: {
      totalAreaNeverUsedAsOliveArea: true,
      noSurfaceInterpolatedBetweenDates: true,
      noKgPerHaByCampaignYet: true,
      userProvidedTreeCountKeptSeparateFromDocumentProof: true,
      secondaryFamilyReconstructionNotPromotedToPrimaryEvidence: true,
      originalsModified: false,
      classifiedCopiesModified: false
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Chronologie des surfaces V33",
    "",
    "## Principe",
    "",
    "La finca n'est pas traitée comme 11,5 ha d'oliviers. Chaque source conserve sa date, son type de preuve et sa propre répartition. Aucune surface n'est interpolée entre deux dates.",
    "",
    "## Sources reconstruites",
    ""
  ];

  for (const e of evidence) {
    lines.push(`### ${e.period} — ${e.sourceType}`);
    if (Number.isFinite(e.oliveHa)) lines.push(`- Olivier : **${e.oliveHa} ha**`);
    if (Number.isFinite(e.arableHa)) lines.push(`- Terre labourable : **${e.arableHa} ha**`);
    if (Number.isFinite(e.cerealHa)) lines.push(`- Céréales : **${e.cerealHa} ha**`);
    if (Number.isFinite(e.pastureHa)) lines.push(`- Pâture : **${e.pastureHa} ha**`);
    if (Number.isFinite(e.monteAltoHa)) lines.push(`- Monte alto : **${e.monteAltoHa} ha**`);
    if (Number.isFinite(e.knownTotalHa)) lines.push(`- Total décrit : **${e.knownTotalHa} ha**`);
    if (e.cropsConfirmed) lines.push(`- Cultures confirmées : **${e.cropsConfirmed.join(", ")}**`);
    lines.push(`- Statut : ${e.note}`, "");
  }

  if (modern) {
    lines.push("## Référence cadastrale moderne complète", "");
    lines.push(`- Olivier : **${modern.oliveHa} ha (${modern.oliveSharePct} %)**`);
    lines.push(`- Labour : **${modern.arableHa} ha (${modern.arableSharePct} %)**`);
    lines.push(`- Pâture : **${modern.pastureHa} ha (${modern.pastureSharePct} %)**`);
    lines.push(`- Total : **${modern.knownTotalHa} ha**`);
    lines.push(`- Avec 180 arbres actuels : **${densityAt180} arbres/ha d'oliveraie**, donnée de contexte familiale et non constante historique prouvée.`, "");
  }

  lines.push("## Étape suivante autorisée", "");
  lines.push("Les campagnes de production pourront être normalisées en kg/ha seulement lorsqu'une surface oléicole est rattachable à la période concernée. Le calcul kg/arbre restera également conditionné à la preuve ou à l'hypothèse explicitement étiquetée du nombre d'arbres pour la période.");

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CHRONOLOGIE SURFACES V33 ===");
  console.log("Sources de surface retenues :", evidence.length);
  if (modern) {
    console.log("Référence moderne complète :", `${modern.period} | olivier ${modern.oliveHa} ha | labour ${modern.arableHa} ha | pâture ${modern.pastureHa} ha`);
    console.log("Part oléicole :", `${modern.oliveSharePct}%`);
    console.log("Densité avec 180 arbres actuels :", `${densityAt180} arbres/ha`);
  }
  const historic = evidence.find(e => e.sourceType === "description_registrale_officielle");
  if (historic) console.log("Description registrale distincte :", `olivier ${historic.oliveHa} ha | céréales ${historic.cerealHa} ha | monte ${historic.monteAltoHa} ha`);
  console.log("Surface unique appliquée à toutes les campagnes : NON");
  console.log("Calcul kg/ha par campagne effectué : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V33 :", error.message || error);
  process.exitCode = 1;
}
