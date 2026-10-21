import { readdir, readFile } from "node:fs/promises";
import { extname } from "node:path";

const DIST = new URL("../dist-family/", import.meta.url);
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".map", ".txt"]);

const forbidden = [
  ["synchronisation familiale", /fincasharedsyncmount/i],
  ["tableau administrateur", /fincamariadashboard/i],
  ["journal d’actions", /cortijo_action_logs_v1/i],
  ["faits opérationnels", /cortijo_action_facts_v1/i],
  ["suivis opérationnels", /cortijo_followups_v1/i],
  ["attributions opérationnelles", /cortijo_action_assignments_v1/i],
  ["contacts opérationnels", /cortijo_action_contacts_v1/i],
  ["équipe opérationnelle", /cortijo_team_v1/i],
  ["missions internes", /cortijo_custom_missions_v1/i],
  ["questions internes", /finca_maria_questions_v44_20260913/i],
  ["anomalies internes", /finca_maria_anomalies_v44_20260913/i],
  ["contrôles internes famille", /finca_maria_family_checks_v42_20260818/i],
  ["mission terrain interne", /cortijo_terrain_mission_2026_08/i],
  ["repères oliviers internes", /cortijo_terrain_olive_markers_v2_30/i],
  ["token localStorage", /azoth_finca_family_session/i],
  ["en-tête bearer", /authorization\s*:\s*bearer/i],
  ["ancienne API FINCA", /vite_finca_api_url/i],
  ["preuves Cortijo", /cortijo-proofs/i],
  ["dossiers Cortijo", /cortijodossiers/i],
  ["historique cadastral", /cortijoterrainhistory/i],
  ["fournisseur/factures Vitines", /vitines/i],
  ["déclarations fiscales Modelo 100", /modelo\s*100/i],
  ["données ASAJA", /\basaja\b/i],
  ["référence cadastrale FINCA", /29015a185/i],
  ["projet Boti", /\bboti\b/i],
  ["projet Vogue Marry", /vogue\s*marry/i],
  ["projet ARTAG", /\bartag\b/i],
  ["projet Melo Nail", /melo\s*nail/i],
];

async function walk(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const entryUrl = new URL(entry.name, directoryUrl);
    if (entry.isDirectory()) {
      files.push(...(await walk(new URL(`${entry.name}/`, directoryUrl))));
    } else {
      files.push(entryUrl);
    }
  }

  return files;
}

let files;
try {
  files = await walk(DIST);
} catch (error) {
  console.error("Audit impossible : dist-family n'existe pas. Lance d'abord npm run build:family.");
  process.exit(1);
}

const findings = [];
for (const fileUrl of files) {
  if (!TEXT_EXTENSIONS.has(extname(fileUrl.pathname).toLowerCase())) continue;
  const content = await readFile(fileUrl, "utf8");

  for (const [label, pattern] of forbidden) {
    if (pattern.test(content)) {
      findings.push(`${label} -> ${fileUrl.pathname.split("/dist-family/")[1] ?? fileUrl.pathname}`);
    }
  }
}

if (findings.length > 0) {
  console.error("ÉCHEC AUDIT FINCA FAMILY : contenu interdit détecté dans le bundle :");
  for (const finding of findings) console.error(`- ${finding}`);
  process.exit(1);
}

console.log(`Audit FINCA FAMILY OK : ${files.length} fichier(s) contrôlé(s), aucune fuite connue détectée.`);
