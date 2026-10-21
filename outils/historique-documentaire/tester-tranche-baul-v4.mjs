#!/usr/bin/env node

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const ROOT = process.env.CORTIJO_BAUL_DIR
  ? path.resolve(process.env.CORTIJO_BAUL_DIR)
  : path.join(os.homedir(), "Documents", "FINCA_MARIA", "BAUL_PRIVE");
const INDEX = path.join(ROOT, "_INDEX_BAUL.json");
const CACHE = path.join(ROOT, "_CACHE_OCR");
const OUTPUT = path.join(ROOT, "_TEST_TRANCHE_ANCIENNES_CAMPAGNES_V4.json");
const OCR_VERSION = "tesseract-psm1-spa-fra-eng-v2";
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".bmp", ".tif", ".tiff", ".webp"]);

const args = process.argv.slice(2);
function argNumber(name, fallback) {
  const hit = args.find((x) => x.startsWith(`--${name}=`));
  if (!hit) return fallback;
  const n = Number(hit.split("=")[1]);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}
const START = argNumber("start", 270);
const END = argNumber("end", 285);

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function includesAny(text, words) {
  const source = normalize(text);
  return words.some((w) => source.includes(normalize(w)));
}
function inside(candidate) {
  const c = path.resolve(candidate);
  const r = path.resolve(ROOT);
  return c === r || c.startsWith(`${r}${path.sep}`);
}
function portable(relative) {
  const candidate = path.resolve(ROOT, String(relative || "").split("/").join(path.sep));
  if (!inside(candidate)) throw new Error("Chemin BAUL invalide");
  return candidate;
}
function resolveFile(doc) {
  const candidates = [];
  if (doc.currentRelativePath) candidates.push(portable(doc.currentRelativePath));
  if (doc.originalRelativePath) candidates.push(portable(doc.originalRelativePath));
  if (doc.storedName) candidates.push(path.join(ROOT, "99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB", doc.storedName));
  const found = candidates.find((p) => inside(p) && fs.existsSync(p));
  if (!found) throw new Error("Fichier introuvable dans BAUL");
  return found;
}
function signature(filePath) {
  const stat = fs.statSync(filePath);
  return `${OCR_VERSION}|${filePath}|${stat.size}|${Math.trunc(stat.mtimeMs)}`;
}
function cachePath(filePath) {
  return path.join(CACHE, `${crypto.createHash("sha256").update(signature(filePath)).digest("hex")}.json`);
}
function readCache(filePath) {
  const p = cachePath(filePath);
  if (!fs.existsSync(p)) return null;
  try {
    const data = JSON.parse(fs.readFileSync(p, "utf-8"));
    if (data.version !== OCR_VERSION) return null;
    return { ...data.reading, cached: true };
  } catch { return null; }
}
function writeCache(filePath, reading) {
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cachePath(filePath), JSON.stringify({
    version: OCR_VERSION,
    createdAt: new Date().toISOString(),
    reading: { text: reading.text, method: reading.method, status: reading.status }
  }), "utf-8");
}
async function readImage(filePath) {
  const cached = readCache(filePath);
  if (cached) return cached;
  const { stdout } = await execFileAsync("tesseract", [filePath, "stdout", "-l", "spa+fra+eng", "--psm", "1"], {
    encoding: "utf-8", maxBuffer: 16 * 1024 * 1024
  });
  const text = String(stdout || "").trim().slice(0, 300000);
  const reading = { text, method: "tesseract_psm1_auto_orientation_spa_fra_eng", status: text.length >= 20 ? "lu_ocr" : "ocr_peu_lisible", cached: false };
  writeCache(filePath, reading);
  return reading;
}
function detectEntity(text) {
  if (includesAny(text, ["agricola san juan", "sociedad cooperativa andaluza", "s.c.a. agricola san juan", "almazara", "san juan"])) return "AGRI_SAN_JUAN";
  if (includesAny(text, ["junta de andalucia", "fega", "solicitud unica", "sigpac", " pac "])) return "PAC_ADMINISTRATION";
  if (includesAny(text, ["pelaez"])) return "PELAEZ";
  if (includesAny(text, ["caixabank", "unicaja", "cajamar", "santander", "bbva", "banco"])) return "BANQUE";
  return "INCONNU";
}
function detectType(text) {
  const invoice = includesAny(text, ["factura", "factura/liq"]);
  const liquidation = includesAny(text, ["liquidacion", "reparto", "liquido total a percibir"]);
  if (includesAny(text, ["extracto de cuenta", "saldo anterior"])) return "EXTRAIT_COMPTE";
  if (invoice && liquidation) return "LIQUIDATION_FACTURE";
  if (includesAny(text, ["ticket de entrega", "ticket de aportacion", "albaran"])) return "TICKET_APPORT";
  if (liquidation) return "LIQUIDATION";
  if (includesAny(text, ["solicitud unica"])) return "PAC_SOLICITUD_UNICA";
  if (includesAny(text, ["resolucion"]) && includesAny(text, ["pac", "fega", "ayuda", "subvencion"])) return "PAC_RESOLUTION";
  if (invoice) return "FACTURE";
  if (includesAny(text, ["catastro", "sigpac", "parcela", "recinto"])) return "PLAN_PARCELLE";
  return "NON_IDENTIFIE";
}
function detectDate(text) {
  const source = String(text || "");
  const labelled = source.match(/(?:fecha\s*(?:de\s*)?emisi[oó]n|fecha\s*emisi[oó]n)\s*[:.-]?\s*(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})/i);
  if (labelled) return `${labelled[3]}-${String(labelled[2]).padStart(2,"0")}-${String(labelled[1]).padStart(2,"0")}`;
  const dmy = source.match(/\b(0?[1-9]|[12]\d|3[01])[-/.](0?[1-9]|1[0-2])[-/.]((?:19|20)\d{2})\b/);
  if (dmy) return `${dmy[3]}-${String(dmy[2]).padStart(2,"0")}-${String(dmy[1]).padStart(2,"0")}`;
  return "";
}
function yearPart(v) {
  const n = Number(v); if (!Number.isFinite(n)) return "";
  if (String(v).length === 4) return String(n);
  return n >= 70 ? String(1900+n) : String(2000+n);
}
function detectCampaign(text) {
  const m = String(text || "").match(/(?:cp[ñn]a|campa[ñn]a|reparto|cosecha)\s*[:.-]?\s*(\d{2,4})\s*[\/-]\s*(\d{2,4})/i);
  if (!m) return "";
  const a = yearPart(m[1]), b = yearPart(m[2]);
  return a && b ? `${a}-${b}` : "";
}
function scanGroup(name) {
  const base = path.basename(String(name || ""), path.extname(String(name || ""))).replace(/\s*\(\d+\)\s*$/i, "").trim();
  const m = base.match(/^(CamScanner\s+\d{2}-\d{2}-\d{4}\s+\d{2}\.\d{2})(?:_\d+)?$/i);
  return m ? m[1] : base;
}

