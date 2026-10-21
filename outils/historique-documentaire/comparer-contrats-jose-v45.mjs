#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BAUL = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");
const INPUT = path.join(BAUL, "_OCR_COMPLET_V43.json");
const REPORT = path.join(BAUL, "_RAPPORT_CONTRATS_JOSE_V45.md");

const TARGETS = [
  "20260816T081610_h27c5g_CamScanner_14-08-2026_21.23_1_1_.jpg",
  "20260816T081610_4rsuh4_CamScanner_14-08-2026_21.23_2_1_.jpg",
  "20260816T081610_9b305g_CamScanner_14-08-2026_21.20_1.jpg",
  "20260816T081610_czmspf_CamScanner_14-08-2026_21.20_2.jpg",
  "20260816T081611_loynlp_CamScanner_14-08-2026_21.25_2.jpg",
  "20260816T081611_c9fvxb_CamScanner_14-08-2026_21.25_3.jpg"
];

function norm(s="") {
  return String(s).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g," ").trim();
}
function clipAround(text, term, radius=420) {
  const raw = String(text||"");
  const n = norm(raw), t = norm(term);
  const i = n.indexOf(t);
  if (i < 0) return null;
  return raw.slice(Math.max(0,i-radius), Math.min(raw.length,i+t.length+radius)).replace(/\s+/g," ").trim();
}
function firstMatching(text, terms) {
  for (const t of terms) {
    const c = clipAround(text,t);
    if (c) return c;
  }
  return null;
}

function main(){
  if (!fs.existsSync(INPUT)) throw new Error(`OCR V43 introuvable : ${INPUT}`);
  const data = JSON.parse(fs.readFileSync(INPUT,"utf-8"));
  const docs = Array.isArray(data.documents) ? data.documents : [];
  const selected = TARGETS.map(name => docs.find(d => d.relativePath === name)).filter(Boolean);

  const lines = [
    "# FINCA MARIA — Comparaison contrats José López Gallego V45",
    "",
    `Pages ciblées trouvées : **${selected.length}/${TARGETS.length}**`,
    "",
    "## Lecture ciblée",
    ""
  ];

  for (const d of selected) {
    const text = String(d.text||"");
    const date = firstMatching(text,["villanueva del rosario","rosario a","febrero de 2007","marzo de dos mil catorce","marzo de 2014"]);
    const duree = firstMatching(text,["duracion","duración","anos","años","terminacion","terminación","vigencia"]);
    const rente = firstMatching(text,["15%","15 %","quince por ciento","renta fijada","mes de abril"]);
    const frais = firstMatching(text,["gastos que se deriven","titularidad de la finca","explotacion de la actividad","explotación de la actividad"]);
    const parties = firstMatching(text,["jose lopez gallego","josé lópez gallego","maria serrano garcia","maría serrano garcía"]);

    lines.push(`### ${d.relativePath}`);
    if (date) lines.push(`- DATE / EN-TÊTE : ${date}`);
    if (parties) lines.push(`- PARTIES : ${parties}`);
    if (duree) lines.push(`- DURÉE / FIN : ${duree}`);
    if (rente) lines.push(`- RENTE : ${rente}`);
    if (frais) lines.push(`- FRAIS / OBLIGATIONS : ${frais}`);
    lines.push("");
  }

  lines.push(
    "## Comparaison prudente",
    "",
    "- Vérifier si 21.23 est bien le contrat signé en 2007 et 21.20 celui signé en 2014.",
    "- Vérifier la durée exacte de chacun avant d'inférer une continuité juridique entre 2007 et 2014.",
    "- Si les deux contrats portent la même rente de 15 % sur l'olivier, cela établit deux points documentaires directs du régime 15 %.",
    "- Ne pas conclure automatiquement que chaque chiffre de coopérative entre ces dates est la quote-part de 15 % : le niveau comptable de chaque document reste à qualifier.",
    "- La série 21.25 est traitée comme correspondance de préparation de contrat, pas comme contrat signé, sauf preuve contraire dans le texte.",
    ""
  );

  fs.writeFileSync(REPORT, lines.join("\n")+"\n", "utf-8");

  console.log("=== FINCA MARIA — CONTRATS JOSÉ V45 ===");
  console.log("Pages ciblées trouvées :", `${selected.length}/${TARGETS.length}`);
  console.log("");
  for (const d of selected) {
    const text = String(d.text||"");
    console.log("---", d.relativePath, "---");
    for (const [label, terms] of [
      ["DATE", ["villanueva del rosario","rosario a","febrero de 2007","marzo de dos mil catorce","marzo de 2014"]],
      ["DUREE", ["duracion","duración","anos","años","terminacion","terminación","vigencia"]],
      ["RENTE", ["15%","15 %","quince por ciento","renta fijada","mes de abril"]],
      ["FRAIS", ["gastos que se deriven","titularidad de la finca","explotacion de la actividad","explotación de la actividad"]]
    ]) {
      const c = firstMatching(text, terms);
      if (c) console.log(`${label}:`, c);
    }
    console.log("");
  }
  console.log("Rapport :", REPORT);
  console.log("Originaux modifiés : NON");
  console.log("Elements touché : NON");
}

try { main(); }
catch(e){ console.error("ERREUR V45 :", e.message || e); process.exitCode=1; }
