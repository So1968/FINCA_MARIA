#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V10.json");
const ROTATIONS = path.join(ROOT, "_TEST_ROTATIONS_INCONNUS_V11.json");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V12.json");
const UNKNOWNS = path.join(ROOT, "_INCONNUS_RESTANTS_V12.json");
const REVIEW = path.join(ROOT, "_A_REVOIR_MANUELLEMENT_V12.json");
const REPORT = path.join(ROOT, "_RAPPORT_CONSOLIDATION_V12.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function classifyFromV11(doc, analysis) {
  const name = String(doc.originalName || "");
  const text = String(analysis?.best?.text || "");
  const s = norm(text);

  if (
    name === "CamScanner 14-08-2026 19.49.jpg" ||
    (s.includes("plano de parcelacion") && s.includes("finca") && s.includes("alemanes"))
  ) {
    return {
      entity: "DOCUMENT_FONCIER",
      type: "PLAN_PARCELLE",
      scope: "REFERENCE_FONCIERE",
      confidence: 0.99,
      chronologyEligible: false,
      status: "RECONNU_V11_ROTATION"
    };
  }

  if (
    name === "CamScanner 14-08-2026 20.22_8.jpg" ||
    (s.includes("agencia tributaria") && s.includes("notificaciones") && s.includes("comunicaciones"))
  ) {
    return {
      entity: "AGENCIA_TRIBUTARIA",
      type: "RESUMEN_NOTIFICACIONES_COMUNICACIONES",
      scope: "FISCAL_ADMINISTRATIF",
      confidence: 0.99,
      chronologyEligible: false,
      status: "RECONNU_V11_ROTATION"
    };
  }

  if (
    name === "CamScanner 14-08-2026 21.15_5.jpg" ||
    s.includes("datos identificativos sigpac") ||
    (s.includes("sigpac") && s.includes("coordenadas utm"))
  ) {
    return {
      entity: "SIGPAC",
      type: "DATOS_IDENTIFICATIVOS_SIGPAC",
      scope: "REFERENCE_PARCELLAIRE_AGRICOLE",
      confidence: 0.99,
      chronologyEligible: false,
      status: "RECONNU_V11_ORIENTATION_OK"
    };
  }

  return null;
}

function manualReviewReason(doc, analysis) {
  const name = String(doc.originalName || "");
  if (name === "CamScanner 14-08-2026 19.50_2 (1).jpg") {
    return {
      reason: "tableau_lisible_partiellement_sans_contexte_suffisant",
      recommendation: "controle_visuel_manuel",
      bestRotation: analysis?.best?.angle ?? null,
      bestPsm: analysis?.best?.psm ?? null,
      bestScore: analysis?.best?.score ?? null
    };
  }
  if (name === "CamScanner 14-08-2026 19.53_2 (1).jpg") {
    return {
      reason: "ocr_trop_bruite_orientation_non_certaine",
      recommendation: "controle_visuel_manuel_si_necessaire",
      bestRotation: analysis?.best?.angle ?? null,
      bestPsm: analysis?.best?.psm ?? null,
      bestScore: analysis?.best?.score ?? null
    };
  }
  return null;
}

