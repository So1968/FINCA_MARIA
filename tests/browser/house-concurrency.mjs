import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { HOUSE_KEYS as keys } from "../../app/src/lib/houseData.mjs";
const root = path.resolve(import.meta.dirname, "../..");
const { chromium } = createRequire(path.join(root, "app/package.json"))("playwright");
const baul = await mkdtemp(path.join(tmpdir(), "finca-house-concurrency-"));
const origin = "http://127.0.0.1:5233";
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--config", "vite.config.preview.js", "--host", "127.0.0.1", "--port", "5233", "--strictPort"], { cwd: path.join(root, "app"), env: { ...process.env, CORTIJO_BAUL_DIR: baul }, stdio: ["ignore", "pipe", "pipe"] });
let logs = "", browser;
server.stdout.on("data", d => { logs += d; }); server.stderr.on("data", d => { logs += d; });
const base = { id: "concurrency-test", unknown: { keep: true } };
const cases = [
  { section: "reservations", key: keys.bookings, form: "Réservation", field: "Occupant", property: "name", other: "Remarque", otherProperty: "note", save: "Enregistrer les modifications", value: { ...base, name: "Fiche test", place: "La Hera", arrival: "2044-01-01", departure: "2044-01-04" } },
  { section: "inventaire", key: keys.inventory, form: "Fiche inventaire", field: "Objet", property: "object", other: "Note", otherProperty: "note", save: "Enregistrer l’objet", value: { ...base, object: "Fiche test", category: "Meubles", status: "Présent", quantity: 1 } },
  { section: "entretien", key: keys.maintenance, form: "Travail ou réparation", field: "Travail / réparation", property: "title", other: "Détails du travail", otherProperty: "note", save: "Enregistrer le travail", value: { ...base, title: "Fiche test", status: "À faire", priority: "P2", assignedTo: "Ancien responsable test" } },
  { section: "jardin", key: keys.garden, form: "Intervention jardin", field: "Intervention", property: "work", other: "Responsable jardin", otherProperty: "responsible", save: "Enregistrer l’intervention", value: { ...base, work: "Fiche test", date: "2044-01-01" } },
  { section: "sorties", key: keys.places, form: "Fiche sortie", field: "Lieu", property: "name", other: "Conseil pour les visiteurs", otherProperty: "publicNote", save: "Enregistrer le lieu", value: { ...base, name: "Fiche test", status: "À conseiller" } }
];
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(origin)).ok) break; } catch {}
    if (server.exitCode !== null || i === 99) throw new Error(logs);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
  for (const width of [1280, 390]) for (const item of cases) {
    const context = await browser.newContext({ viewport: { width, height: 900 } });
    const value = item.section === "jardin" ? { "laurier-central": { interventions: [item.value], unknownTree: true } } : [item.value];
    await context.addInitScript(({ key, value }) => { if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(value)); }, { key: item.key, value });
    const a = await context.newPage(), b = await context.newPage();
    const form = page => page.getByRole("form", { name: item.form, exact: true });
    const stored = () => a.evaluate(key => { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value[0] : value["laurier-central"].interventions[0]; }, item.key);
    let accept = false, dialogs = 0;
    a.on("dialog", dialog => { dialogs++; return accept ? dialog.accept() : dialog.dismiss(); });
    async function open(page, name) {
      await page.goto(`${origin}/?view=cortijo-maison#${item.section}`);
      if (item.section === "reservations") await page.getByLabel("Toutes les dates, y compris les anciens séjours").check();
      const edit = item.section === "jardin" ? page.getByRole("button", { name: `Modifier l’intervention — ${name}`, exact: true }) : page.getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Modifier", exact: true });
      await edit.click();
    }
    await open(a, "Fiche test"); await open(b, "Fiche test");
    await form(a).getByLabel(item.field, { exact: true }).fill("Modification A test");
    await form(b).getByLabel(item.other, { exact: true }).fill("Modification B test");
    await form(b).getByRole("button", { name: item.save, exact: true }).click();
    await form(a).getByRole("button", { name: item.save, exact: true }).click();
    let saved = await stored();
    assert.equal(saved[item.property], "Modification A test"); assert.equal(saved[item.otherProperty], "Modification B test"); assert.deepEqual(saved.unknown, base.unknown); assert.equal(dialogs, 0);
    await open(a, "Modification A test"); await open(b, "Modification A test");
    await form(a).getByLabel(item.field, { exact: true }).fill("Conflit A test");
    await form(b).getByLabel(item.field, { exact: true }).fill("Conflit B test");
    await form(b).getByRole("button", { name: item.save, exact: true }).click();
    await form(a).getByRole("button", { name: item.save, exact: true }).click();
    assert.equal((await stored())[item.property], "Conflit B test"); assert.equal(await form(a).getByLabel(item.field, { exact: true }).inputValue(), "Conflit A test"); assert.equal(dialogs, 1);
    accept = true; await form(a).getByRole("button", { name: item.save, exact: true }).click(); accept = false;
    saved = await stored(); assert.equal(saved[item.property], "Conflit A test"); assert.equal(saved.history.at(-1).before[item.property], "Conflit B test");
    await open(a, "Conflit A test"); await form(a).getByLabel(item.field, { exact: true }).fill("Ne pas recréer test");
    await b.evaluate(({ key, garden }) => { localStorage.setItem(key, JSON.stringify(garden ? { "laurier-central": { interventions: [] } } : [])); }, { key: item.key, garden: item.section === "jardin" });
    await form(a).getByRole("button", { name: item.save, exact: true }).click();
    assert.equal(await form(a).getByLabel(item.field, { exact: true }).inputValue(), "Ne pas recréer test"); assert.equal(await stored(), undefined);
    await context.close();
    console.log(`✓ ${width}px ${item.section} : champs distincts rapprochés, conflit refusé puis historisé, métadonnées et saisie après retrait conservées`);
  }
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) { const closed = once(server, "close"); server.kill("SIGTERM"); await closed; }
  await rm(baul, { recursive: true, force: true });
}
