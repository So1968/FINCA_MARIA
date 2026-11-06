import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const baul = await mkdtemp(path.join(tmpdir(), "finca-actions-browser-"));
const port = Number(process.env.FINCA_E2E_PORT || 5225);
const origin = `http://127.0.0.1:${port}`;
const route = `${origin}/?area=terre&tab=actions&contact=san-juan`;
const key = "cortijo_action_assignments_v1";
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--config", "vite.config.preview.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: path.join(root, "app"),
  env: { ...process.env, CORTIJO_BAUL_DIR: baul },
  stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
server.stdout.on("data", (data) => { logs += data; });
server.stderr.on("data", (data) => { logs += data; });
let spawnError;
server.on("error", (error) => { spawnError = error; });
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw new Error(`Serveur arrêté : ${logs}`);
    try {
      const response = await fetch(`${origin}/api/finca/local-identity`);
      const identity = await response.json();
      ready = identity.application === "finca-maria" && identity.checkout === path.join(root, "app");
    } catch { /* Le serveur démarre. */ }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Serveur de test indisponible : ${logs}`);
  browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(route);
  const dossier = page.locator(".fincaDossierCard").first();
  await dossier.locator('select[aria-label="Suivi"]').selectOption("Action accomplie");
  await page.getByRole("button", { name: /Actions accomplies/ }).click();
  await dossier.locator('select[aria-label="Suivi"]').waitFor();
  await page.getByRole("status").filter({ hasText: "Modifications enregistrées" }).waitFor();
  assert.ok((await page.evaluate((key) => localStorage.getItem(key), key)).includes("Action accomplie"));
  await dossier.getByRole("button", { name: /Ouvrir le dossier/ }).click();
  await page.waitForURL(/view=cortijo-memoire/);
  assert.equal(new URL(page.url()).searchParams.get("filter"), "done");
  await page.locator(".fincaActionCard").first().waitFor();
  await page.getByRole("link", { name: /Retour à Terre/ }).click();
  await page.waitForURL(/area=terre/);
  assert.equal(new URL(page.url()).searchParams.get("filter"), "done");
  await dossier.locator('select[aria-label="Suivi"]').waitFor();
  await dossier.locator("summary").first().click();
  await page.getByRole("button", { name: "Toutes", exact: true }).click();
  assert.equal(await dossier.getAttribute("open"), null);
  await dossier.locator("summary").first().click();
  await dossier.locator('select[aria-label="Suivi"]').selectOption("En cours");
  await page.getByRole("status").filter({ hasText: "Modifications enregistrées" }).waitFor();
  await page.reload();
  await page.getByRole("button", { name: "Toutes", exact: true }).click();
  assert.equal(await dossier.locator('select[aria-label="Suivi"]').inputValue(), "En cours");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Débordement horizontal à ${width}px`);
  }
  assert.deepEqual(errors, []);
  console.log("✓ Statut, sauvegarde, actualisation, retour Accomplies, fermeture des dossiers et affichage mobile/bureau");
  await context.close();

  for (const view of [route, `${origin}/?view=cortijo-memoire&contact=san-juan`]) {
    const corrupt = await browser.newContext();
    await corrupt.addInitScript((key) => localStorage.setItem(key, "{invalid"), key);
    const corruptPage = await corrupt.newPage();
    await corruptPage.goto(view);
    await corruptPage.getByRole("status").filter({ hasText: "lecture des actions impossible" }).waitFor();
    assert.equal(await corruptPage.evaluate((key) => localStorage.getItem(key), key), "{invalid");
    const control = corruptPage.locator('select[aria-label="Suivi"]').first();
    assert.equal(await control.isDisabled(), true);
    await corrupt.close();

    const quota = await browser.newContext();
    await quota.addInitScript((key) => {
      const original = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name, value) {
        if (name === key) throw new DOMException("Quota", "QuotaExceededError");
        return original.call(this, name, value);
      };
    }, key);
    const quotaPage = await quota.newPage();
    await quotaPage.goto(view);
    await quotaPage.locator('select[aria-label="Suivi"]').first().selectOption("En cours");
    await quotaPage.getByRole("status").filter({ hasText: "modifications non enregistrées" }).waitFor();
    assert.equal(await quotaPage.evaluate((key) => localStorage.getItem(key), key), null);
    await quota.close();
  }
  console.log("✓ Données illisibles préservées et sauvegarde impossible signalée dans les deux vues");
} finally {
  try { await browser?.close(); }
  finally {
    if (server.exitCode === null && server.signalCode === null) {
      const closed = once(server, "close");
      server.kill("SIGTERM");
      await closed;
    }
    await rm(baul, { recursive: true, force: true });
  }
}
