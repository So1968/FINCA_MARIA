#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const OUTPUT = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V20.json");
const CORRECTIONS = path.join(ROOT, "_CORRECTIONS_PREUVES_PRODUCTION_V20.json");
const REPORT = path.join(ROOT, "_RAPPORT_PREUVES_PRODUCTION_V20.md");

const PRODUCTION_TYPES = new Set([
  "TICKET_APPORT",
  "LIQUIDATION",
  "LIQUIDATION_FACTURE",
  "EXTRACTO_VALES_ALMAZARA"
]);

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

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function parseEsNumber(value) {
  if (value === null || value === undefined) return null;
  let s = String(value).trim().replace(/\s/g, "");
  if (!s) return null;
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d+(?:,\d+)?$/.test(s)) s = s.replace(",", ".");
  else if (/^\d+(?:\.\d+)?$/.test(s)) {
    // conserve le point décimal déjà normalisé
  } else return null;
  const x = Number(s);
  return Number.isFinite(x) ? x : null;
}

function round(value, digits = 4) {
  const x = n(value);
  if (x === null) return null;
  const p = 10 ** digits;
  return Math.round(x * p) / p;
}

function normalizeYearPart(raw) {
  const s = String(raw || "");
  const x = Number(s);
  if (!Number.isFinite(x)) return null;
  if (s.length === 4) return x;
  return x >= 70 ? 1900 + x : 2000 + x;
}

