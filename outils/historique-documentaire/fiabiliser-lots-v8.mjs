#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V7.json");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V8.json");
const AUDIT = path.join(ROOT, "_AUDIT_LOTS_CAMSCANNER_V8.json");
const UNKNOWNS = path.join(ROOT, "_INCONNUS_RESTANTS_V8.json");
const REPORT = path.join(ROOT, "_RAPPORT_FIABILISATION_V8.md");

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function textOf(doc) {
  return String(doc.reading?.textExcerpt || "");
}

function directEntityCode(doc) {
  if (doc.context?.inheritedEntity) return "";
  const code = doc.entity?.code || "";
  return code && code !== "INCONNU" ? code : "";
}

function classifyReadableUnknown(doc) {
  const text = textOf(doc);
  const s = norm(text);

  if (s.includes("copie integrale - acte de deces") || s.includes("acte de deces")) {
    return {
      entity: { code: "ETAT_CIVIL", label: "État civil", confidence: 0.99, sourceV8: "contenu_direct" },
      type: { code: "ACTE_DECES", confidence: 0.99, source: "contenu_direct" },
      evidenceScope: "FAMILLE_ADMINISTRATIF",
      sourceAuthority: "OFFICIEL",
      chronologyEligible: false,
      reason: "Acte d'état civil : preuve familiale/administrative, pas preuve d'activité agricole."
    };
  }

  if (s.includes("ferreteria linde") || s.includes("ferretería linde")) {
    return {
      entity: { code: "FERRETERIA_LINDE", label: "Ferretería Linde", confidence: 0.99, sourceV8: "contenu_direct" },
      type: { code: "ACHAT_COMMERCE_A_PRECISER", confidence: 0.72, source: "contenu_direct" },
      evidenceScope: "DEPENSE_A_AFFECTER",
      sourceAuthority: "TIERS",
      chronologyEligible: false,
      reason: "Commerce identifié mais contenu d'achat trop incomplet pour l'affecter automatiquement à l'exploitation."
    };
  }

  if (s.includes("dalar") && s.includes("artic") && s.includes("total") && s.includes("iva incluido")) {
    return {
      entity: { code: "DALAR", label: "DALAR", confidence: 0.96, sourceV8: "contenu_direct" },
      type: { code: "TICKET_CAISSE", confidence: 0.96, source: "contenu_direct" },
      evidenceScope: "DEPENSE_A_AFFECTER",
      sourceAuthority: "TIERS",
      chronologyEligible: false,
      reason: "Ticket de caisse lisible, mais les articles sont génériques : affectation finca/casa à confirmer."
    };
  }

  if (s.includes("lopez gallego jose") && (s.includes("kilos de trigo") || s.includes("tritical"))) {
    return {
      entity: { code: "LOPEZ_GALLEGO_JOSE", label: "López Gallego José", confidence: 0.99, sourceV8: "contenu_direct" },
      type: { code: "FACTURE_INTRANT_AGRICOLE", confidence: 0.98, source: "contenu_direct" },
      evidenceScope: "EXPLOITATION",
      sourceAuthority: "TIERS",
      chronologyEligible: true,
      reason: "Facture adressée au Finca Maria portant sur 500 kg de triticale."
    };
  }

  if (s.includes("agricola vitines") && s.includes("nota de entrega")) {
    return {
      entity: { code: "AGRICOLA_VITINES", label: "Agrícola Vitines", confidence: 0.98, sourceV8: "contenu_direct" },
      type: { code: "BON_LIVRAISON_AGRICOLE", confidence: 0.96, source: "contenu_direct" },
      evidenceScope: "EXPLOITATION_PROBABLE",
      sourceAuthority: "TIERS",
      chronologyEligible: false,
      reason: "Bon de livraison agricole reconnu ; date/contenu insuffisants dans l'OCR pour créer un événement daté fiable."
    };
  }

  if ((s.includes("plano") && s.includes("parcel")) || (s.includes("finca") && s.includes("los alemanes") && s.includes("termino municipal"))) {
    return {
      entity: { code: "DOCUMENT_FONCIER", label: "Document foncier / municipal", confidence: 0.9, sourceV8: "contenu_direct" },
      type: { code: "PLAN_PARCELLE", confidence: 0.96, source: "contenu_direct" },
      evidenceScope: "REFERENCE_FONCIERE",
      sourceAuthority: "DOCUMENTAIRE",
      chronologyEligible: false,
      reason: "Plan parcellaire : référence foncière, pas événement d'exploitation."
    };
  }

  if (s.includes("producion olivar") || (s.includes("subvencion") && s.includes("total campana") && s.includes("modifie le"))) {
    return {
      entity: { code: "SYNTHESE_INTERNE", label: "Synthèse interne", confidence: 0.94, sourceV8: "contenu_direct" },
      type: { code: "TABLEAU_SYNTHESE_PRODUCTION_SUBVENTION", confidence: 0.94, source: "contenu_direct" },
      evidenceScope: "SYNTHESE_DERIVEE",
      sourceAuthority: "DERIVE_INTERNE",
      chronologyEligible: false,
      reason: "Document de synthèse interne : utile comme piste, mais ne remplace pas les pièces sources."
    };
  }

  return null;
}

