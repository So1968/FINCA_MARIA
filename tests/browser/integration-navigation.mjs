import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { EARTH_MAINTENANCE_KEY as key } from "../../app/src/lib/earthMaintenance.mjs";
const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const baul = await mkdtemp(path.join(tmpdir(), "finca-integration-nav-"));
const artifacts = "/tmp/finca-integration-qa"; await mkdir(artifacts, { recursive: true });
const port = Number(process.env.FINCA_INTEGRATION_PORT || 5232); const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--config", "vite.config.preview.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: path.join(root, "app"), env: { ...process.env, CORTIJO_BAUL_DIR: baul }, stdio: ["ignore", "pipe", "pipe"] });
let logs = ""; server.stdout.on("data", data => { logs += data; }); server.stderr.on("data", data => { logs += data; });
let browser; let active;
const season = new Date().getMonth() >= 10 ? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;
const fixture = { campaigns: { "campagne ancienne": { old: { notes: "Ancienne note test", unknown: true } }, [season]: { "diagnostic-technique": { notes: "Avant test", unknown: "conservé" } } }, metadata: { preserve: true } };
const stored = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), key);
const panel = page => page.getByRole("region", { name: "Calendrier d'entretien de la terre", exact: true });
const notes = page => panel(page).locator(".task").first().getByLabel("Produits, doses, quantités ou remarques");
const engineer = page => panel(page).locator(".task").first().getByLabel("Avis ou prescription de l’ingénieur").or(panel(page).locator(".task").first().getByLabel("Avis ou prescription de l'ingénieur"));
const save = page => panel(page).getByRole("button", { name: "Enregistrer mon suivi", exact: true }).first().click();
async function open(page) { await page.goto(`${origin}/?area=terre&tab=entretien`); await panel(page).waitFor(); await panel(page).locator(".task summary").first().click(); }
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await (await fetch(`${origin}/api/finca/local-identity`)).json()).checkout === path.join(root, "app")) break; } catch {}
    if (server.exitCode !== null || attempt === 99) throw new Error(logs || "Serveur indisponible");
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "fr-FR" });
    await context.addInitScript(({ key, value }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value)); }, { key, value: fixture });
    const a = await context.newPage(); active = a; a.setDefaultTimeout(10000);
    const errors = []; a.on("pageerror", error => errors.push(error.message));
    await a.goto(origin); await a.locator(".fincaAreaChoice--terre").click();
    const nav = a.getByRole("navigation", { name: "Terre", exact: true });
    for (const [label, id] of [["Journal", "gestion"], ["Entretien", "entretien"], ["Analyse", "analyse"], ["Stratégie", "strategie"], ["Actions", "actions"]]) {
      await nav.getByRole("button", { name: label, exact: true }).click();
      assert.equal(new URL(a.url()).searchParams.get("tab"), id);
      await a.reload(); assert.ok(await a.locator(".fincaEarthSection:visible").innerText());
      assert.equal(await a.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    }
    await nav.getByRole("button", { name: "Entretien", exact: true }).click();
    await nav.getByRole("button", { name: "Analyse", exact: true }).click();
    await a.goBack(); await panel(a).waitFor();
    await panel(a).getByLabel("Campagne", { exact: true }).selectOption("campagne ancienne");
    await panel(a).locator("summary").filter({ hasText: "Autres suivis conservés" }).click();
    await panel(a).getByText("Ancienne note test", { exact: true }).waitFor();
    await panel(a).getByLabel("Campagne", { exact: true }).selectOption(season);
    await panel(a).locator(".task summary").first().click();
    const b = await context.newPage(); b.setDefaultTimeout(10000); await open(b);
    await notes(a).fill("LOCAL_A_TEST"); await engineer(b).fill("RAPPORT_B_TEST"); await save(b);
    await a.waitForFunction(({ key, season }) => JSON.parse(localStorage.getItem(key)).campaigns[season]["diagnostic-technique"].engineerNote === "RAPPORT_B_TEST", { key, season });
    await save(a);
    let record = (await stored(a)).campaigns[season]["diagnostic-technique"];
    assert.equal(record.notes, "LOCAL_A_TEST"); assert.equal(record.engineerNote, "RAPPORT_B_TEST"); assert.equal(record.unknown, "conservé");
    assert.deepEqual((await stored(a)).campaigns["campagne ancienne"], fixture.campaigns["campagne ancienne"]);
    await notes(a).fill("LOCAL_CONFLIT_TEST"); await notes(b).fill("DISTANT_CONFLIT_TEST"); await save(b);
    a.once("dialog", dialog => dialog.dismiss()); await save(a);
    assert.equal((await stored(a)).campaigns[season]["diagnostic-technique"].notes, "DISTANT_CONFLIT_TEST"); assert.equal(await notes(a).inputValue(), "LOCAL_CONFLIT_TEST");
    a.once("dialog", dialog => dialog.accept()); await save(a);
    record = (await stored(a)).campaigns[season]["diagnostic-technique"];
    assert.equal(record.notes, "LOCAL_CONFLIT_TEST"); assert.equal(record.history.at(-1).before.notes, "DISTANT_CONFLIT_TEST");
    await a.evaluate(key => { const original = Storage.prototype.setItem; window.restoreEarthStorage = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("Quota de test", "QuotaExceededError"); return original.call(this, name, value); }; }, key);
    await notes(a).fill("QUOTA_TEST"); await save(a);
    await panel(a).getByRole("alert").filter({ hasText: "Modifications non enregistrées" }).waitFor();
    assert.equal((await stored(a)).campaigns[season]["diagnostic-technique"].notes, "LOCAL_CONFLIT_TEST");
    await a.evaluate(() => window.restoreEarthStorage()); await panel(a).getByRole("button", { name: "Réessayer la sauvegarde" }).click();
    await a.reload(); await panel(a).locator(".task summary").first().click(); assert.equal(await notes(a).inputValue(), "QUOTA_TEST");
    await panel(a).getByRole("link", { name: "Préparer la demande de visite — interlocuteur à confirmer" }).click();
    await a.waitForURL(/view=cortijo-memoire/); assert.equal(new URL(a.url()).searchParams.get("contact"), "asaja");
    await a.getByRole("link", { name: /Retour à Terre/ }).click();
    await a.waitForURL(/area=terre/); assert.equal(new URL(a.url()).searchParams.get("tab"), "actions");
    await a.goto(`${origin}/?view=cortijo-maison#jardin`); await a.getByRole("region", { name: "Jardin", exact: true }).getByRole("heading", { name: "Jardin", exact: true }).waitFor();
    assert.deepEqual((await stored(a)).metadata, fixture.metadata);
    assert.deepEqual(errors, []);
    await a.screenshot({ path: path.join(artifacts, `maison-integration-${width}.png`), fullPage: true });
    console.log(`✓ ${width}px : cinq onglets TERRE, liens et historique, campagne ancienne, fusion entre onglets, conflit conservé dans l’historique, quota/reprise, renvoi au dossier et MAISON`);
    await context.close();
  }
  for (const raw of ["{invalid", '{"campaigns":[]}']) {
    const context = await browser.newContext();
    await context.addInitScript(({ key, raw }) => { if (localStorage.getItem(key) === null) localStorage.setItem(key, raw); }, { key, raw });
    const page = await context.newPage(); active = page; await open(page);
    await panel(page).getByRole("alert").filter({ hasText: "Lecture impossible" }).waitFor();
    assert.equal(await notes(page).isDisabled(), true); assert.equal(await page.evaluate(key => localStorage.getItem(key), key), raw);
    await context.close();
  }
  console.log("✓ TERRE : stockage illisible ou de forme invalide conservé et formulaire protégé");
} catch (error) {
  if (active && !active.isClosed()) await active.screenshot({ path: path.join(artifacts, "erreur.png"), fullPage: true }).catch(() => {});
  throw error;
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) { const closed = once(server, "close"); server.kill("SIGTERM"); await closed; }
  await rm(baul, { recursive: true, force: true });
}
