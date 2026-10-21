#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V8.json");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V9.json");
const UNKNOWNS = path.join(ROOT, "_INCONNUS_RESTANTS_V9.json");
const ADMIN = path.join(ROOT, "_CHRONOLOGIE_ADMINISTRATIVE_V9.json");
const REPORT = path.join(ROOT, "_RAPPORT_RECONNAISSANCE_V9.md");

function norm(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function classify(doc) {
  const text = String(doc.reading?.textExcerpt || "");
  const s = norm(text);

  if (s.includes("modelo 037") || s.includes("censo de empresarios") || s.includes("pagos fraccionados a cuenta del irpf")) {
    const agricultural = s.includes("actividad agricola") || s.includes("actividades agricolas") || s.includes("agricolas, ganaderas y forestales");
    return {
      entity: "AGENCIA_TRIBUTARIA",
      type: agricultural ? "MODELO_037_ACTIVIDAD_AGRICOLA" : "MODELO_037_CENSO",
      scope: agricultural ? "ADMIN_EXPLOITATION" : "FISCAL_ADMINISTRATIF",
      adminTimeline: true
    };
  }

  if (s.includes("agencia tributaria") || s.includes("modelo 100") || s.includes("impuesto sobre la renta de las personas fisicas")) {
    const agricultural = s.includes("actividad agricola") || s.includes("actividades agricolas") || s.includes("agricolas, ganaderas y forestales");
    const presentation = s.includes("informacion de la presentacion") || s.includes("presentacion realizada el");
    const refund = s.includes("documento de ingreso o devolucion");
    return {
      entity: "AGENCIA_TRIBUTARIA",
      type: presentation ? "MODELO_100_PRESENTACION" : refund ? "IRPF_INGRESO_O_DEVOLUCION" : agricultural ? "DECLARACION_IRPF_ACTIVITE_AGRICOLE" : "DECLARATION_IRPF",
      scope: agricultural ? "FISCAL_EXPLOITATION" : "FISCAL_PERSONNEL",
      adminTimeline: presentation
    };
  }

  if (s.includes("certificado de rentas") || s.includes("pension de jubilacion") || s.includes("pension de viudedad")) {
    return { entity: "PRESTATIONS_PERSONNELLES", type: "DOCUMENT_PRESTATION", scope: "HORS_EXPLOITATION", adminTimeline: false };
  }

  if (s.includes("documento nacional de") || s.includes("idesp")) {
    return { entity: "IDENTITE_PERSONNELLE", type: "DOCUMENT_IDENTITE", scope: "HORS_EXPLOITATION", adminTimeline: false };
  }

  return null;
}

function presentationDate(text) {
  const m = String(text || "").match(/presentaci[oó]n\s+realizada\s+el\s+(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/i);
  return m ? `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}` : "";
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Analyse V8 introuvable : ${INPUT}`);
  const input = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const documents = structuredClone(input.documents || []);
  const adminTimeline = [];
  let recovered = 0;

  for (const doc of documents) {
    const unknown = (doc.refinedEntity?.code || "INCONNU") === "INCONNU" && (doc.refinedType?.code || "NON_IDENTIFIE") === "NON_IDENTIFIE";
    if (!unknown || doc.reading?.status !== "lu_ocr") continue;
    const c = classify(doc);
    if (!c) continue;

    doc.refinedEntity = { code: c.entity, label: c.entity, confidence: 0.96, sourceV9: "contenu_direct" };
    doc.refinedType = { code: c.type, confidence: 0.96, source: "contenu_direct" };
    doc.evidenceScopeV9 = c.scope;
    doc.operationalChronologyEligibleV9 = false;
    doc.v9Status = "RECONNU_PAR_CONTENU_DIRECT";
    recovered += 1;

    if (c.adminTimeline) {
      adminTimeline.push({
        sourceDocument: doc.originalName,
        entity: c.entity,
        type: c.type,
        date: presentationDate(doc.reading?.textExcerpt || ""),
        scope: c.scope
      });
    }
  }

  const remainingUnknowns = documents.filter((d) => (d.refinedEntity?.code || "INCONNU") === "INCONNU" && (d.refinedType?.code || "NON_IDENTIFIE") === "NON_IDENTIFIE");
  const byReading = {};
  for (const d of remainingUnknowns) byReading[d.reading?.status || "?"] = (byReading[d.reading?.status || "?"] || 0) + 1;

  const payload = {
    version: 9,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    summary: {
      documents: documents.length,
      recoveredByOwnContent: recovered,
      remainingCompletelyUnknown: remainingUnknowns.length,
      remainingByReading: byReading,
      operationalChronologyEventsPreserved: (input.chronology || []).length,
      administrativeTimelineEvents: adminTimeline.length
    },
    documents,
    chronology: input.chronology || [],
    administrativeTimeline: adminTimeline,
    remainingUnknowns
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(UNKNOWNS, JSON.stringify({ generatedAt: payload.generatedAt, unknowns: remainingUnknowns.map((d) => ({ originalName: d.originalName, readingStatus: d.reading?.status || "" })) }, null, 2), "utf-8");
  fs.writeFileSync(ADMIN, JSON.stringify({ generatedAt: payload.generatedAt, events: adminTimeline }, null, 2), "utf-8");
  fs.writeFileSync(REPORT, [
    "# FINCA MARIA — Reconnaissance directe V9",
    "",
    "Les pages sont reconnues à partir de leur propre contenu, sans hériter de l'identité d'une page voisine.",
    "",
    `- Pages récupérées : **${recovered}**`,
    `- Inconnus restants : **${remainingUnknowns.length}**`,
    `- Chronologie agricole préservée : **${(input.chronology || []).length} événements**`,
    `- Événements administratifs/fiscaux séparés : **${adminTimeline.length}**`,
    "",
    "Les documents fiscaux, identitaires et de prestations sont conservés hors chronologie agricole."
  ].join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — RECONNAISSANCE DIRECTE V9 ===");
  console.log("Pages récupérées par contenu direct :", recovered);
  console.log("Documents totalement inconnus restants :", remainingUnknowns.length);
  console.log("Répartition inconnus restants :", byReading);
  console.log("Chronologie agricole préservée :", (input.chronology || []).length);
  console.log("Événements administratifs/fiscaux séparés :", adminTimeline.length);
  console.log("Analyse :", OUTPUT);
  console.log("Inconnus :", UNKNOWNS);
  console.log("Chronologie administrative :", ADMIN);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try { main(); } catch (error) { console.error(error.message || error); process.exitCode = 1; }