function normalizeCampaign(aRaw, bRaw) {
  const a = normalizeYearPart(aRaw);
  let b = normalizeYearPart(bRaw);
  if (!a || !b) return "";
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

function extractProductionFacts(text) {
  const source = String(text || "");
  const out = {};

  // Lignes de liquidation typiques : 1.405 264,82 18,85 0,00
  const tablePatterns = [
    /(?:\d{2}[\/]\d{2}[\/]\d{2}[^\n]{0,120}?)?(\d{1,3}(?:\.\d{3})+|\d{3,6})\s+(\d{1,6}[,.]\d{1,4})\s+(\d{1,3}[,.]\d{1,4})\s+(\d{1,3}[,.]\d{1,4})/g,
    /Vales\s+Kg\.?\s*Aceituna\s+Kg\.?\s*Aceite\s+%?Rdto\.?\s+Acidez[\s\S]{0,120}?(\d+)\s+(\d{1,3}(?:\.\d{3})+|\d{3,6})\s+(\d{1,6}[,.]\d{1,4})\s+(\d{1,3}[,.]\d{1,4})\s+(\d{1,3}[,.]\d{1,4})/i
  ];

  for (const pattern of tablePatterns) {
    const m = pattern.exec(source);
    if (!m) continue;
    if (m.length === 5) {
      const olive = parseEsNumber(m[1]);
      const oil = parseEsNumber(m[2]);
      const yieldPct = parseEsNumber(m[3]);
      const acidity = parseEsNumber(m[4]);
      if (olive !== null && oil !== null && yieldPct !== null && olive > 100 && oil > 0 && yieldPct > 1 && yieldPct < 60) {
        out.oliveKg = olive;
        out.oilKg = oil;
        out.yieldPct = yieldPct;
        if (acidity !== null) out.acidity = acidity;
        break;
      }
    } else if (m.length >= 6) {
      const olive = parseEsNumber(m[2]);
      const oil = parseEsNumber(m[3]);
      const yieldPct = parseEsNumber(m[4]);
      const acidity = parseEsNumber(m[5]);
      if (olive !== null && oil !== null && yieldPct !== null) {
        out.oliveKg = olive;
        out.oilKg = oil;
        out.yieldPct = yieldPct;
        if (acidity !== null) out.acidity = acidity;
        break;
      }
    }
  }

  const oliveLabel = source.match(/Kg\.?\s*Aceituna\s*:\s*([\d.,]+)/i);
  const oilLabel = source.match(/Kg\.?\s*Aceite\s*:\s*([\d.,]+)/i);
  if (oliveLabel && out.oliveKg === undefined) out.oliveKg = parseEsNumber(oliveLabel[1]);
  if (oilLabel && out.oilKg === undefined) out.oilKg = parseEsNumber(oilLabel[1]);

  return Object.fromEntries(Object.entries(out).filter(([, value]) => value !== null && value !== undefined));
}

function mergeFacts(doc) {
  const parsed = extractProductionFacts(doc?.reading?.textExcerpt || "");
  const merged = {
    ...(doc?.facts || {}),
    ...(doc?.factsV7 || {}),
    ...parsed
  };
  return {
    facts: merged,
    parsedFromText: parsed,
    recoveredKeys: Object.keys(parsed).filter((key) => n(doc?.factsV7?.[key] ?? doc?.facts?.[key]) === null)
  };
}

function close(a, b, tolerance) {
  const x = n(a), y = n(b);
  if (x === null || y === null) return false;
  return Math.abs(x - y) <= tolerance;
}

function fingerprintMatch(a, b) {
  let matches = 0;
  if (close(a.oliveKg, b.oliveKg, 0.5)) matches += 1;
  if (close(a.oilKg, b.oilKg, 0.5)) matches += 1;
  if (close(a.yieldPct, b.yieldPct, 0.05)) matches += 1;
  return matches >= 2;
}

function fingerprintKey(facts) {
  const olive = n(facts?.oliveKg);
  const oil = n(facts?.oilKg);
  const yieldPct = n(facts?.yieldPct);
  if (olive === null || oil === null) return "";
  return `${round(olive, 1)}|${round(oil, 2)}|${yieldPct === null ? "?" : round(yieldPct, 3)}`;
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function main() {
  const input = readJson(INPUT);
  const documents = Array.isArray(input.documents) ? input.documents : [];

  const productionDocs = documents
    .filter((doc) => (doc.refinedEntity?.code || doc.entity?.code) === "AGRI_SAN_JUAN")
    .filter((doc) => PRODUCTION_TYPES.has(doc.refinedType?.code || doc.type));

  const observations = productionDocs.map((doc) => {
    const type = doc.refinedType?.code || doc.type || "";
    const merged = mergeFacts(doc);
    const explicit = explicitCampaign(doc?.reading?.textExcerpt || "");
    const inferredSource = doc?.campaignInference?.source || "";
    const inferredCampaign = doc?.campaignInference?.campaign || "";
    const currentCampaign = doc?.campaign || "";

    let campaign = "";
    let campaignSource = "none";
    let campaignConfidence = 0;

    if (explicit?.campaign) {
      campaign = explicit.campaign;
      campaignSource = "texte_document_explicite";
      campaignConfidence = 1;
    } else if (inferredSource === "document" && inferredCampaign) {
      campaign = inferredCampaign;
      campaignSource = "campaignInference_document";
      campaignConfidence = doc?.campaignInference?.confidence ?? 0.95;
    }

    return {
      documentId: doc.documentId || "",
      document: doc.originalName || "",
      type,
      date: doc.date || "",
      currentCampaign,
      currentCampaignInference: doc.campaignInference || null,
      explicitCampaign: explicit?.campaign || "",
      explicitCampaignEvidence: explicit?.matchedText || "",
      campaign,
      campaignSource,
      campaignConfidence,
      facts: merged.facts,
      parsedFromText: merged.parsedFromText,
      recoveredFactKeys: merged.recoveredKeys,
      productionFingerprint: fingerprintKey(merged.facts)
    };
  });

  // Deuxième passe : une pièce sans campagne explicite peut être rattachée si son empreinte
  // de production concorde avec des pièces explicites et qu'une seule campagne en ressort.
  for (const obs of observations) {
    if (obs.campaign) continue;
    const matches = observations.filter((other) =>
      other !== obs &&
      other.campaign &&
      other.campaignConfidence >= 0.95 &&
      fingerprintMatch(obs.facts, other.facts)
    );
    const campaigns = unique(matches.map((x) => x.campaign));
    if (campaigns.length === 1) {
      obs.campaign = campaigns[0];
      obs.campaignSource = "empreinte_production_corroboree";
      obs.campaignConfidence = 0.96;
      obs.corroboratedBy = matches.map((x) => x.document);
    }
  }

  const corrections = observations
    .filter((obs) => obs.recoveredFactKeys.length > 0 || (obs.campaign && obs.currentCampaign !== obs.campaign))
    .map((obs) => ({
      documentId: obs.documentId,
      document: obs.document,
      currentCampaign: obs.currentCampaign,
      correctedCampaign: obs.campaign,
      campaignSource: obs.campaignSource,
      campaignConfidence: obs.campaignConfidence,
      recoveredFactKeys: obs.recoveredFactKeys,
      facts: obs.facts,
      corroboratedBy: obs.corroboratedBy || []
    }));

  const groups = [];
  for (const obs of observations.filter((x) => x.campaign && n(x.facts?.oliveKg) !== null && n(x.facts?.oilKg) !== null)) {
    let group = groups.find((g) => g.campaign === obs.campaign && g.members.some((m) => fingerprintMatch(m.facts, obs.facts)));
    if (!group) {
      group = { campaign: obs.campaign, members: [] };
      groups.push(group);
    }
    group.members.push(obs);
  }

  const evidenceGroups = groups.map((group, index) => {
    const facts = group.members
      .map((m) => m.facts)
      .sort((a, b) => Object.keys(b).length - Object.keys(a).length)[0] || {};
    return {
      evidenceGroupId: `${group.campaign}__V20P${String(index + 1).padStart(2, "0")}`,
      campaign: group.campaign,
      facts: {
        oliveKg: round(facts.oliveKg, 2),
        oilKg: round(facts.oilKg, 2),
        yieldPct: round(facts.yieldPct, 4),
        acidity: round(facts.acidity, 4)
      },
      evidenceCount: group.members.length,
      documents: group.members.map((m) => m.document),
      documentTypes: unique(group.members.map((m) => m.type)),
      campaignSources: unique(group.members.map((m) => m.campaignSource)),
      sameUnderlyingProductionFact: true,
      doNotSumEvidenceDocuments: group.members.length > 1
    };
  });

  const control2010Groups = evidenceGroups.filter((g) =>
    g.campaign === "2010-2011" &&
    close(g.facts.oliveKg, 1405, 0.5) &&
    close(g.facts.oilKg, 264.82, 0.5) &&
    close(g.facts.yieldPct, 18.85, 0.05)
  );

  const control2010 = {
    status: control2010Groups.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : control2010Groups.length === 0 ? "OBSERVATION_CONNUE_NON_RETROUVEE" : "RISQUE_DOUBLE_COMPTAGE",
    groups: control2010Groups.length,
    documents: unique(control2010Groups.flatMap((g) => g.documents)),
    expectedFacts: { oliveKg: 1405, oilKg: 264.82, yieldPct: 18.85 }
  };

  const summary = {
    productionDocumentsAudited: observations.length,
    factsRecoveredFromText: observations.filter((o) => o.recoveredFactKeys.length > 0).length,
    campaignsCorrectedByExplicitTextOrFingerprint: corrections.filter((c) => c.currentCampaign !== c.correctedCampaign).length,
    productionEvidenceGroups: evidenceGroups.length,
    control2010_2011: control2010
  };

  const payload = {
    version: 20,
    generatedAt: new Date().toISOString(),
    basedOn: INPUT,
    purpose: "Fiabiliser les faits de production depuis le texte documentaire, corriger les campagnes seulement lorsqu'une preuve explicite ou une empreinte de production corroborée l'autorise, puis regrouper les justificatifs du même fait sans double comptage.",
    summary,
    observations,
    evidenceGroups,
    corrections
  };

  writeJson(OUTPUT, payload);
  writeJson(CORRECTIONS, { generatedAt: payload.generatedAt, corrections });

  const lines = [
    "# FINCA MARIA — Preuves de production fiabilisées V20",
    "",
    `- Documents de production Agri San Juan audités : **${summary.productionDocumentsAudited}**`,
    `- Documents dont des faits ont été récupérés depuis le texte : **${summary.factsRecoveredFromText}**`,
    `- Campagnes corrigées par preuve explicite ou empreinte corroborée : **${summary.campaignsCorrectedByExplicitTextOrFingerprint}**`,
    `- Groupes de preuves de production : **${summary.productionEvidenceGroups}**`,
    "",
    "## Contrôle 2010-2011",
    `- Statut : **${control2010.status}**`,
    `- Groupes correspondant à 1 405 kg / 264,82 kg / ~18,85 % : **${control2010.groups}**`,
    `- Documents associés : **${control2010.documents.length}**`,
    ...control2010.documents.map((name) => `  - ${name}`),
    "",
    "Les pièces concordantes restent des preuves séparées mais sont regroupées comme un seul fait de production. Elles ne doivent pas être additionnées entre elles."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — PREUVES PRODUCTION V20 ===");
  console.log("Documents de production audités :", summary.productionDocumentsAudited);
  console.log("Faits récupérés depuis le texte :", summary.factsRecoveredFromText);
  console.log("Campagnes corrigées :", summary.campaignsCorrectedByExplicitTextOrFingerprint);
  console.log("Groupes de preuves production :", summary.productionEvidenceGroups);
  console.log("Contrôle 2010-2011 :", control2010.status, "| groupes", control2010.groups, "| documents", control2010.documents.length);
  for (const name of control2010.documents) console.log(" -", name);
  console.log("Sortie :", OUTPUT);
  console.log("Corrections :", CORRECTIONS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie de travail n'a été déplacé, renommé, classé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V20 :", error.message || error);
  process.exitCode = 1;
}
