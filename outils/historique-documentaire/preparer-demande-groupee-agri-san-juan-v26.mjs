#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const BASE = path.join(ROOT, "_BASE_CANONIQUE_CAMPAGNES_V25.json");
const PIECES_V25 = path.join(ROOT, "_PIECES_A_DEMANDER_V25.json");
const LACUNES_V25 = path.join(ROOT, "_LACUNES_CAMPAGNES_V25.json");
const OUTPUT = path.join(ROOT, "_DEMANDE_GROUPEE_AGRI_SAN_JUAN_V26.json");
const REPORT = path.join(ROOT, "_DEMANDE_GROUPEE_AGRI_SAN_JUAN_V26.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function main() {
  const base = readJson(BASE);
  const pieces = readJson(PIECES_V25);
  const lacunes = readJson(LACUNES_V25);

  const missingCampaigns = (lacunes.gaps || []).map((g) => g.campaign);
  const requestsV25 = pieces.requests || [];

  const request2006 = requestsV25.find((r) => r.campaign === "2006-2007");
  const request2024 = requestsV25.find((r) => r.campaign === "2024-2025");

  const items = [];

  if (request2006) {
    items.push({
      campaign: "2006-2007",
      requestKind: "piece_source_explicitement_referencee",
      certainty: "certaine_piece_referencee",
      priority: "haute",
      wanted: ["Liquidation / facture source de la campagne 2006-2007"],
      reason: "Deux extraits de compte Agri San Juan mentionnent explicitement « LIQUIDACION CAMPAÑA 06/07 », mais la pièce source n'est pas présente dans le BAÚL.",
      supportingDocuments: request2006.supportingDocuments || [],
      evidence: request2006.evidence || []
    });
  }

  for (const campaign of missingCampaigns) {
    items.push({
      campaign,
      requestKind: "recherche_dossier_campagne_absent_base",
      certainty: "a_verifier_aupres_agri_san_juan",
      priority: "moyenne",
      wanted: [
        `Extracto de vales / albaranes / tickets de la campaña ${campaign}`,
        `Liquidaciones / facturas / repartos de la campaña ${campaign}`,
        `Extracto de cuenta lié à la campagne ${campaign}, si disponible`
      ],
      reason: "Aucune preuve documentaire de production n'est actuellement rattachée à cette campagne dans les 302 documents analysés. Cela ne prouve pas l'absence de production ; la demande vise à vérifier si Agri San Juan possède encore le dossier.",
      supportingDocuments: []
    });
  }

  if (request2024) {
    items.push({
      campaign: "2024-2025",
      requestKind: "liquidation_manquante_sur_production_prouvee",
      certainty: "probable",
      priority: "haute",
      wanted: ["Liquidation(s) / facture(s) / reparto(s) correspondant à la campagne 2024-2025"],
      reason: "Un ticket Agri San Juan daté du 05/01/2025 prouve un apport de 6 551 kg pour la campagne 2024-2025, mais aucune liquidation/facture complète correspondante n'est actuellement identifiée dans le BAÚL.",
      supportingDocuments: request2024.supportingDocuments || []
    });
  }

  const group = {
    requestId: `AGRI_SAN_JUAN__DEMANDE_GROUPEE__${new Date().toISOString().slice(0, 10)}`,
    recipient: "Agri San Juan",
    recipientCode: "AGRI_SAN_JUAN",
    status: "a_preparer",
    nextAction: "relire_message_puis_envoyer",
    campaigns: unique(items.map((i) => i.campaign)),
    items,
    workflow: {
      states: ["a_preparer", "preparee", "envoyee", "relance_a_faire", "recue", "rapprochee"],
      sentAt: null,
      followUpDueAt: null,
      receivedAt: null,
      reconciledAt: null
    }
  };

  const spanishMessage = [
    "Asunto: Solicitud de documentación histórica – Finca Maria",
    "",
    "Buenos días,",
    "",
    "Estamos reconstruyendo el archivo histórico de las campañas de aceituna correspondientes al Finca Maria y quisiéramos saber si conservan copia de la documentación de las siguientes campañas:",
    "",
    "- 2006/2007: liquidación o factura de campaña. En nuestros extractos de cuenta aparece expresamente « LIQUIDACION CAMPAÑA 06/07 », pero no conservamos la pieza original.",
    ...missingCampaigns.map((c) => `- ${c.replace("-", "/")}: si existe, extracto de vales/albaranes o tickets, liquidaciones/facturas/repartos y extracto de cuenta relacionado con la campaña.`),
    "- 2024/2025: liquidación(es), factura(s) o reparto(s) correspondientes a la campaña. Conservamos un ticket de entrega de 6.551 kg de fecha 05/01/2025.",
    "",
    "Si alguna de estas campañas no tuvo entrega o no existe documentación disponible, nos sería muy útil que nos lo indicaran igualmente.",
    "",
    "Muchas gracias por su ayuda."
  ].join("\n");

  const payload = {
    version: 26,
    generatedAt: new Date().toISOString(),
    basedOn: {
      canonicalBase: BASE,
      requestsV25: PIECES_V25,
      gapsV25: LACUNES_V25
    },
    purpose: "Transformer les pièces manquantes et lacunes documentaires V25 en une seule demande actionnable à Agri San Juan, sans confondre pièce certainement référencée, production prouvée et simple absence documentaire dans le BAÚL.",
    canonicalSummary: base.summary || null,
    groupedRequest: group,
    spanishMessage,
    safeguards: {
      absenceInBaulDoesNotProveNoProduction: true,
      originalsModified: false,
      classifiedCopiesModified: false,
      noAutomaticClaimThatMissingCampaignsHadProduction: true
    }
  };

  writeJson(OUTPUT, payload);

  const lines = [
    "# FINCA MARIA — Demande groupée Agri San Juan V26",
    "",
    `- Interlocuteur : **Agri San Juan**`,
    `- Campagnes concernées : **${group.campaigns.join(", ")}**`,
    `- État : **${group.status}**`,
    `- Nombre de blocs demandés : **${items.length}**`,
    "",
    "## Distinction des demandes",
    "",
    "- **2006-2007** : pièce source certainement existante à l'époque, car explicitement référencée dans deux extraits de compte.",
    `- **${missingCampaigns.join(", ")}** : recherche documentaire exploratoire ; l'absence dans le BAÚL ne prouve pas l'absence de production.`,
    "- **2024-2025** : production prouvée par ticket de 6 551 kg ; liquidation/facture correspondante non retrouvée.",
    "",
    "## Message proposé en espagnol",
    "",
    spanishMessage,
    "",
    "V26 ne modifie aucun original ni copie classée."
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — DEMANDE GROUPEE AGRI SAN JUAN V26 ===");
  console.log("Campagnes de la demande :", group.campaigns.join(", "));
  console.log("Blocs de demande :", items.length);
  console.log("Pièce 2006-2007 explicitement référencée :", request2006 ? "OUI" : "NON");
  console.log("Lacunes exploratoires :", missingCampaigns.length);
  console.log("Ticket 2024-2025 / 6 551 kg :", request2024 ? "OUI" : "NON");
  console.log("État workflow :", group.status);
  console.log("Sortie :", OUTPUT);
  console.log("Rapport / message espagnol :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V26 :", error.message || error);
  process.exitCode = 1;
}