function main() {
  const input = readJson(INPUT);
  const rotations = readJson(ROTATIONS);

  const documents = structuredClone(input.documents || []);
  const analyses = Array.isArray(rotations.analyses) ? rotations.analyses : [];
  const byName = new Map(analyses.map((a) => [a.originalName, a]));

  let recovered = 0;
  let readingImproved = 0;
  const manualReview = [];

  for (const doc of documents) {
    const analysis = byName.get(doc.originalName);
    if (!analysis) continue;

    const bestText = String(analysis.best?.text || "").trim();
    if (bestText) {
      doc.reading = {
        ...(doc.reading || {}),
        textExcerpt: bestText.slice(0, 12000),
        status: bestText.length >= 20 ? "lu_ocr_rotation_v11" : (doc.reading?.status || "ocr_peu_lisible"),
        method: `tesseract_rotation_${analysis.best?.angle ?? 0}_psm_${analysis.best?.psm ?? "?"}`,
        rotationV11: {
          angle: analysis.best?.angle ?? 0,
          psm: analysis.best?.psm ?? null,
          score: analysis.best?.score ?? null,
          gainVsZero: analysis.orientationGain ?? null,
          persistedToWorkingCopy: Boolean(analysis.orientationPersistence?.persisted)
        }
      };
      readingImproved += 1;
    }

    const classification = classifyFromV11(doc, analysis);
    if (classification) {
      doc.refinedEntity = {
        code: classification.entity,
        label: classification.entity,
        confidence: classification.confidence,
        sourceV12: "contenu_direct_apres_rotation_v11"
      };
      doc.refinedType = {
        code: classification.type,
        confidence: classification.confidence,
        source: "contenu_direct_apres_rotation_v11"
      };
      doc.evidenceScopeV12 = classification.scope;
      doc.operationalChronologyEligibleV12 = classification.chronologyEligible;
      doc.v12Status = classification.status;
      recovered += 1;
      continue;
    }

    const review = manualReviewReason(doc, analysis);
    if (review) {
      doc.v12Status = "CONTROLE_MANUEL";
      doc.v12ManualReview = review;
      manualReview.push({
        originalName: doc.originalName,
        readingStatus: doc.reading?.status || "",
        ...review
      });
    }
  }

  const remainingUnknowns = documents.filter((doc) => {
    const entityUnknown = (doc.refinedEntity?.code || "INCONNU") === "INCONNU";
    const typeUnknown = (doc.refinedType?.code || "NON_IDENTIFIE") === "NON_IDENTIFIE";
    return entityUnknown && typeUnknown;
  });

  const payload = {
    version: 12,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    rotationAnalysis: ROTATIONS,
    summary: {
      documents: documents.length,
      readingsRefreshedFromV11: readingImproved,
      recoveredFromV11: recovered,
      remainingCompletelyUnknown: remainingUnknowns.length,
      manualReview: manualReview.length,
      agriculturalChronologyEventsPreserved: (input.chronology || []).length,
      administrativeTimelineEventsPreserved: (input.administrativeTimeline || []).length
    },
    documents,
    chronology: input.chronology || [],
    administrativeTimeline: input.administrativeTimeline || [],
    remainingUnknowns,
    manualReview
  };

  writeJson(OUTPUT, payload);
  writeJson(UNKNOWNS, {
    generatedAt: payload.generatedAt,
    unknowns: remainingUnknowns.map((d) => ({
      originalName: d.originalName,
      readingStatus: d.reading?.status || "",
      v12Status: d.v12Status || ""
    }))
  });
  writeJson(REVIEW, { generatedAt: payload.generatedAt, documents: manualReview });

  const lines = [
    "# FINCA MARIA — Consolidation V12",
    "",
    "V12 intègre les meilleures lectures obtenues par V11 sans toucher aux originaux privés.",
    "",
    `- Documents : **${documents.length}**`,
    `- Lectures V11 réinjectées : **${readingImproved}**`,
    `- Documents reconnus grâce à V11 : **${recovered}**`,
    `- Documents encore totalement inconnus : **${remainingUnknowns.length}**`,
    `- Documents maintenus en contrôle manuel : **${manualReview.length}**`,
    `- Chronologie agricole préservée : **${(input.chronology || []).length} événements**`,
    `- Chronologie administrative préservée : **${(input.administrativeTimeline || []).length} événements**`,
    "",
    "Les documents fonciers/SIGPAC restent des références et n'entrent pas dans la chronologie de production.",
    "Les documents fiscaux restent séparés de la chronologie agricole.",
    "Les cas non suffisamment identifiés restent explicitement en contrôle manuel plutôt que d'être devinés."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — CONSOLIDATION V12 ===");
  console.log("Documents :", documents.length);
  console.log("Lectures V11 réinjectées :", readingImproved);
  console.log("Documents reconnus grâce à V11 :", recovered);
  console.log("Documents totalement inconnus restants :", remainingUnknowns.length);
  console.log("Documents en contrôle manuel :", manualReview.length);
  console.log("Chronologie agricole préservée :", (input.chronology || []).length);
  console.log("Chronologie administrative préservée :", (input.administrativeTimeline || []).length);
  console.log("Analyse :", OUTPUT);
  console.log("Inconnus :", UNKNOWNS);
  console.log("Contrôle manuel :", REVIEW);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V12 :", error.message || error);
  process.exitCode = 1;
}
