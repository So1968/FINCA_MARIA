#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const ANALYSIS = path.join(ROOT, "_ANALYSE_EXPLOITATION_V12.json");
const AUDIT = path.join(ROOT, "_AUDIT_SANS_CAMPAGNE_V14.json");
const OUTPUT = path.join(ROOT, "_AUDIT_LIQUIDATIONS_SANS_CAMPAGNE_V15.json");
const REVIEW = path.join(ROOT, "_LIQUIDATIONS_A_CONFIRMER_V15.json");
const REPORT = path.join(ROOT, "_RAPPORT_LIQUIDATIONS_V15.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function normalizeYearPart(value) {
  const raw = String(value || "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return null;
  if (raw.length === 4) return n;
  return n >= 70 ? 1900 + n : 2000 + n;
}

function normalizeCampaign(aRaw, bRaw) {
  const a = normalizeYearPart(aRaw);
  const b0 = normalizeYearPart(bRaw);
  if (!a || !b0) return "";
  let b = b0;
  if (String(bRaw).length === 2 && Number(bRaw) === ((a + 1) % 100)) b = a + 1;
  return b === a + 1 ? `${a}-${b}` : "";
}

function explicitCampaign(text) {
  const source = String(text || "");
  const patterns = [
    /(?:CAMPA[ÑN]A|CP[ÑN]A|CAMPANA|CPNA)\s*[:.\-]?\s*(\d{2,4})\s*[\/]\s*(\d{2,4})/i,
    /(?:REPARTO|COSECHA)\s+(?:CP[ÑN]A\s*)?(\d{2,4})\s*[\/]\s*(\d{2,4})/i
  ];
  for (const pattern of patterns) {
    const m = source.match(pattern);
    if (!m) continue;
    const campaign = normalizeCampaign(m[1], m[2]);
    if (campaign) return { campaign, matchedText: m[0] };
  }
  return null;
}

function dateCampaign(date) {
  const m = String(date || "").match(/^((?:19|20)\d{2})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (!year || month < 1 || month > 12) return "";
  const start = month >= 9 ? year : year - 1;
  return `${start}-${start + 1}`;
}

function directSanJuan(text) {
  const s = norm(text);
  const directNames = [
    "agricola san juan",
    "s.c.a. agricola san juan",
    "sociedad cooperativa andaluza agricola san juan"
  ];
  if (directNames.some((x) => s.includes(x))) {
    return { confirmed: true, confidence: 0.99, reason: "nom_direct" };
  }

  const sanJuan = /\b(?:san|sam|gan|bam)\s+juan\b/.test(s);
  const cooperative = s.includes("sociedad cooperativa andaluza") || s.includes("s.c.a.") || s.includes("cooperativa andaluza");
  const agricola = s.includes("agricola") || /\b(?:a|ag|aq|ao)[a-z]{0,3}micola\b/.test(s);
  const knownPlace = s.includes("villanueva del") || s.includes("almazara");

  if (sanJuan && (cooperative || agricola)) {
    return { confirmed: true, confidence: 0.95, reason: "signature_san_juan_cooperative" };
  }
  if (sanJuan && knownPlace) {
    return { confirmed: true, confidence: 0.9, reason: "signature_san_juan_lieu" };
  }
  return { confirmed: false, confidence: 0, reason: "aucune_signature_directe_suffisante" };
}

function compact(value, max = 500) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function factsOf(event, doc) {
  return {
    ...(doc?.facts || {}),
    ...(doc?.factsV7 || {}),
    ...(event?.facts || {})
  };
}

function main() {
  const analysis = readJson(ANALYSIS);
  const audit = readJson(AUDIT);

  const documents = Array.isArray(analysis.documents) ? analysis.documents : [];
  const auditedEvents = Array.isArray(audit.auditedEvents) ? audit.auditedEvents : [];
  const docsById = new Map(documents.filter((d) => d.documentId).map((d) => [d.documentId, d]));
  const docsByName = new Map(documents.filter((d) => d.originalName).map((d) => [d.originalName, d]));

  const strong = auditedEvents.filter((e) => e.type === "LIQUIDATION" || e.type === "LIQUIDATION_FACTURE");
  const rows = strong.map((event) => {
    const doc = docsById.get(event.sourceDocumentId) || docsByName.get(event.sourceDocument) || null;
    const text = [
      doc?.reading?.textExcerpt,
      event.rawLine,
      event.concept
    ].filter(Boolean).join("\n");

    const entity = directSanJuan(text);
    const explicit = explicitCampaign(text);
    const byDate = dateCampaign(event.date);

    let decisionClass = "A_CONFIRMER_MANUELLEMENT";
    let proposedCampaign = "";
    let campaignSource = "";
    let safeForCampaignAnchor = false;

    if (entity.confirmed && explicit) {
      decisionClass = "ANCRAGE_FORT_CAMPAGNE_EXPLICITE";
      proposedCampaign = explicit.campaign;
      campaignSource = "mention_explicite_document";
      safeForCampaignAnchor = true;
    } else if (entity.confirmed && byDate) {
      decisionClass = "ANCRAGE_FORT_ENTITE_DATE_A_VALIDER";
      proposedCampaign = byDate;
      campaignSource = "date_document_liquidation";
      safeForCampaignAnchor = false;
    } else if (!entity.confirmed && explicit) {
      decisionClass = "CAMPAGNE_EXPLICITE_ENTITE_A_CONFIRMER";
      proposedCampaign = explicit.campaign;
      campaignSource = "mention_explicite_document";
      safeForCampaignAnchor = false;
    }

    return {
      sourceDocumentId: event.sourceDocumentId || doc?.documentId || "",
      sourceDocument: event.sourceDocument || doc?.originalName || "",
      type: event.type,
      date: event.date || "",
      v14Class: event.v14Class || "",
      v14Entity: event.entity || "",
      directSanJuan: entity,
      explicitCampaign: explicit?.campaign || "",
      explicitCampaignEvidence: explicit?.matchedText || "",
      dateCampaignCandidate: byDate,
      decisionClass,
      proposedCampaign,
      campaignSource,
      safeForCampaignAnchor,
      facts: factsOf(event, doc),
      textExcerpt: compact(text)
    };
  });

  const explicitAnchors = rows.filter((r) => r.decisionClass === "ANCRAGE_FORT_CAMPAGNE_EXPLICITE");
  const entityDate = rows.filter((r) => r.decisionClass === "ANCRAGE_FORT_ENTITE_DATE_A_VALIDER");
  const entityUnconfirmed = rows.filter((r) => !r.directSanJuan.confirmed);
  const manual = rows.filter((r) => !r.safeForCampaignAnchor);

  const summary = {
    strongUnassignedDocuments: rows.length,
    liquidations: rows.filter((r) => r.type === "LIQUIDATION").length,
    liquidationInvoices: rows.filter((r) => r.type === "LIQUIDATION_FACTURE").length,
    directSanJuanConfirmed: rows.filter((r) => r.directSanJuan.confirmed).length,
    explicitCampaignFound: rows.filter((r) => r.explicitCampaign).length,
    safeExplicitAnchors: explicitAnchors.length,
    strongDateCandidatesToValidate: entityDate.length,
    entityStillUnconfirmed: entityUnconfirmed.length,
    manualConfirmationNeeded: manual.length
  };

  const payload = {
    version: 15,
    generatedAt: new Date().toISOString(),
    basedOn: { analysis: ANALYSIS, audit: AUDIT },
    purpose: "Auditer les liquidations sans campagne par leur contenu direct, sans réutiliser l'héritage des lots CamScanner, afin de distinguer les vrais ancrages de campagne des simples hypothèses par date.",
    summary,
    documents: rows
  };

  writeJson(OUTPUT, payload);
  writeJson(REVIEW, {
    generatedAt: payload.generatedAt,
    documents: manual
  });

  const lines = [
    "# FINCA MARIA — Audit des liquidations sans campagne V15",
    "",
    `- Pièces fortes auditées : **${summary.strongUnassignedDocuments}**`,
    `- Liquidations : **${summary.liquidations}**`,
    `- Liquidations/factures : **${summary.liquidationInvoices}**`,
    `- Agri San Juan confirmé par contenu direct : **${summary.directSanJuanConfirmed}**`,
    `- Campagnes explicites retrouvées dans le contenu : **${summary.explicitCampaignFound}**`,
    `- Ancrages explicites directement utilisables : **${summary.safeExplicitAnchors}**`,
    `- Pièces fortes avec entité confirmée mais campagne seulement proposée par date : **${summary.strongDateCandidatesToValidate}**`,
    `- Entité encore non confirmée : **${summary.entityStillUnconfirmed}**`,
    `- Pièces gardées en validation/revue : **${summary.manualConfirmationNeeded}**`,
    "",
    "Une liquidation sans mention explicite de campagne n'est pas transformée automatiquement en campagne prouvée. Sa date peut proposer une campagne, mais la proposition reste à valider.",
    "L'identité Agri San Juan est recherchée dans le contenu de chaque pièce elle-même, sans héritage du lot CamScanner."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — AUDIT LIQUIDATIONS V15 ===");
  console.log("Pièces fortes auditées :", summary.strongUnassignedDocuments);
  console.log("- liquidations :", summary.liquidations);
  console.log("- liquidation/facture :", summary.liquidationInvoices);
  console.log("Agri San Juan confirmé directement :", summary.directSanJuanConfirmed);
  console.log("Campagnes explicites retrouvées :", summary.explicitCampaignFound);
  console.log("Ancrages explicites utilisables :", summary.safeExplicitAnchors);
  console.log("Pièces fortes candidates par date à valider :", summary.strongDateCandidatesToValidate);
  console.log("Entité encore non confirmée :", summary.entityStillUnconfirmed);
  console.log("À confirmer/revoir :", summary.manualConfirmationNeeded);
  console.log("Audit :", OUTPUT);
  console.log("Revue :", REVIEW);
  console.log("Rapport :", REPORT);
  console.log("Aucun original n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V15 :", error.message || error);
  process.exitCode = 1;
}
