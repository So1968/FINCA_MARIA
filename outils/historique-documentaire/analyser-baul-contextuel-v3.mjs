#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BAUL_ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT_FILE = path.join(BAUL_ROOT, "_ANALYSE_EXPLOITATION_V2.json");
const OUTPUT_FILE = path.join(BAUL_ROOT, "_ANALYSE_EXPLOITATION_V3.json");
const DOSSIERS_FILE = path.join(BAUL_ROOT, "_DOSSIERS_DOCUMENTAIRES_V3.json");
const ANOMALIES_FILE = path.join(BAUL_ROOT, "_ANOMALIES_V3.json");
const REPORT_FILE = path.join(BAUL_ROOT, "_RAPPORT_ANALYSE_BAUL_V3.md");

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function scannerGroupKey(name) {
  const base = path.basename(String(name || ""), path.extname(String(name || "")))
    .replace(/\s*\(\d+\)\s*$/i, "")
    .trim();

  const match = base.match(/^(CamScanner\s+\d{2}-\d{2}-\d{4}\s+\d{2}\.\d{2})(?:_\d+)?$/i);
  if (match) return match[1];
  return `SINGLE::${base}`;
}

function isSingleGroup(key) {
  return key.startsWith("SINGLE::");
}

function pageNumber(name) {
  const base = path.basename(String(name || ""), path.extname(String(name || "")))
    .replace(/\s*\(\d+\)\s*$/i, "")
    .trim();
  const match = base.match(/_(\d+)$/);
  return match ? Number(match[1]) : 1;
}

function includesAny(text, words) {
  const source = normalizeText(text);
  return words.some((word) => source.includes(normalizeText(word)));
}

function detectDossierEntity(text) {
  if (includesAny(text, [
    "agricola san juan", "agrícola san juan", "sociedad cooperativa andaluza",
    "s.c.a. agricola san juan", "almazara", "san juan"
  ])) {
    return { code: "AGRI_SAN_JUAN", label: "S.C.A. Agrícola San Juan", confidence: 0.94 };
  }
  if (includesAny(text, ["junta de andalucia", "junta de andalucía", "fega", "solicitud unica", "solicitud única", "pac", "sigpac"])) {
    return { code: "PAC_ADMINISTRATION", label: "Administration PAC", confidence: 0.9 };
  }
  if (includesAny(text, ["pelaez", "peláez"])) {
    return { code: "PELAEZ", label: "Peláez", confidence: 0.92 };
  }
  if (includesAny(text, ["caixabank", "unicaja", "cajamar", "santander", "bbva", "banco"])) {
    return { code: "BANQUE", label: "Banque", confidence: 0.82 };
  }
  return { code: "INCONNU", label: "Interlocuteur à identifier", confidence: 0 };
}