function buildGroups(documents) {
  const map = new Map();
  for (const doc of documents) {
    const key = doc.dossierKey || `SINGLE::${doc.originalName}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return map;
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Analyse V7 introuvable : ${INPUT}`);
  const input = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const documents = structuredClone(input.documents || []);
  const groups = buildGroups(documents);

  const conflictingGroups = [];
  const conflictingKeys = new Set();

  for (const [key, docs] of groups) {
    const directEntities = [...new Set(docs.map(directEntityCode).filter(Boolean))];
    if (directEntities.length >= 2) {
      conflictingKeys.add(key);
      conflictingGroups.push({
        key,
        directEntities,
        files: docs.map((d) => d.originalName),
        reason: "Plusieurs interlocuteurs explicitement reconnus dans le même lot CamScanner : le lot est un lot de numérisation, pas un dossier documentaire fiable."
      });
    }
  }

  let strippedInheritedEntities = 0;
  let strippedInheritedCampaigns = 0;
  let recoveredUnknowns = 0;

  for (const doc of documents) {
    doc.scanBatchKey = doc.dossierKey || "";
    doc.scanBatchConflict = conflictingKeys.has(doc.scanBatchKey);
    doc.evidenceScopeV8 = doc.evidenceScopeV8 || "NON_DETERMINE";
    doc.sourceAuthorityV8 = doc.sourceAuthorityV8 || "NON_DETERMINE";
    doc.chronologyEligibleV8 = true;
    doc.v8Notes = [];

    if (doc.scanBatchConflict) {
      if (doc.context?.inheritedEntity) {
        doc.refinedEntity = { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0, sourceV8: "heritage_retire_lot_conflictuel" };
        strippedInheritedEntities += 1;
        doc.v8Notes.push("Entité héritée retirée : lot CamScanner conflictuel.");
      }
      if (doc.context?.inheritedCampaign && doc.campaign) {
        doc.campaign = "";
        strippedInheritedCampaigns += 1;
        doc.v8Notes.push("Campagne héritée retirée : lot CamScanner conflictuel.");
      }
    }

    const entityCode = doc.refinedEntity?.code || "INCONNU";
    const typeCode = doc.refinedType?.code || "NON_IDENTIFIE";
    if (entityCode === "INCONNU" && typeCode === "NON_IDENTIFIE" && doc.reading?.status === "lu_ocr") {
      const recovered = classifyReadableUnknown(doc);
      if (recovered) {
        doc.refinedEntity = recovered.entity;
        doc.refinedType = recovered.type;
        doc.evidenceScopeV8 = recovered.evidenceScope;
        doc.sourceAuthorityV8 = recovered.sourceAuthority;
        doc.chronologyEligibleV8 = recovered.chronologyEligible;
        doc.v8Notes.push(recovered.reason);
        recoveredUnknowns += 1;
      }
    }

    if ((doc.refinedType?.code || "") === "PLAN_PARCELLE") {
      doc.evidenceScopeV8 = doc.evidenceScopeV8 === "NON_DETERMINE" ? "REFERENCE_FONCIERE" : doc.evidenceScopeV8;
      doc.chronologyEligibleV8 = false;
    }
  }

  const docByName = new Map(documents.map((d) => [d.originalName, d]));
  const chronology = (input.chronology || []).filter((event) => {
    const doc = docByName.get(event.document);
    if (!doc) return true;
    if (doc.chronologyEligibleV8 === false) return false;
    if (doc.scanBatchConflict && doc.context?.inheritedEntity) return false;
    return true;
  });

  const remainingUnknowns = documents.filter((d) =>
    (d.refinedEntity?.code || "INCONNU") === "INCONNU" &&
    (d.refinedType?.code || "NON_IDENTIFIE") === "NON_IDENTIFIE"
  );

  const operationalDates = chronology.map((e) => e.date).filter(Boolean).sort();

  const payload = {
    version: 8,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    project: "FINCA MARIA",
    principle: "Un horodatage CamScanner désigne un lot de numérisation. Il ne devient un dossier documentaire que si le contenu le confirme.",
    summary: {
      documents: documents.length,
      scanBatches: groups.size,
      conflictingScanBatches: conflictingGroups.length,
      inheritedEntitiesRemoved: strippedInheritedEntities,
      inheritedCampaignsRemoved: strippedInheritedCampaigns,
      readableUnknownsRecovered: recoveredUnknowns,
      remainingCompletelyUnknown: remainingUnknowns.length,
      chronologyEventsAfterSanitizing: chronology.length,
      earliestOperationalDateAfterSanitizing: operationalDates[0] || "",
      latestOperationalDateAfterSanitizing: operationalDates.at(-1) || ""
    },
    documents,
    chronology,
    conflictingScanBatches: conflictingGroups,
    remainingUnknowns,
    sourceV7Summary: input.summary || {}
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(AUDIT, JSON.stringify({ generatedAt: payload.generatedAt, conflictingScanBatches: conflictingGroups }, null, 2), "utf-8");
  fs.writeFileSync(UNKNOWNS, JSON.stringify({ generatedAt: payload.generatedAt, unknowns: remainingUnknowns.map((d) => ({ originalName: d.originalName, dossierKey: d.dossierKey, readingStatus: d.reading?.status || "" })) }, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Fiabilisation V8",
    "",
    "Un lot CamScanner est traité comme un lot de numérisation, pas automatiquement comme un dossier documentaire.",
    "",
    `- Lots CamScanner : **${groups.size}**`,
    `- Lots contenant plusieurs entités explicites : **${conflictingGroups.length}**`,
    `- Entités héritées retirées dans ces lots : **${strippedInheritedEntities}**`,
    `- Campagnes héritées retirées : **${strippedInheritedCampaigns}**`,
    `- Inconnus lisibles récupérés : **${recoveredUnknowns}**`,
    `- Documents encore totalement inconnus : **${remainingUnknowns.length}**`,
    `- Chronologie après assainissement : **${chronology.length} événements**`,
    `- Période opérationnelle après assainissement : **${operationalDates[0] || "?"} → ${operationalDates.at(-1) || "?"}**`,
    "",
    "Les tickets génériques, actes familiaux, plans et synthèses internes sont conservés mais n'entrent pas automatiquement dans la chronologie agricole."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — FIABILISATION V8 ===");
  console.log("Lots CamScanner :", groups.size);
  console.log("Lots conflictuels :", conflictingGroups.length);
  console.log("Entités héritées retirées :", strippedInheritedEntities);
  console.log("Campagnes héritées retirées :", strippedInheritedCampaigns);
  console.log("Inconnus lisibles récupérés :", recoveredUnknowns);
  console.log("Documents encore totalement inconnus :", remainingUnknowns.length);
  console.log("Événements chronologiques après assainissement :", chronology.length);
  console.log("Période après assainissement :", `${operationalDates[0] || "?"} -> ${operationalDates.at(-1) || "?"}`);
  console.log("Analyse :", OUTPUT);
  console.log("Audit lots :", AUDIT);
  console.log("Inconnus :", UNKNOWNS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
