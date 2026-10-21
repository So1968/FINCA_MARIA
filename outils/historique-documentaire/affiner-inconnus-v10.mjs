#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V9.json");
const OUTPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V10.json");
const UNKNOWNS = path.join(ROOT, "_INCONNUS_RESTANTS_V10.json");
const ADMIN = path.join(ROOT, "_CHRONOLOGIE_ADMINISTRATIVE_V10.json");
const REPORT = path.join(ROOT, "_RAPPORT_AFFINAGE_V10.md");

function norm(v) {
  return String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function reverseText(v) {
  return [...String(v || "")].reverse().join("");
}

function ownText(doc) {
  const text = String(doc.reading?.textExcerpt || "");
  return {
    raw: text,
    normal: norm(text),
    reversed: norm(reverseText(text))
  };
}

function parseDmy(value) {
  const m = String(value || "").match(/(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/);
  return m ? `${m[3]}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}` : "";
}

function classify(doc) {
  const { raw, normal, reversed } = ownText(doc);
  const combined = `${normal}\n${reversed}`;

  if (combined.includes("plano") && combined.includes("alemanes") && (combined.includes("parcela") || combined.includes("finca") || combined.includes("termino municipal"))) {
    return {
      entity: "DOCUMENT_FONCIER",
      type: "PLAN_PARCELLE",
      scope: "REFERENCE_FONCIERE",
      confidence: 0.93,
      chronologyEligible: false,
      reason: "Plan foncier/parcellaire reconnu dans le contenu propre de la page, y compris après lecture inversée."
    };
  }

  if (combined.includes("agencia tributaria") && (combined.includes("notificaciones") || combined.includes("comunicaciones") || combined.includes("resumen de notificaciones"))) {
    return {
      entity: "AGENCIA_TRIBUTARIA",
      type: "NOTIFICATION_FISCALE",
      scope: "FISCAL_ADMINISTRATIF",
      confidence: 0.88,
      chronologyEligible: false,
      reason: "Notification/communication fiscale reconnue dans le contenu propre de la page."
    };
  }

  if (normal.includes("403 tipo de actividad") && normal.includes("agricola") && normal.includes("alta")) {
    const altaLine = raw.split(/\r?\n/).find((line) => /alta/i.test(line) && /fecha/i.test(line)) || raw;
    const date = parseDmy(altaLine);
    return {
      entity: "AGENCIA_TRIBUTARIA",
      type: "MODELO_037_ACTIVIDAD_AGRICOLA",
      scope: "ADMIN_EXPLOITATION",
      confidence: 0.99,
      chronologyEligible: false,
      adminEvent: date ? {
        date,
        type: "ALTA_ACTIVITE_AGRICOLE",
        scope: "ADMIN_EXPLOITATION",
        confidence: 0.99,
        evidence: "Modelo 037 : type d'activité AGRÍCOLA et cause de présentation Alta."
      } : null,
      reason: "Modelo 037 reconnu par les mentions directes Tipo de actividad AGRÍCOLA et Alta."
    };
  }

  const dateLike = normal.match(/\b(?:0?[1-9]|[12]\d|3[01])[\s/.:-]+(?:0?[1-9]|1[0-2])[\s/.:-]+(?:19|20)\d{2}\b/g) || [];
  if (normal.includes("espana") && dateLike.length >= 1 && (normal.includes("maria josefa") || normal.includes("nacional") || normal.includes("p.poc"))) {
    return {
      entity: "IDENTITE_PERSONNELLE",
      type: "DOCUMENT_IDENTITE_PROBABLE",
      scope: "HORS_EXPLOITATION",
      confidence: 0.8,
      chronologyEligible: false,
      reason: "Pièce d'identité probable reconnue par le contenu propre de la page ; aucun identifiant personnel n'est recopié dans les sorties V10."
    };
  }

  return null;
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`Analyse V9 introuvable : ${INPUT}`);
  const input = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const documents = structuredClone(input.documents || []);
  const adminTimeline = structuredClone(input.administrativeTimeline || []);
  let recovered = 0;
  let recoveredPlan = 0;
  let recoveredFiscal = 0;
  let recoveredIdentity = 0;
  let recoveredAgriculturalAdmin = 0;
  let adminAdded = 0;

  for (const doc of documents) {
    const unknown = (doc.refinedEntity?.code || "INCONNU") === "INCONNU" && (doc.refinedType?.code || "NON_IDENTIFIE") === "NON_IDENTIFIE";
    if (!unknown || doc.reading?.status !== "lu_ocr") continue;

    const c = classify(doc);
    if (!c) continue;

    doc.refinedEntity = { code: c.entity, label: c.entity, confidence: c.confidence, sourceV10: "contenu_direct" };
    doc.refinedType = { code: c.type, confidence: c.confidence, source: "contenu_direct" };
    doc.evidenceScopeV10 = c.scope;
    doc.operationalChronologyEligibleV10 = c.chronologyEligible;
    doc.v10Status = "RECONNU_PAR_CONTENU_DIRECT";
    doc.v10Reason = c.reason;
    recovered += 1;

    if (c.type === "PLAN_PARCELLE") recoveredPlan += 1;
    if (c.type === "NOTIFICATION_FISCALE") recoveredFiscal += 1;
    if (c.type === "DOCUMENT_IDENTITE_PROBABLE") recoveredIdentity += 1;
    if (c.type === "MODELO_037_ACTIVIDAD_AGRICOLA") recoveredAgriculturalAdmin += 1;

    if (c.adminEvent) {
      const alreadyThere = adminTimeline.some((e) => e.sourceDocument === doc.originalName && e.type === c.adminEvent.type && e.date === c.adminEvent.date);
      if (!alreadyThere) {
        adminTimeline.push({
          sourceDocument: doc.originalName,
          entity: c.entity,
          type: c.adminEvent.type,
          date: c.adminEvent.date,
          scope: c.adminEvent.scope,
          confidence: c.adminEvent.confidence,
          evidence: c.adminEvent.evidence
        });
        adminAdded += 1;
      }
    }
  }

  adminTimeline.sort((a, b) => String(a.date || "9999").localeCompare(String(b.date || "9999")));

  const remainingUnknowns = documents.filter((d) =>
    (d.refinedEntity?.code || "INCONNU") === "INCONNU" &&
    (d.refinedType?.code || "NON_IDENTIFIE") === "NON_IDENTIFIE"
  );
  const byReading = {};
  for (const d of remainingUnknowns) byReading[d.reading?.status || "?"] = (byReading[d.reading?.status || "?"] || 0) + 1;

  const chronology = input.chronology || [];
  const payload = {
    version: 10,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    principle: "Reconnaître uniquement à partir du contenu propre de la page, y compris lorsque l'OCR est inversé, sans réintroduire d'héritage de lot CamScanner.",
    summary: {
      documents: documents.length,
      recoveredV10: recovered,
      recoveredPlan,
      recoveredFiscal,
      recoveredIdentity,
      recoveredAgriculturalAdmin,
      remainingCompletelyUnknown: remainingUnknowns.length,
      remainingByReading: byReading,
      operationalChronologyEventsPreserved: chronology.length,
      administrativeTimelineEvents: adminTimeline.length,
      administrativeEventsAddedV10: adminAdded
    },
    documents,
    chronology,
    administrativeTimeline: adminTimeline,
    remainingUnknowns
  };

  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(UNKNOWNS, JSON.stringify({
    generatedAt: payload.generatedAt,
    unknowns: remainingUnknowns.map((d) => ({ originalName: d.originalName, readingStatus: d.reading?.status || "" }))
  }, null, 2), "utf-8");
  fs.writeFileSync(ADMIN, JSON.stringify({ generatedAt: payload.generatedAt, events: adminTimeline }, null, 2), "utf-8");
  fs.writeFileSync(REPORT, [
    "# FINCA MARIA — Affinage V10",
    "",
    "Cette étape ne réutilise aucune identité héritée d'un lot CamScanner.",
    "",
    `- Pages récupérées en V10 : **${recovered}**`,
    `- Plans fonciers : **${recoveredPlan}**`,
    `- Notifications fiscales : **${recoveredFiscal}**`,
    `- Documents d'identité probables : **${recoveredIdentity}**`,
    `- Documents administratifs d'activité agricole : **${recoveredAgriculturalAdmin}**`,
    `- Inconnus restants : **${remainingUnknowns.length}**`,
    `- Chronologie agricole préservée : **${chronology.length} événements**`,
    `- Chronologie administrative : **${adminTimeline.length} événements**`,
    "",
    "Le Modelo 037 d'activité agricole alimente uniquement la chronologie administrative. Les plans, pièces identitaires et notifications fiscales restent hors chronologie de production."
  ].join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — AFFINAGE V10 ===");
  console.log("Pages récupérées V10 :", recovered);
  console.log("- plan/foncier :", recoveredPlan);
  console.log("- fiscal :", recoveredFiscal);
  console.log("- identité probable :", recoveredIdentity);
  console.log("- administratif agricole :", recoveredAgriculturalAdmin);
  console.log("Documents totalement inconnus restants :", remainingUnknowns.length);
  console.log("Répartition inconnus restants :", byReading);
  console.log("Chronologie agricole préservée :", chronology.length);
  console.log("Événements administratifs/fiscaux :", adminTimeline.length);
  console.log("Événements administratifs ajoutés V10 :", adminAdded);
  console.log("Analyse :", OUTPUT);
  console.log("Inconnus :", UNKNOWNS);
  console.log("Chronologie administrative :", ADMIN);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try { main(); } catch (error) { console.error(error.message || error); process.exitCode = 1; }
