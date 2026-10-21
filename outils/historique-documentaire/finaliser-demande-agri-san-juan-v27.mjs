#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const V26 = path.join(ROOT, "_DEMANDE_GROUPEE_AGRI_SAN_JUAN_V26.json");
const OUTPUT = path.join(ROOT, "_DEMANDE_GROUPEE_AGRI_SAN_JUAN_V27.json");
const REPORT = path.join(ROOT, "_DEMANDE_GROUPEE_AGRI_SAN_JUAN_V27.md");

function readJson(file) {
  if (!fs.existsSync(file)) throw new Error(`Fichier introuvable : ${file}`);
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2), "utf-8");
}

function main() {
  const v26 = readJson(V26);
  const groupedRequest = structuredClone(v26.groupedRequest || {});
  const campaigns = groupedRequest.campaigns || [];

  groupedRequest.status = "preparee";
  groupedRequest.nextAction = "validation_humaine_puis_envoi";

  const missingCampaigns = campaigns.filter((c) => [
    "2019-2020", "2020-2021", "2021-2022", "2022-2023", "2023-2024"
  ].includes(c));

  const spanishMessage = [
    "Asunto: Solicitud de documentación histórica – Finca Maria",
    "",
    "Buenos días,",
    "",
    "Estamos reconstruyendo el archivo histórico de las campañas de aceituna correspondientes al Finca Maria y quisiéramos saber si conservan copia de la documentación de las siguientes campañas:",
    "",
    "- 2006/2007: liquidación o factura de campaña. En nuestros extractos de cuenta aparece expresamente « LIQUIDACION CAMPAÑA 06/07 », pero no conservamos el documento original.",
    ...missingCampaigns.map((c) => `- ${c.replace("-", "/")}: si existe documentación, agradeceríamos copia del extracto de vales, albaranes o tickets, de las liquidaciones, facturas o repartos y, si está disponible, del extracto de cuenta relacionado con la campaña.`),
    "- 2024/2025: liquidación(es), factura(s) o reparto(s) correspondientes a la campaña. Conservamos un ticket de entrega de 6.551 kg de fecha 05/01/2025.",
    "",
    "Si para alguna de estas campañas no constan entregas de aceituna o ya no existe documentación disponible, también nos sería muy útil que nos lo confirmaran por escrito, para poder cerrar correctamente nuestro archivo histórico.",
    "",
    "Muchas gracias por su ayuda y por el tiempo dedicado.",
    "",
    "Un saludo cordial."
  ].join("\n");

  const payload = {
    ...v26,
    version: 27,
    generatedAt: new Date().toISOString(),
    basedOn: { v26: V26 },
    purpose: "Finaliser la formulation espagnole de la demande groupée Agri San Juan sans modifier le périmètre documentaire ni les niveaux de certitude établis en V26.",
    groupedRequest,
    spanishMessage,
    v27Review: {
      wordingNaturalized: true,
      noProductionAssumedForMissingCampaigns: true,
      writtenNegativeConfirmationRequested: true,
      originalsModified: false,
      classifiedCopiesModified: false
    }
  };

  writeJson(OUTPUT, payload);

  const lines = [
    "# FINCA MARIA — Demande groupée Agri San Juan V27",
    "",
    `- Interlocuteur : **${groupedRequest.recipient || "Agri San Juan"}**`,
    `- Campagnes concernées : **${campaigns.join(", ")}**`,
    `- État : **${groupedRequest.status}**`,
    "- Formulation espagnole : **relue et finalisée**",
    "- Garde-fou : **aucune production supposée pour les campagnes documentaires manquantes**",
    "",
    "## Message final en espagnol",
    "",
    spanishMessage,
    "",
    "V27 ne modifie aucun original ni copie classée."
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — DEMANDE AGRI SAN JUAN V27 ===");
  console.log("Campagnes :", campaigns.join(", "));
  console.log("État workflow :", groupedRequest.status);
  console.log("Campagnes exploratoires :", missingCampaigns.length);
  console.log("Confirmation écrite si absence de documents : OUI");
  console.log("Production supposée sur campagnes manquantes : NON");
  console.log("Sortie :", OUTPUT);
  console.log("Message final :", REPORT);
  console.log("Aucun original ni copie classée n'a été déplacé, renommé ou modifié.");
}

try {
  main();
} catch (error) {
  console.error("ERREUR V27 :", error.message || error);
  process.exitCode = 1;
}
