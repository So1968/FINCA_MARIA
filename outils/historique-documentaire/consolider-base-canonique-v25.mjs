#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const V18 = path.join(ROOT, "_ANALYSE_EXPLOITATION_V18.json");
const V24 = path.join(ROOT, "_PREUVES_PRODUCTION_FIABILISEES_V24.json");
const OUTPUT = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V25.json");
const REQUESTS = path.join(ROOT, "_PIECES_A_DEMANDER_V25.json");
const GAPS = path.join(ROOT, "_LACUNES_CAMPAGNES_V25.json");
const REPORT = path.join(ROOT, "_RAPPORT_BASE_CANONIQUE_V25.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function unique(arr) {
  return [...new Set(arr.filter(Boolean))];
}

function validCampaign(value) {
  const m = String(value || "").match(/^((?:19|20)\d{2})-((?:19|20)\d{2})$/);
  return !!(m && Number(m[2]) === Number(m[1]) + 1);
}

function n(value) {
  const x = Number(value);
  return Number.isFinite(x) ? x : null;
}

function close(a, b, tolerance) {
  const x = n(a), y = n(b);
  if (x === null || y === null) return false;
  return Math.abs(x - y) <= tolerance;
}

const FACT_FIELDS = [
  ["oliveKg", 0.5],
  ["oilKg", 0.5],
  ["yieldPct", 0.05],
  ["acidity", 0.05]
];

function sameUnderlyingFact(a, b) {
  let comparable = 0;
  let matches = 0;
  for (const [key, tolerance] of FACT_FIELDS) {
    if (n(a?.[key]) === null || n(b?.[key]) === null) continue;
    comparable += 1;
    if (close(a[key], b[key], tolerance)) matches += 1;
  }
  return comparable >= 2 && matches >= 2;
}

function factRichness(facts) {
  return ["oliveKg", "oilKg", "yieldPct", "acidity", "grossLiquidation", "taxBase", "netToReceive"]
    .filter((k) => n(facts?.[k]) !== null).length;
}

function campaignFromShort(startShort, endShort) {
  const a = Number(startShort), b = Number(endShort);
  if (!Number.isInteger(a) || !Number.isInteger(b)) return "";
  const start = a <= 35 ? 2000 + a : 1900 + a;
  const end = b <= 35 ? 2000 + b : 1900 + b;
  return end === start + 1 ? `${start}-${end}` : "";
}

function extractAccountLiquidationReferences(documents) {
  const refs = [];
  const re = /LIQUIDACION\s+CAMPA(?:Ñ|N)A\s+(\d{2})\s*[\/-]\s*(\d{2})/gi;
  for (const doc of documents) {
    const type = doc?.refinedType?.code || doc?.type || "";
    if (type !== "EXTRAIT_COMPTE") continue;
    const text = String(doc?.reading?.textExcerpt || "");
    let m;
    while ((m = re.exec(text))) {
      const campaign = campaignFromShort(m[1], m[2]);
      if (!campaign) continue;
      refs.push({
        campaign,
        document: doc.originalName,
        date: doc.date || "",
        evidence: m[0],
        source: "extrait_compte_mention_explicite"
      });
    }
  }
  return refs;
}

const MONTHS_ES = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10,
  noviembre: 11, diciembre: 12
};

