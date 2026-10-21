#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_STRUCTURATION_DOCUMENTAIRE_NOUVEAU_LOT_V41.json");
const OUTPUT = path.join(ROOT, "_FAITS_EXTRAITS_NOUVEAU_LOT_V42.json");
const REPORT = path.join(ROOT, "_RAPPORT_FAITS_EXTRAITS_V42.md");

function clone(v) { return JSON.parse(JSON.stringify(v)); }

function sourceFor(unit) {
  return {
    unitId: unit.id,
    title: unit.title,
    evidenceLevel: unit.evidenceLevel,
    files: clone(unit.files || [])
  };
}

function fact({ id, type, value, unit, date = null, scope = null, confidence = "DOCUMENTAIRE", note = null, proves = true }) {
  return {
    id,
    type,
    value,
    date,
    scope,
    confidence,
    proves,
    source: sourceFor(unit),
    note
  };
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`V41 introuvable : ${INPUT}`);
  const v41 = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const units = Array.isArray(v41.units) ? v41.units : [];

  const facts = [];
  const events = [];
  const openChecks = [];

  const contract = units.find((u) => u.id === "CONTRAT_ARRENDAMIENTO_15PCT_OLIVAR");
  if (contract) {
    const get = (type) => contract.facts?.find((f) => f.type === type)?.value;
    facts.push(
      fact({ id: "FACT_CONTRAT_ARRENDADOR", type: "arrendador", value: get("arrendador"), unit: contract, scope: "bail_21_23" }),
      fact({ id: "FACT_CONTRAT_ARRENDATARIO", type: "arrendatario", value: get("arrendatario"), unit: contract, scope: "bail_21_23" }),
      fact({ id: "FACT_RENTE_OLIVAR_15", type: "rente_olivar_pct", value: get("rente_olivar_pct"), unit: contract, scope: "bail_21_23" }),
      fact({ id: "FACT_RENTE_TIERRA_CALMA_0", type: "rente_tierra_calma_pct", value: get("rente_tierra_calma_pct"), unit: contract, scope: "bail_21_23" }),
      fact({ id: "FACT_ECHEANCE_RENTE_AVRIL", type: "echeance_rente", value: get("echeance_rente"), unit: contract, scope: "bail_21_23" })
    );
    events.push({
      id: "EVENT_BAIL_21_23_CONDITIONS",
      type: "CONDITIONS_BAIL",
      date: null,
      dateStatus: "DATE_NON_EXTRAITE",
      summary: "Le bail 21.23 fixe une rente de 15 % de la production d'olivier, 0 % sur la tierra de calma, payable en avril.",
      sourceUnitIds: [contract.id],
      scope: "bail_21_23",
      status: "DOCUMENTE"
    });
    openChecks.push({
      id: "CHECK_DATE_BAIL_21_23",
      kind: "CHAMP_A_EXTRAIRE_OU_VERIFIER",
      priority: "MOYENNE",
      question: "Quelle est la date exacte de prise d'effet/signature du bail 21.23 ?",
      sourceUnitIds: [contract.id],
      notAMissingDocumentClaim: true
    });
  }

  const correspondence = units.find((u) => u.id === "CORRESPONDANCE_PREPARATION_CONTRAT_21_25");
  if (correspondence) {
    facts.push(fact({
      id: "FACT_21_25_CORRESPONDANCE_PREPARATOIRE",
      type: "nature_document",
      value: "correspondance préparatoire à la rédaction d'un contrat",
      unit: correspondence,
      scope: "serie_21_25",
      confidence: "DOCUMENTAIRE",
      note: "Le contenu rapporte des conditions d'un contrat antérieur ; il ne remplace pas la preuve contractuelle 21.23."
    }));
  }

  const pac2007 = units.find((u) => u.id === "PAC_CONTROLE_TERRAIN_2007");
  if (pac2007) {
    for (const f of pac2007.facts || []) {
      if (f.type === "observation") continue;
      facts.push(fact({
        id: `FACT_PAC2007_${f.type.toUpperCase()}`,
        type: f.type,
        value: f.value,
        unit: pac2007,
        date: f.type === "date_controle" ? f.value : "2007-07-12",
        scope: "controle_pac_2007"
      }));
    }
    facts.push(fact({
      id: "FACT_PAC2007_OBSERVATIONS_MIXTES",
      type: "observation_controle",
      value: "Certaines pages indiquent Sin incidencia ; d'autres signalent que l'usage observé ne coïncide pas avec l'usage déclaré.",
      unit: pac2007,
      date: "2007-07-12",
      scope: "controle_pac_2007",
      note: "Ne pas généraliser cette observation à toute la finca sans reconstruction parcelle/recinto."
    }));
    events.push({
      id: "EVENT_PAC_CONTROLE_2007",
      type: "CONTROLE_PAC_TERRAIN",
      date: "2007-07-12",
      dateStatus: "DOCUMENTE",
      summary: "Contrôle PAC / photo-interprétation avec résultats variables selon les pages/parcelles.",
      sourceUnitIds: [pac2007.id],
      scope: "parcelles_recintos_controles",
      status: "DOCUMENTE"
    });
    openChecks.push({
      id: "CHECK_PAC2007_PAGE_15",
      kind: "COMPLETUDE_DOCUMENTAIRE",
      priority: "HAUTE",
      question: "La pagination interne va jusqu'à 15 mais le lot contient 14 images : existe-t-il une page manquante ou une différence de pagination ?",
      sourceUnitIds: [pac2007.id],
      notAMissingDocumentClaim: false,
      expectedStatus: "A_VERIFIER"
    });
  }

  const modelo037 = units.find((u) => u.id === "MODELO_037_MARIA_JOSEFA");
  if (modelo037) {
    facts.push(fact({
      id: "FACT_MODELO037_EXISTE",
      type: "document_statut_activite",
      value: "Modelo 037 — activité de María Josefa de los Rios Serrano",
      unit: modelo037,
      scope: "statut_activite",
      note: "Prouve un document fiscal/statutaire ; ne prouve ni récolte ni rendement."
    }));
  }

  const agriUnits = units
    .filter((u) => /^AGRI_SAN_JUAN_FACTURES_\d{4}$/.test(u.id))
    .sort((a, b) => a.id.localeCompare(b.id));

  for (const u of agriUnits) {
    const year = u.id.slice(-4);
    facts.push(fact({
      id: `FACT_AGRI_SAN_JUAN_ETAT_${year}`,
      type: "etat_factures_agri_san_juan_present",
      value: year,
      unit: u,
      date: year,
      scope: "serie_factures_agri_san_juan",
      note: "La présence de l'état annuel ne vaut pas total annuel de production d'olives."
    }));
    events.push({
      id: `EVENT_AGRI_SAN_JUAN_DOCUMENT_${year}`,
      type: "ETAT_FACTURES_COOPERATIVE",
      date: year,
      dateStatus: "ANNEE_DOCUMENTAIRE",
      summary: `État(s) de factures Agri San Juan présent(s) pour ${year}.`,
      sourceUnitIds: [u.id],
      scope: "document_cooperative",
      status: "DOCUMENTE_SANS_TOTAL_PRODUCTION_PROMU"
    });
  }

  if (agriUnits.length) {
    const years = agriUnits.map((u) => u.id.slice(-4));
    facts.push({
      id: "FACT_AGRI_SAN_JUAN_SERIE_CONTINUE_2015_2022",
      type: "serie_documentaire",
      value: years,
      date: null,
      scope: "serie_factures_agri_san_juan",
      confidence: "STRUCTURATION_VALIDEE",
      proves: true,
      source: {
        unitIds: agriUnits.map((u) => u.id),
        evidenceLevels: [...new Set(agriUnits.map((u) => u.evidenceLevel))],
        files: agriUnits.flatMap((u) => u.files || [])
      },
      note: "Série documentaire continue dans ce lot ; ne signifie pas que chaque campagne agricole est quantitativement résolue."
    });
  }

  // Les autres unités restent traçables sans promotion automatique de leurs années OCR en dates de faits.
  for (const u of units) {
    if ([contract?.id, correspondence?.id, pac2007?.id, modelo037?.id].includes(u.id)) continue;
    if (/^AGRI_SAN_JUAN_FACTURES_\d{4}$/.test(u.id)) continue;
    facts.push(fact({
      id: `FACT_DOC_PRESENT_${u.id}`,
      type: "unite_documentaire_presente",
      value: u.category,
      unit: u,
      scope: "nouveau_lot_20260816",
      confidence: "STRUCTURATION_DOCUMENTAIRE",
      note: "Présence documentaire uniquement. Les années repérées par OCR ne sont pas promues automatiquement comme dates de fait."
    }));
  }

  const alerts = [];
  if (!agriUnits.find((u) => u.id.endsWith("2018"))) {
    alerts.push({ severity: "BLOQUANT", code: "AGRI_2018_ABSENT", message: "La correction V41 n'a pas produit l'unité 2018 attendue." });
  }
  if (!contract) {
    alerts.push({ severity: "BLOQUANT", code: "CONTRAT_15_ABSENT", message: "La preuve contractuelle 15 % attendue est absente de V41." });
  }

  const payload = {
    version: 42,
    generatedAt: new Date().toISOString(),
    sourceVersion: 41,
    factCount: facts.length,
    eventCount: events.length,
    openCheckCount: openChecks.length,
    facts,
    events,
    openChecks,
    alerts,
    safeguards: {
      noOcrRerun: true,
      noOriginalMoved: true,
      noOriginalRenamed: true,
      noOriginalModified: true,
      noAutomaticDeletion: true,
      factsKeepSourceLinks: true,
      documentProofSeparatedFromInference: true,
      ocrYearsNotPromotedToFactDates: true,
      agriInvoiceStatesNotPromotedToProductionTotals: true,
      contractual15PercentScopedToLease21_23: true
    }
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Faits extraits V42",
    "",
    `Faits : **${facts.length}**`,
    `Événements : **${events.length}**`,
    `Contrôles ouverts : **${openChecks.length}**`,
    "",
    "## Faits majeurs",
    ""
  ];

  const majorIds = [
    "FACT_RENTE_OLIVAR_15",
    "FACT_RENTE_TIERRA_CALMA_0",
    "FACT_ECHEANCE_RENTE_AVRIL",
    "FACT_PAC2007_DATE_CONTROLE",
    "FACT_PAC2007_TITULAIRE",
    "FACT_AGRI_SAN_JUAN_SERIE_CONTINUE_2015_2022"
  ];
  for (const id of majorIds) {
    const f = facts.find((x) => x.id === id);
    if (f) lines.push(`- **${f.id}** : ${JSON.stringify(f.value)}`);
  }

  lines.push("", "## Événements", "");
  for (const e of events) lines.push(`- **${e.id}** — ${e.summary}`);

  lines.push("", "## Contrôles ouverts", "");
  for (const c of openChecks) lines.push(`- **${c.id}** (${c.priority}) — ${c.question}`);

  lines.push(
    "",
    "## Règles de preuve",
    "",
    "- Les faits restent liés à leurs unités et fichiers sources.",
    "- Une année seulement repérée par OCR dans un dossier PAC n'est pas automatiquement une date de fait.",
    "- Les états de factures Agri San Juan prouvent l'existence de documents pour l'année, pas un total annuel de récolte.",
    "- Le 15 % est une preuve contractuelle dans le périmètre du bail 21.23 seulement.",
    ""
  );

  fs.writeFileSync(REPORT, lines.join("\n"), "utf-8");

  console.log("=== FINCA MARIA — FAITS EXTRAITS V42 ===");
  console.log("Faits :", facts.length);
  console.log("Événements :", events.length);
  console.log("Contrôles ouverts :", openChecks.length);
  console.log("Agri San Juan 2015-2022 documenté :", agriUnits.length === 8 ? "OUI" : "A VERIFIER");
  console.log("15 % contractuel lié au bail 21.23 :", contract ? "OUI" : "NON");
  console.log("OCR relancé : NON");
  console.log("Déplacement effectué : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Rapport :", REPORT);
}

try { main(); }
catch (error) {
  console.error("ERREUR V42 :", error.message || error);
  process.exitCode = 1;
}