function countValues(items, selector, ignored = new Set()) {
  const counts = new Map();
  for (const item of items) {
    const value = selector(item);
    if (!value || ignored.has(value)) continue;
    counts.set(value, (counts.get(value) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function dominantValue(items, selector, ignored = new Set()) {
  const counts = countValues(items, selector, ignored);
  if (!counts.length) return { value: "", count: 0, second: 0, ratio: 0 };
  const [value, count] = counts[0];
  const second = counts[1]?.[1] || 0;
  return { value, count, second, ratio: count / Math.max(1, items.length) };
}

function dossierKind(pages, entityCode) {
  const types = new Set(pages.map((p) => p.type).filter(Boolean));
  if (entityCode === "PAC_ADMINISTRATION" || [...types].some((t) => String(t).startsWith("PAC_"))) {
    if (types.has("PAC_SOLICITUD_UNICA") && types.has("PLAN_PARCELLE")) return "DOSSIER_PAC_COMPLET_OU_ANNEXES";
    if (types.has("PAC_SOLICITUD_UNICA")) return "DOSSIER_PAC_SOLICITUD_UNICA";
    if (types.has("PAC_RESOLUTION")) return "DOSSIER_PAC_RESOLUTION";
    if (types.has("PLAN_PARCELLE")) return "DOSSIER_PAC_PLANS_PARCELLES";
    return "DOSSIER_PAC";
  }
  if (entityCode === "AGRI_SAN_JUAN") {
    if ([...types].some((t) => ["LIQUIDATION", "LIQUIDATION_FACTURE", "EXTRAIT_COMPTE", "TICKET_APPORT"].includes(t))) {
      return "DOSSIER_AGRI_SAN_JUAN_CAMPAGNE";
    }
    return "DOSSIER_AGRI_SAN_JUAN";
  }
  if (entityCode === "PELAEZ") return "DOSSIER_PELAEZ";
  return pages.length > 1 ? "DOSSIER_MULTIPAGE_A_IDENTIFIER" : "DOCUMENT_ISOLE";
}

function dateEvidence(text, date) {
  if (!date) return { trusted: false, reason: "date_absente" };
  const [year, month, day] = date.split("-");
  const variants = [
    `${day}/${month}/${year}`,
    `${day}-${month}-${year}`,
    `${day}.${month}.${year}`,
    `${year}/${month}/${day}`,
    `${year}-${month}-${day}`
  ];
  const source = normalizeText(text);
  const labelled = ["fecha emision", "fecha de emision", "fecha:", "fecha ", "date:", "desde fecha", "hasta fecha"];
  const nearLabel = labelled.some((label) => {
    const pos = source.indexOf(label);
    if (pos < 0) return false;
    const window = source.slice(pos, pos + 120);
    return variants.some((v) => window.includes(normalizeText(v)));
  });
  if (nearLabel) return { trusted: true, reason: "date_libellee_dans_document" };
  return { trusted: false, reason: "date_non_libellee" };
}

function groupDateContext(pages) {
  const dated = pages.filter((p) => p.date);
  const counts = countValues(dated, (p) => p.date);
  const repeated = counts.filter(([, count]) => count >= 2);
  const trusted = [];

  for (const page of dated) {
    const evidence = dateEvidence(page.reading?.textExcerpt || "", page.date);
    const repeatCount = counts.find(([d]) => d === page.date)?.[1] || 0;
    if (evidence.trusted || repeatCount >= 2) {
      trusted.push({ date: page.date, reason: evidence.trusted ? evidence.reason : "date_repetee_dans_dossier" });
    }
  }

  const uniqueTrusted = [...new Set(trusted.map((x) => x.date))].sort();
  return {
    trustedDates: uniqueTrusted,
    earliestTrusted: uniqueTrusted[0] || "",
    latestTrusted: uniqueTrusted.at(-1) || "",
    repeatedDates: repeated.map(([date, count]) => ({ date, count }))
  };
}

function buildGroups(documents) {
  const map = new Map();
  for (const doc of documents) {
    const key = scannerGroupKey(doc.originalName);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(doc);
  }
  return [...map.entries()].map(([key, pages]) => ({
    key,
    pages: [...pages].sort((a, b) => pageNumber(a.originalName) - pageNumber(b.originalName))
  }));
}

function applyContext(group) {
  const pages = group.pages;
  const combinedText = pages.map((p) => p.reading?.textExcerpt || "").join("\n\n--- PAGE ---\n\n");
  const explicitEntity = detectDossierEntity(combinedText);
  const dominantEntity = dominantValue(pages, (p) => p.entity?.code, new Set(["INCONNU"]));

  let dossierEntity = explicitEntity;
  let entitySource = explicitEntity.code !== "INCONNU" ? "texte_combine" : "aucun";

  if (dossierEntity.code === "INCONNU" && dominantEntity.value) {
    const strong = dominantEntity.count >= 2 || (pages.length <= 3 && dominantEntity.count >= 1);
    if (strong) {
      dossierEntity = {
        code: dominantEntity.value,
        label: pages.find((p) => p.entity?.code === dominantEntity.value)?.entity?.label || dominantEntity.value,
        confidence: dominantEntity.count >= 2 ? 0.82 : 0.62
      };
      entitySource = "pages_du_dossier";
    }
  }

  const kind = dossierKind(pages, dossierEntity.code);
  const dates = groupDateContext(pages);
  const dominantCampaign = dominantValue(pages, (p) => p.campaign);
  const campaign = dominantCampaign.count >= 2 ? dominantCampaign.value : (dominantCampaign.count === 1 && pages.length <= 2 ? dominantCampaign.value : "");

  const updatedPages = pages.map((page) => {
    const result = structuredClone(page);
    const unknownEntity = result.entity?.code === "INCONNU";
    const unknownType = result.type === "NON_IDENTIFIE";

    result.dossierKey = group.key;
    result.dossierKind = kind;
    result.pageNumber = pageNumber(result.originalName);
    result.context = {
      multipage: !isSingleGroup(group.key) && pages.length > 1,
      dossierEntity: dossierEntity.code,
      dossierEntityConfidence: dossierEntity.confidence,
      entitySource,
      inheritedEntity: false,
      inheritedCampaign: false,
      pageTypeStillUnknown: unknownType
    };

    if (unknownEntity && dossierEntity.code !== "INCONNU" && dossierEntity.confidence >= 0.8) {
      result.entity = { ...dossierEntity, inheritedFromDossier: true };
      result.context.inheritedEntity = true;
      if (result.suggestedCategory === "verifier") {
        if (dossierEntity.code === "PAC_ADMINISTRATION") result.suggestedCategory = "pac";
        if (dossierEntity.code === "AGRI_SAN_JUAN") result.suggestedCategory = "cooperative";
        if (dossierEntity.code === "PELAEZ") result.suggestedCategory = "pelaez";
      }
    }

    if (!result.campaign && campaign) {
      result.campaign = campaign;
      result.context.inheritedCampaign = true;
    }

    const evidence = dateEvidence(result.reading?.textExcerpt || "", result.date);
    const repeatCount = dates.repeatedDates.find((x) => x.date === result.date)?.count || 0;
    result.dateTrust = result.date
      ? (evidence.trusted || repeatCount >= 2
        ? { trusted: true, reason: evidence.trusted ? evidence.reason : "date_repetee_dans_dossier" }
        : { trusted: false, reason: "date_isolee_non_confirmee" })
      : { trusted: false, reason: "date_absente" };

    const contextEnough = ["lu", "lu_ocr"].includes(result.reading?.status)
      && result.entity?.code !== "INCONNU"
      && result.suggestedCategory !== "verifier";

    result.needsReview = !contextEnough || (unknownType && kind === "DOSSIER_MULTIPAGE_A_IDENTIFIER");
    return result;
  });

  return {
    dossier: {
      key: group.key,
      multipage: !isSingleGroup(group.key) && pages.length > 1,
      pageCount: pages.length,
      files: pages.map((p) => p.originalName),
      entity: dossierEntity,
      entitySource,
      kind,
      campaign,
      dateContext: dates,
      pageTypes: Object.fromEntries(countValues(pages, (p) => p.type).map(([k, v]) => [k, v])),
      unknownPagesBeforeContext: pages.filter((p) => p.entity?.code === "INCONNU" || p.type === "NON_IDENTIFIE").length
    },
    pages: updatedPages
  };
}

function anomalyForPage(page) {
  const anomalies = [];
  if (page.entity?.code === "INCONNU") {
    anomalies.push({
      type: "INTERLOCUTEUR_INCONNU",
      document: page.originalName,
      dossierKey: page.dossierKey,
      priority: "moyenne",
      message: "Interlocuteur non identifié même après contexte du dossier."
    });
  }
  if (page.type === "NON_IDENTIFIE" && page.dossierKind === "DOSSIER_MULTIPAGE_A_IDENTIFIER") {
    anomalies.push({
      type: "TYPE_DOCUMENT_INCONNU",
      document: page.originalName,
      dossierKey: page.dossierKey,
      priority: "moyenne",
      message: "Type de document non identifié et dossier lui-même encore inconnu."
    });
  }
  if (page.date && !page.dateTrust?.trusted) {
    anomalies.push({
      type: "DATE_NON_FIABLE",
      document: page.originalName,
      dossierKey: page.dossierKey,
      priority: "basse",
      value: page.date,
      message: "Date détectée mais non confirmée par un libellé ou une répétition dans le dossier. Elle ne doit pas servir à dater l'exploitation."
    });
  }
  return anomalies;
}

function buildReport(payload) {
  const s = payload.summary;
  const lines = [
    "# FINCA MARIA — Analyse contextuelle V3",
    "",
    "Cette étape regroupe les pages CamScanner en dossiers et utilise le contexte des pages voisines. Elle ne déplace, ne renomme et ne classe aucun original.",
    "",
    "## Résumé",
    "",
    `- Pages analysées : **${s.pages}**`,
    `- Dossiers documentaires : **${s.dossiers}**`,
    `- Dossiers multipages : **${s.multiPageDossiers}**`,
    `- Pages encore à revoir après contexte : **${s.pagesNeedingReview}**`,
    `- Pages avec interlocuteur encore inconnu : **${s.unknownEntityPages}**`,
    `- Dates fiables pour la chronologie : **${s.trustedDates}**`,
    `- Période fiable détectée : **${s.earliestTrustedDate || "?"} → ${s.latestTrustedDate || "?"}**`,
    "",
    "## Dossiers reconnus",
    ""
  ];

  for (const [kind, count] of Object.entries(s.byDossierKind)) {
    lines.push(`- ${kind} : ${count}`);
  }

  lines.push("", "## Principe d'analyse", "");
  lines.push("Une page annexe sans en-tête peut hériter de l'interlocuteur du dossier lorsque plusieurs pages du même lot apportent une preuve suffisante. Son type précis reste toutefois distinct : le contexte ne transforme pas artificiellement un plan en facture ou une annexe en demande PAC.");
  lines.push("", "Les dates isolées non libellées sont conservées comme indices mais exclues de la période historique fiable tant qu'elles ne sont pas confirmées.");
  return lines.join("\n") + "\n";
}

function main() {
  if (!fs.existsSync(INPUT_FILE)) {
    throw new Error(`Analyse V2 introuvable : ${INPUT_FILE}`);
  }

  const input = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));
  const documents = Array.isArray(input.documents) ? input.documents : [];
  const groups = buildGroups(documents);

  const dossierResults = groups.map(applyContext);
  const dossiers = dossierResults.map((x) => x.dossier);
  const pages = dossierResults.flatMap((x) => x.pages);
  const anomalies = pages.flatMap(anomalyForPage);

  const trustedDateValues = pages
    .filter((p) => p.date && p.dateTrust?.trusted)
    .map((p) => p.date)
    .sort();

  const byDossierKind = {};
  for (const dossier of dossiers) {
    byDossierKind[dossier.kind] = (byDossierKind[dossier.kind] || 0) + 1;
  }

  const payload = {
    version: 3,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT_FILE,
    sourceGeneratedAt: input.generatedAt || "",
    project: "FINCA MARIA",
    purpose: "Reconstituer des dossiers documentaires cohérents à partir des pages CamScanner, exploiter le contexte entre pages et fiabiliser la chronologie avant l'analyse historique de l'exploitation.",
    summary: {
      pages: pages.length,
      dossiers: dossiers.length,
      multiPageDossiers: dossiers.filter((d) => d.multipage).length,
      pagesNeedingReview: pages.filter((p) => p.needsReview).length,
      unknownEntityPages: pages.filter((p) => p.entity?.code === "INCONNU").length,
      unknownTypePages: pages.filter((p) => p.type === "NON_IDENTIFIE").length,
      trustedDates: trustedDateValues.length,
      earliestTrustedDate: trustedDateValues[0] || "",
      latestTrustedDate: trustedDateValues.at(-1) || "",
      anomalies: anomalies.length,
      byDossierKind
    },
    dossiers,
    documents: pages,
    anomalies,
    missingDocumentRequests: (input.missingDocumentRequests || []).map((request) => ({
      ...request,
      provisional: true,
      note: "Demande provisoire tant que l'ensemble du fonds documentaire n'a pas été analysé."
    }))
  };

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(payload, null, 2), "utf-8");
  fs.writeFileSync(DOSSIERS_FILE, JSON.stringify({ generatedAt: payload.generatedAt, dossiers }, null, 2), "utf-8");
  fs.writeFileSync(ANOMALIES_FILE, JSON.stringify({ generatedAt: payload.generatedAt, anomalies }, null, 2), "utf-8");
  fs.writeFileSync(REPORT_FILE, buildReport(payload), "utf-8");

  console.log("=== FINCA MARIA — ANALYSE CONTEXTUELLE V3 ===");
  console.log("Pages analysées :", payload.summary.pages);
  console.log("Dossiers documentaires :", payload.summary.dossiers);
  console.log("Dossiers multipages :", payload.summary.multiPageDossiers);
  console.log("Pages encore à revoir :", payload.summary.pagesNeedingReview);
  console.log("Interlocuteur encore inconnu :", payload.summary.unknownEntityPages);
  console.log("Types de page encore inconnus :", payload.summary.unknownTypePages);
  console.log("Dates fiables :", payload.summary.trustedDates);
  console.log("Période fiable :", `${payload.summary.earliestTrustedDate || "?"} -> ${payload.summary.latestTrustedDate || "?"}`);
  console.log("Anomalies conservées :", payload.summary.anomalies);
  console.log("Analyse :", OUTPUT_FILE);
  console.log("Dossiers :", DOSSIERS_FILE);
  console.log("Anomalies :", ANOMALIES_FILE);
  console.log("Rapport :", REPORT_FILE);
  console.log("Aucun original n'a été déplacé, renommé ou classé.");
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
