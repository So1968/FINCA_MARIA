#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BAUL = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");

const INPUT = path.join(BAUL, "_OCR_COMPLET_V43.json");
const OUTPUT = path.join(BAUL, "_TRANSITION_PRODUCTION_V46.json");
const REPORT = path.join(BAUL, "_RAPPORT_TRANSITION_PRODUCTION_V46.md");

function norm(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function uniq(xs) { return [...new Set(xs.filter(Boolean))]; }

function excerpt(raw, pos, radius = 260) {
  const s = String(raw || "");
  if (pos < 0) return "";
  return s.slice(Math.max(0, pos - radius), Math.min(s.length, pos + radius)).replace(/\s+/g, " ").trim();
}

function campaignMatches(text) {
  const n = norm(text);
  const out = [];
  const patterns = [
    [/19\s*[\/-]\s*20|2019\s*[\/-]\s*2020|cpn?a\s*19\s*[\/-]\s*20|campan?a\s*19\s*[\/-]\s*20/g, "2019/20"],
    [/20\s*[\/-]\s*21|2020\s*[\/-]\s*2021|cpn?a\s*20\s*[\/-]\s*21|campan?a\s*20\s*[\/-]\s*21/g, "2020/21"],
    [/21\s*[\/-]\s*22|2021\s*[\/-]\s*2022|cpn?a\s*21\s*[\/-]\s*22|campan?a\s*21\s*[\/-]\s*22/g, "2021/22"],
    [/22\s*[\/-]\s*23|2022\s*[\/-]\s*2023|cpn?a\s*22\s*[\/-]\s*23|campan?a\s*22\s*[\/-]\s*23/g, "2022/23"],
    [/23\s*[\/-]\s*24|2023\s*[\/-]\s*2024|cpn?a\s*23\s*[\/-]\s*24|campan?a\s*23\s*[\/-]\s*24/g, "2023/24"],
    [/24\s*[\/-]\s*25|2024\s*[\/-]\s*2025|cpn?a\s*24\s*[\/-]\s*25|campan?a\s*24\s*[\/-]\s*25/g, "2024/25"]
  ];
  for (const [re, label] of patterns) if (re.test(n)) out.push(label);

  // Périodes explicites type 01/11/2019-31/10/2020.
  for (const m of n.matchAll(/(?:0?1[\/.-]11[\/.-](2019|2020|2021|2022|2023|2024)).{0,80}(?:31[\/.-]10[\/.-](2020|2021|2022|2023|2024|2025))/g)) {
    const a = Number(m[1]);
    if (Number(m[2]) === a + 1) out.push(`${a}/${String(a + 1).slice(-2)}`);
  }
  return uniq(out);
}

function kgCandidates(text) {
  const s = String(text || "");
  const n = norm(s);
  const out = [];

  // Priorité aux valeurs dans le voisinage immédiat de libellés olives.
  const keyRe = /(kg\.?\s*aceituna|kilos?\s+de\s+aceituna|aceitunas?\s*[:=])/g;
  for (const m of n.matchAll(keyRe)) {
    const window = n.slice(m.index, Math.min(n.length, m.index + 220));
    for (const k of window.matchAll(/\b(\d{1,3}(?:[.,]\d{3})+|\d{3,5})(?:[.,]\d{1,2})?\b/g)) {
      const token = k[1];
      const digits = token.replace(/[.,]/g, "");
      const value = Number(digits);
      if (value >= 100 && value <= 100000) out.push({ value, token, source: "near_kg_aceituna" });
    }
  }

  // Tableaux coopérative: ligne contenant Kg. Aceituna / Kg. Aceite / Rdto.
  if (/kg\.?\s*aceituna/.test(n) && /kg\.?\s*aceite/.test(n) && /(rdto|rendimiento)/.test(n)) {
    for (const k of n.matchAll(/\b(\d{1,2}[.,]\d{3}|\d{4,5})\b/g)) {
      const value = Number(k[1].replace(/[.,]/g, ""));
      if (value >= 500 && value <= 50000) out.push({ value, token: k[1], source: "coop_table" });
    }
  }

  const seen = new Set();
  return out.filter(x => {
    const key = `${x.value}:${x.source}`;
    if (seen.has(key)) return false;
    seen.add(key); return true;
  }).slice(0, 20);
}

function classify(text) {
  const n = norm(text);
  const coopSignals = ["kg. aceituna", "kg aceituna", "kg. aceite", "kg aceite", "rendimiento", "rdto", "reparto cp", "liquidacion", "extracto vales", "agri san juan", "cif: f29013216"];
  const serviceSignals = ["agricola vitines", "jose lopez gallego", "servicios agricolas", "trabajos agricolas", "poda", "desbroce", "tratamiento", "tractor", "factura"];
  const adminSignals = ["pac 2022", "solicitud", "agricultor activo", "modelo 100", "modelo 037", "patronato de recaudacion", "catastro"];
  const c = coopSignals.reduce((a,t)=>a+(n.includes(norm(t))?1:0),0);
  const s = serviceSignals.reduce((a,t)=>a+(n.includes(norm(t))?1:0),0);
  const a = adminSignals.reduce((x,t)=>x+(n.includes(norm(t))?1:0),0);
  if (c >= 3) return { type: "COOPERATIVE_PRODUCTION", score: c };
  if (s >= 2 && c < 3) return { type: "SERVICE_OR_JOSE", score: s };
  if (a >= 2) return { type: "ADMINISTRATIVE", score: a };
  return { type: "OTHER", score: Math.max(c,s,a) };
}

function names(text) {
  const n = norm(text);
  return {
    mariaMother: n.includes("serrano garcia, maria") || n.includes("serrano garcia maria") || n.includes("maria serrano garcia"),
    mariaJosefa: n.includes("maria josefa") || n.includes("de los rios serrano, maria josefa") || n.includes("de los rios serrano maria josefa"),
    jose: n.includes("jose lopez gallego") || n.includes("jose lópez gallego") || n.includes("lopez gallego"),
    vitines: n.includes("agricola vitines") || n.includes("agrícola vitines")
  };
}

function main() {
  if (!fs.existsSync(INPUT)) throw new Error(`OCR V43 introuvable : ${INPUT}`);
  const data = JSON.parse(fs.readFileSync(INPUT, "utf-8"));
  const docs = Array.isArray(data.documents) ? data.documents : [];
  const campaigns = ["2019/20","2020/21","2021/22","2022/23","2023/24","2024/25"];
  const grouped = Object.fromEntries(campaigns.map(c => [c, []]));
  const unassignedRelevant = [];

  for (const d of docs) {
    const text = String(d.text || "");
    const n = norm(text);
    const cs = campaignMatches(text);
    const cl = classify(text);
    const nm = names(text);
    const relevantByYear = /\b(2019|2020|2021|2022|2023|2024|2025)\b/.test(n);
    const relevantByContent = cl.type !== "OTHER" || nm.jose || nm.vitines;
    if (!relevantByYear || !relevantByContent) continue;

    const row = {
      relativePath: d.relativePath,
      status: d.status,
      chars: d.chars,
      campaigns: cs,
      classification: cl,
      names: nm,
      kgCandidates: kgCandidates(text),
      snippets: []
    };

    const keys = ["kg aceituna","kg. aceituna","liquidacion","reparto","extracto vales","jose lopez gallego","agricola vitines","maria josefa","agricultor activo"];
    for (const key of keys) {
      const p = n.indexOf(norm(key));
      if (p >= 0) row.snippets.push(excerpt(text, p, 300));
      if (row.snippets.length >= 4) break;
    }

    if (cs.length) for (const c of cs) if (grouped[c]) grouped[c].push(row);
    else unassignedRelevant.push(row);
  }

  for (const c of campaigns) grouped[c].sort((a,b) => {
    const rank = { COOPERATIVE_PRODUCTION: 0, SERVICE_OR_JOSE: 1, ADMINISTRATIVE: 2, OTHER: 3 };
    return rank[a.classification.type] - rank[b.classification.type] || b.classification.score - a.classification.score;
  });

  const payload = {
    version: 46,
    generatedAt: new Date().toISOString(),
    source: INPUT,
    safeguards: {
      originalsModified: false,
      originalsMoved: false,
      elementsTouched: false,
      privateOcrUploadedToGithub: false,
      kgCandidatesAreNotAutomaticTotals: true,
      invoicesAreNotAutomaticallyProduction: true,
      noFraudConclusion: true
    },
    campaigns: grouped,
    unassignedRelevant
  };
  fs.writeFileSync(OUTPUT, JSON.stringify(payload, null, 2), "utf-8");

  const lines = [
    "# FINCA MARIA — Transition production V46",
    "",
    "Objectif : reconstruire les campagnes **2019/20 à 2024/25** sans confondre tickets, repartos, factures et totaux annuels.",
    "",
    ...campaigns.flatMap(c => {
      const rows = grouped[c];
      const coop = rows.filter(r => r.classification.type === "COOPERATIVE_PRODUCTION");
      const jose = rows.filter(r => r.classification.type === "SERVICE_OR_JOSE");
      const admin = rows.filter(r => r.classification.type === "ADMINISTRATIVE");
      return [
        `## ${c}`,
        `- documents liés : **${rows.length}**`,
        `- candidats coop/production : **${coop.length}**`,
        `- candidats José/prestations : **${jose.length}**`,
        `- administratifs : **${admin.length}**`,
        "",
        ...rows.slice(0, 12).flatMap((r,i) => [
          `### ${i+1}. ${r.relativePath}`,
          `- type : ${r.classification.type} (score ${r.classification.score})`,
          `- noms : mère=${r.names.mariaMother?"OUI":"non"}, Maria Josefa=${r.names.mariaJosefa?"OUI":"non"}, José=${r.names.jose?"OUI":"non"}, Vitines=${r.names.vitines?"OUI":"non"}`,
          `- kg candidats : ${r.kgCandidates.map(k=>`${k.value} [${k.source}]`).join(", ") || "—"}`,
          ...r.snippets.slice(0,2).map(s => `- extrait : ${s}`),
          ""
        ])
      ];
    }),
    "## Pièces pertinentes sans campagne attribuée automatiquement",
    "",
    ...unassignedRelevant
      .sort((a,b)=>b.classification.score-a.classification.score)
      .slice(0,25)
      .flatMap((r,i)=>[
        `### ${i+1}. ${r.relativePath}`,
        `- type : ${r.classification.type} (score ${r.classification.score})`,
        `- noms : mère=${r.names.mariaMother?"OUI":"non"}, Maria Josefa=${r.names.mariaJosefa?"OUI":"non"}, José=${r.names.jose?"OUI":"non"}, Vitines=${r.names.vitines?"OUI":"non"}`,
        `- kg candidats : ${r.kgCandidates.map(k=>k.value).join(", ") || "—"}`,
        ...r.snippets.slice(0,2).map(s=>`- extrait : ${s}`),
        ""
      ]),
    "## Règles de lecture",
    "",
    "- Un nombre de kilos détecté est un **candidat**, jamais un total annuel automatique.",
    "- Un reparto ou une liquidation peut répéter la même base de kilos : **aucune addition automatique**.",
    "- Un Listado de Facturas Recibidas d'Agri San Juan n'est pas assimilé à une facture de travaux payée à José.",
    "- Les documents PAC/fiscaux servent à dater le statut et la transition, pas la récolte.",
    "- L'objectif est de trouver les pièces permettant de fixer, campagne par campagne, le vrai total d'olives et le changement de modèle économique.",
    "",
    `Sortie structurée : \`${OUTPUT}\``
  ];

  fs.writeFileSync(REPORT, lines.join("\n") + "\n", "utf-8");

  console.log("=== FINCA MARIA — TRANSITION PRODUCTION V46 ===");
  for (const c of campaigns) {
    const rows = grouped[c];
    console.log(`${c} : ${rows.length} docs | coop=${rows.filter(r=>r.classification.type==='COOPERATIVE_PRODUCTION').length} | José/presta=${rows.filter(r=>r.classification.type==='SERVICE_OR_JOSE').length}`);
    for (const r of rows.filter(r=>r.classification.type==='COOPERATIVE_PRODUCTION').slice(0,4)) {
      console.log(`  COOP ${r.relativePath}`);
      console.log(`       kg candidats=${r.kgCandidates.map(k=>k.value).join(', ') || '—'}`);
      if (r.snippets[0]) console.log(`       ${r.snippets[0].slice(0,420)}`);
    }
  }
  console.log(`Sans campagne attribuée : ${unassignedRelevant.length}`);
  console.log("Rapport :", REPORT);
  console.log("Sortie :", OUTPUT);
  console.log("Originaux modifiés : NON");
  console.log("Elements touché : NON");
}

try { main(); }
catch (e) { console.error("ERREUR V46 :", e.message || e); process.exitCode = 1; }