function isoDate(y, m, d) {
  return `${String(y).padStart(4, "0")}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function recoverTicketApport(text) {
  const source = String(text || "");
  const result = { facts: {}, provenance: {}, date: "", campaign: "" };

  const campaignMatch = source.match(/Campa(?:ñ|n)a\s*:\s*((?:19|20)\d{2})\s*[-/]\s*((?:19|20)\d{2})/i);
  if (campaignMatch) {
    const candidate = `${campaignMatch[1]}-${campaignMatch[2]}`;
    if (validCampaign(candidate)) result.campaign = candidate;
  }

  const dateMatch = source.match(/\b(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\s+de\s+((?:19|20)\d{2})\b/i);
  if (dateMatch) {
    const month = MONTHS_ES[dateMatch[2].toLowerCase()];
    if (month) result.date = isoDate(Number(dateMatch[3]), month, Number(dateMatch[1]));
  }

  const totalRe = /Total\s*\(Kg\.\)[^\n]*\n\s*([0-9]{1,3}(?:[.\s][0-9]{3})+|[0-9]{4,6})\s*(?:\n|$)/gi;
  const weights = [];
  let wm;
  while ((wm = totalRe.exec(source))) {
    const value = Number(wm[1].replace(/[.\s]/g, ""));
    if (Number.isFinite(value) && value > 0 && value < 200000) weights.push({ raw: wm[1], value });
  }
  if (weights.length) {
    const chosen = weights.at(-1);
    result.facts.oliveKg = chosen.value;
    result.provenance.oliveKg = {
      status: "document_lisible",
      confidence: 1,
      evidence: `Total (Kg.) ${chosen.raw}`
    };
  }

  return result;
}

function rebuildEvidenceGroups(observations) {
  const candidates = observations.filter((o) =>
    validCampaign(o.campaign) &&
    ["TICKET_APPORT", "LIQUIDATION", "LIQUIDATION_FACTURE", "EXTRACTO_VALES_ALMAZARA"].includes(o.type) &&
    ["oliveKg", "oilKg", "yieldPct"].some((k) => n(o?.facts?.[k]) !== null)
  );

  const groups = [];
  for (const obs of candidates) {
    let group = groups.find((g) =>
      g.campaign === obs.campaign &&
      g.members.some((m) => sameUnderlyingFact(m.facts, obs.facts))
    );
    if (!group) {
      group = { campaign: obs.campaign, members: [] };
      groups.push(group);
    }
    group.members.push(obs);
  }

  return groups.map((group, index) => {
    const representative = [...group.members].sort((a, b) => factRichness(b.facts) - factRichness(a.facts))[0];
    const documents = unique(group.members.map((m) => m.document));
    const quantitativeFields = unique(group.members.flatMap((m) =>
      ["oliveKg", "oilKg", "yieldPct", "acidity"].filter((k) => n(m?.facts?.[k]) !== null)
    ));
    return {
      evidenceGroupId: `${group.campaign}__V25P${String(index + 1).padStart(2, "0")}`,
      campaign: group.campaign,
      facts: representative?.facts || {},
      evidenceCount: group.members.length,
      documents,
      documentTypes: unique(group.members.map((m) => m.type)),
      campaignSources: unique(group.members.map((m) => m.campaignSource)),
      quantitativeFields,
      completeness: n(representative?.facts?.oliveKg) !== null && n(representative?.facts?.oilKg) !== null && n(representative?.facts?.yieldPct) !== null
        ? "olive_huile_rendement"
        : n(representative?.facts?.oliveKg) !== null
          ? "production_partielle_olive"
          : "production_partielle",
      sameUnderlyingProductionFact: group.members.length > 1,
      doNotSumEvidenceDocuments: group.members.length > 1,
      provenance: group.members.map((m) => ({
        document: m.document,
        type: m.type,
        campaignSource: m.campaignSource,
        campaignConfidence: m.campaignConfidence,
        factProvenance: m.factProvenance || null
      }))
    };
  });
}

function enumerateCampaignGaps(campaignNames) {
  if (!campaignNames.length) return [];
  const starts = campaignNames.map((c) => Number(c.slice(0, 4))).sort((a, b) => a - b);
  const present = new Set(starts);
  const gaps = [];
  for (let y = starts[0]; y <= starts.at(-1); y += 1) {
    if (present.has(y)) continue;
    gaps.push({
      campaign: `${y}-${y + 1}`,
      status: "a_verifier",
      certainty: "lacune_documentaire_seulement",
      note: "Aucune preuve documentaire de campagne n'est actuellement rattachée dans la base. Cela ne prouve pas l'absence de production."
    });
  }
  return gaps;
}

function main() {
  const v18 = readJson(V18);
  const v24 = readJson(V24);
  const documents = Array.isArray(v18.documents) ? v18.documents : [];
  const docsByName = new Map(documents.map((d) => [d.originalName, d]));
  const observations = structuredClone(Array.isArray(v24.observations) ? v24.observations : []);
  const chronology = Array.isArray(v18.chronology) ? v18.chronology : [];

  const ticketCorrections = [];
  for (const obs of observations.filter((o) => o.type === "TICKET_APPORT")) {
    const doc = docsByName.get(obs.document);
    if (!doc) continue;
    const recovered = recoverTicketApport(doc?.reading?.textExcerpt || "");
    const before = { date: obs.date || "", campaign: obs.campaign || "", facts: structuredClone(obs.facts || {}) };
    let changed = false;

    if (!obs.date && recovered.date) {
      obs.date = recovered.date;
      changed = true;
    }
    if ((!validCampaign(obs.campaign) || !obs.campaign) && recovered.campaign) {
      obs.campaign = recovered.campaign;
      obs.campaignSource = "ticket_campagne_explicite";
      obs.campaignConfidence = 1;
      changed = true;
    }
    for (const [key, value] of Object.entries(recovered.facts)) {
      if (n(obs?.facts?.[key]) === null) {
        obs.facts = { ...(obs.facts || {}), [key]: value };
        obs.factProvenance = { ...(obs.factProvenance || {}), [key]: recovered.provenance[key] };
        obs.recoveredFactKeys = unique([...(obs.recoveredFactKeys || []), key]);
        changed = true;
      }
    }

    if (changed) {
      ticketCorrections.push({
        document: obs.document,
        before,
        after: { date: obs.date || "", campaign: obs.campaign || "", facts: obs.facts },
        source: "lecture_structuree_ticket_apport"
      });
    }
  }

  const invalidCampaigns = observations
    .filter((o) => o.campaign && !validCampaign(o.campaign))
    .map((o) => ({ document: o.document, campaign: o.campaign }));
  if (invalidCampaigns.length) {
    throw new Error(`Campagne(s) impossible(s) encore présente(s) : ${JSON.stringify(invalidCampaigns)}`);
  }

  const evidenceGroups = rebuildEvidenceGroups(observations);
  const accountMovements = chronology
    .filter((e) => e.entity === "AGRI_SAN_JUAN")
    .filter((e) => e.type === "MOUVEMENT_EXTRAIT_COMPTE")
    .filter((e) => validCampaign(e.campaign))
    .map((e) => ({
      date: e.date || "",
      campaign: e.campaign,
      documentId: e.documentId || "",
      document: e.document || "",
      concept: e.concept || "",
      source: e.source || ""
    }));

  const liquidationRefs = extractAccountLiquidationReferences(documents);
  const campaignNames = unique([
    ...observations.map((o) => validCampaign(o.campaign) ? o.campaign : ""),
    ...accountMovements.map((m) => m.campaign),
    ...liquidationRefs.map((r) => r.campaign)
  ]).sort();

  const campaigns = campaignNames.map((campaign) => {
    const obs = observations.filter((o) => o.campaign === campaign);
    const groups = evidenceGroups.filter((g) => g.campaign === campaign);
    const movements = accountMovements.filter((m) => m.campaign === campaign);
    const explicitRefs = liquidationRefs.filter((r) => r.campaign === campaign);
    const types = unique(obs.map((o) => o.type));
    const documentsForCampaign = unique([
      ...obs.map((o) => o.document),
      ...groups.flatMap((g) => g.documents || []),
      ...movements.map((m) => m.document),
      ...explicitRefs.map((r) => r.document)
    ]);

    const evidenceLevel = groups.length > 0
      ? "production_quantitative_documentee"
      : obs.length > 0
        ? "production_documentee_non_quantifiee"
        : explicitRefs.length > 0
          ? "campagne_attestee_par_liquidation_comptable"
          : "campagne_attestee_par_mouvements_compte";

    return {
      campaign,
      evidenceLevel,
      productionObservationDocuments: obs.length,
      productionEvidenceGroups: groups.length,
      accountMovements: movements.length,
      explicitLiquidationReferences: explicitRefs,
      documentTypes: types,
      sourceDocuments: documentsForCampaign,
      productionEvidence: groups,
      accountMovementEvidence: movements,
      safety: {
        annualTotalCalculated: false,
        reason: groups.length > 1
          ? "Plusieurs groupes de faits existent. Aucun total annuel n'est calculé avant interprétation de leurs relations."
          : "Les faits documentaires sont conservés comme preuves ; ils ne deviennent pas automatiquement un total annuel définitif."
      }
    };
  });

  const missingRequests = [];
  for (const campaign of campaigns) {
    const types = new Set(campaign.documentTypes);
    const hasLiquidationDoc = types.has("LIQUIDATION_FACTURE") || types.has("LIQUIDATION");
    const hasProductionSupport = types.has("TICKET_APPORT") || types.has("EXTRACTO_VALES_ALMAZARA") || campaign.productionEvidenceGroups > 0;
    const hasExplicitAccountingRef = campaign.explicitLiquidationReferences.length > 0;

    if (!hasLiquidationDoc && hasExplicitAccountingRef) {
      missingRequests.push({
        id: `AGRI_SAN_JUAN__${campaign.campaign}__LIQUIDATION_REFERENCEE`,
        campaign: campaign.campaign,
        status: "a_demander",
        certainty: "certaine_piece_referencee",
        priority: "haute",
        askTo: "Agri San Juan",
        askToCode: "AGRI_SAN_JUAN",
        documentWanted: `Liquidation / facture source de la campagne ${campaign.campaign}`,
        reason: "Un extrait de compte Agri San Juan mentionne explicitement une liquidation de cette campagne, mais la pièce source n'est pas identifiée dans le BAÚL.",
        supportingDocuments: campaign.explicitLiquidationReferences.map((r) => r.document),
        evidence: campaign.explicitLiquidationReferences.map((r) => r.evidence)
      });
      continue;
    }

    if (!hasLiquidationDoc && hasProductionSupport) {
      missingRequests.push({
        id: `AGRI_SAN_JUAN__${campaign.campaign}__LIQUIDATION`,
        campaign: campaign.campaign,
        status: "a_demander",
        certainty: "probable",
        priority: "haute",
        askTo: "Agri San Juan",
        askToCode: "AGRI_SAN_JUAN",
        documentWanted: `Liquidation(s) / facture(s) de la campagne ${campaign.campaign}`,
        reason: "Des preuves de production existent pour cette campagne, mais aucune liquidation/facture agricole complète n'est actuellement identifiée.",
        supportingDocuments: campaign.sourceDocuments
      });
    }
  }

  const documentaryGaps = enumerateCampaignGaps(campaignNames);
  const quantitativeCampaigns = campaigns.filter((c) => c.productionEvidenceGroups > 0);
  const accountingOnly = campaigns.filter((c) => c.productionEvidenceGroups === 0 && c.productionObservationDocuments === 0 && c.accountMovements > 0);

  const control2009 = evidenceGroups.filter((g) =>
    g.campaign === "2009-2010" &&
    close(g.facts?.oliveKg, 2537, 0.5) &&
    close(g.facts?.oilKg, 520.98, 0.1) &&
    close(g.facts?.yieldPct, 20.54, 0.1)
  );
  const control2010 = evidenceGroups.filter((g) =>
    g.campaign === "2010-2011" &&
    close(g.facts?.oliveKg, 1405, 0.5) &&
    close(g.facts?.oilKg, 264.82, 0.5) &&
    close(g.facts?.yieldPct, 18.85, 0.05)
  );
  const control2024 = evidenceGroups.filter((g) =>
    g.campaign === "2024-2025" && close(g.facts?.oliveKg, 6551, 0.5)
  );

  const summary = {
    productionObservations: observations.length,
    productionEvidenceGroups: evidenceGroups.length,
    campaignsReconstructed: campaigns.length,
    campaignsWithQuantitativeProductionEvidence: quantitativeCampaigns.length,
    campaignsOnlyAccountingEvidence: accountingOnly.length,
    historicalCampaignPeriod: {
      earliest: campaigns[0]?.campaign || "",
      latest: campaigns.at(-1)?.campaign || ""
    },
    quantitativeProductionPeriod: {
      earliest: quantitativeCampaigns[0]?.campaign || "",
      latest: quantitativeCampaigns.at(-1)?.campaign || ""
    },
    documentaryGapsToVerify: documentaryGaps.length,
    missingDocumentRequests: missingRequests.length,
    certainReferencedMissingDocuments: missingRequests.filter((r) => r.certainty === "certaine_piece_referencee").length,
    invalidCampaigns: invalidCampaigns.length,
    ticketCorrections: ticketCorrections.length,
    control2009_2010: {
      status: control2009.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : control2009.length === 0 ? "NON_RETROUVE" : "RISQUE_DOUBLE_COMPTAGE",
      groups: control2009.length,
      documents: unique(control2009.flatMap((g) => g.documents || []))
    },
    control2010_2011: {
      status: control2010.length === 1 ? "OK_UN_SEUL_FAIT_SOUS_JACENT" : control2010.length === 0 ? "NON_RETROUVE" : "RISQUE_DOUBLE_COMPTAGE",
      groups: control2010.length,
      documents: unique(control2010.flatMap((g) => g.documents || []))
    },
    control2024_2025: {
      status: control2024.length === 1 ? "OK_TICKET_6551_KG" : control2024.length === 0 ? "NON_RETROUVE" : "PLUSIEURS_GROUPES_6551",
      groups: control2024.length,
      documents: unique(control2024.flatMap((g) => g.documents || []))
    }
  };

  const payload = {
    version: 25,
    generatedAt: new Date().toISOString(),
    basedOn: { productionEvidence: V24, documentsAndAccountChronology: V18 },
    purpose: "Créer une base canonique des campagnes : intégrer les corrections V24, récupérer les faits explicites des tickets d'apport, distinguer preuve quantitative, preuve comptable et lacune documentaire, et produire des demandes de pièces avec un niveau de certitude explicite.",
    summary,
    campaigns,
    observations,
    evidenceGroups,
    accountLiquidationReferences: liquidationRefs,
    ticketCorrections,
    documentaryGaps,
    missingDocumentRequests: missingRequests
  };

  writeJson(OUTPUT, payload);
  writeJson(REQUESTS, {
    generatedAt: payload.generatedAt,
    basedOn: OUTPUT,
    requests: missingRequests
  });
  writeJson(GAPS, {
    generatedAt: payload.generatedAt,
    basedOn: OUTPUT,
    gaps: documentaryGaps
  });

  const lines = [
    "# FINCA MARIA — Base canonique des campagnes V25",
    "",
    `- Campagnes reconstruites : **${summary.campaignsReconstructed}**`,
    `- Campagnes avec preuve quantitative de production : **${summary.campaignsWithQuantitativeProductionEvidence}**`,
    `- Campagnes seulement attestées par la comptabilité : **${summary.campaignsOnlyAccountingEvidence}**`,
    `- Histoire documentaire des campagnes : **${summary.historicalCampaignPeriod.earliest || "?"} → ${summary.historicalCampaignPeriod.latest || "?"}**`,
    `- Production quantitativement documentée : **${summary.quantitativeProductionPeriod.earliest || "?"} → ${summary.quantitativeProductionPeriod.latest || "?"}**`,
    `- Lacunes de campagne à vérifier : **${summary.documentaryGapsToVerify}**`,
    `- Pièces à demander : **${summary.missingDocumentRequests}** dont **${summary.certainReferencedMissingDocuments}** pièce(s) explicitement référencée(s)`,
    `- Campagnes impossibles restantes : **${summary.invalidCampaigns}**`,
    `- Contrôle 2009-2010 : **${summary.control2009_2010.status}**`,
    `- Contrôle 2010-2011 : **${summary.control2010_2011.status}**`,
    `- Contrôle 2024-2025 : **${summary.control2024_2025.status}**`,
    "",
    "La campagne 2006-2007 peut être attestée historiquement par une mention explicite de liquidation dans un extrait de compte sans disposer encore des quantités de récolte.",
    "Les lacunes annuelles indiquent uniquement une absence actuelle de preuve dans le BAÚL ; elles ne signifient jamais automatiquement absence de production.",
    "",
    "V25 ne renomme, ne déplace et ne modifie aucun original ni copie classée."
  ];
  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — BASE CANONIQUE V25 ===");
  console.log("Campagnes reconstruites :", summary.campaignsReconstructed);
  console.log("Campagnes avec preuve quantitative :", summary.campaignsWithQuantitativeProductionEvidence);
  console.log("Campagnes seulement comptables :", summary.campaignsOnlyAccountingEvidence);
  console.log("Période historique documentée :", `${summary.historicalCampaignPeriod.earliest || "?"} -> ${summary.historicalCampaignPeriod.latest || "?"}`);
  console.log("Période quantitative :", `${summary.quantitativeProductionPeriod.earliest || "?"} -> ${summary.quantitativeProductionPeriod.latest || "?"}`);
  console.log("Lacunes à vérifier :", summary.documentaryGapsToVerify);
  console.log("Pièces à demander :", `${summary.missingDocumentRequests} | explicitement référencées ${summary.certainReferencedMissingDocuments}`);
  console.log("Campagnes impossibles :", summary.invalidCampaigns);
  console.log("Contrôle 2009-2010 :", `${summary.control2009_2010.status} | groupes ${summary.control2009_2010.groups} | documents ${summary.control2009_2010.documents.length}`);
  console.log("Contrôle 2010-2011 :", `${summary.control2010_2011.status} | groupes ${summary.control2010_2011.groups} | documents ${summary.control2010_2011.documents.length}`);
  console.log("Contrôle 2024-2025 :", `${summary.control2024_2025.status} | groupes ${summary.control2024_2025.groups} | documents ${summary.control2024_2025.documents.length}`);
  console.log("Base canonique :", OUTPUT);
  console.log("Pièces à demander :", REQUESTS);
  console.log("Lacunes :", GAPS);
  console.log("Rapport :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V25 :", error.message || error);
  process.exitCode = 1;
}