async function main() {
  const index = JSON.parse(fs.readFileSync(INDEX, "utf-8"));
  const docs = [...index.documents].sort((a,b) => String(a.receivedAt || "").localeCompare(String(b.receivedAt || "")));
  const start = Math.max(1, Math.min(START, docs.length));
  const end = Math.max(start, Math.min(END, docs.length));
  const selected = docs.slice(start - 1, end);
  const results = [];

  console.log("=== FINCA MARIA — TEST TRANCHE V4 ===");
  console.log(`Rangs : ${start} -> ${end} (${selected.length} documents)`);
  console.log("OCR auto-oriente et cache local. Aucun original ne sera modifie.\n");

  for (let i = 0; i < selected.length; i++) {
    const doc = selected[i];
    const rank = start + i;
    try {
      const filePath = resolveFile(doc);
      let reading = { text: "", method: "aucun", status: "format_non_lu", cached: false };
      if (IMAGE_EXT.has(path.extname(filePath).toLowerCase())) reading = await readImage(filePath);
      const entity = detectEntity(reading.text);
      const type = detectType(reading.text);
      const date = detectDate(reading.text);
      const campaign = detectCampaign(reading.text);
      results.push({ rank, originalName: doc.originalName, group: scanGroup(doc.originalName), reading: { status: reading.status, cached: !!reading.cached, textExcerpt: reading.text.slice(0,2500) }, entity, type, date, campaign });
      console.log(`[${rank}] ${doc.originalName} ... ${reading.cached ? "CACHE | " : ""}${reading.status} | ${entity} | ${type} | ${date || "date ?"} | ${campaign || "campagne ?"}`);
    } catch (e) {
      results.push({ rank, originalName: doc.originalName, error: e.message });
      console.log(`[${rank}] ${doc.originalName} ... ERREUR`);
    }
  }

  const target = results.find((x) => x.originalName === "CamScanner 14-08-2026 21.24_37.jpg");
  const sanJuan = results.filter((x) => x.entity === "AGRI_SAN_JUAN").length;
  const unknown = results.filter((x) => x.entity === "INCONNU" || x.type === "NON_IDENTIFIE").length;
  fs.writeFileSync(OUTPUT, JSON.stringify({ generatedAt: new Date().toISOString(), selection: { start, end }, summary: { documents: results.length, agriSanJuan: sanJuan, unknown }, target2011: target || null, documents: results }, null, 2), "utf-8");

  console.log("\n=== RESULTAT TRANCHE V4 ===");
  console.log("Documents testes :", results.length);
  console.log("Agri San Juan reconnus :", sanJuan);
  console.log("Encore inconnus :", unknown);
  if (target) console.log("Document rang 277 :", `${target.entity} | ${target.type} | ${target.date || "date ?"} | ${target.campaign || "campagne ?"}`);
  else console.log("Document rang 277 : non present dans la tranche");
  console.log("Sortie :", OUTPUT);
  console.log("Aucun original n'a ete deplace, renomme ou classe.");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
