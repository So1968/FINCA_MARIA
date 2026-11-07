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
const baul = await mkdtemp(path.join(tmpdir(), "finca-search-browser-"));
const port = Number(process.env.FINCA_SEARCH_E2E_PORT || 5228);
const origin = `http://127.0.0.1:${port}`;
const url = `${origin}/?view=reunions`;
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
  await page.clock.install();
  let dialogs = 0;
  page.on("dialog", (dialog) => { dialogs += 1; return dialog.dismiss(); });
  const base = { meetingType: "Conseil de famille", status: "draft", stage: "Ouverture", participants: [], markers: [], validatedVersions: [], agenda: [], hasAudio: false, audioChunkCount: 0, transcriptionState: "idle", reportDraft: {} };
  const data = Array.from({ length: 53 }, (_, index) => ({ ...base, id: `search-${index}`, title: `Séance de suivi ${index + 1}`, date: "2026-11-06", validatedVersion: index % 2 }));
  data.push({ ...base, id: "old-search", title: "Réunion été — budget 50%", date: "2020-06-15", validatedVersion: 1, theme: "Oléiculture", reportDraft: { summary: "Partage des charges" } });
  const fold = (text) => String(text).toLowerCase().normalize("NFD").replace(/\p{M}/gu, "");
  let failSearch = true;
  let releaseSlow;
  const slowGate = new Promise((resolve) => { releaseSlow = resolve; });
  let slowFinished;
  const slowDone = new Promise((resolve) => { slowFinished = resolve; });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const json = (value, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    if (url.pathname === "/api/meetings") {
      const q = url.searchParams.get("q") || "";
      if (q === "panne" && failSearch) { failSearch = false; return json({ error: "Recherche temporairement indisponible" }, 503); }
      const report = url.searchParams.get("report");
      const terms = fold(q).split(/\s+/).filter(Boolean);
      const selected = data.filter((item) => {
        const haystack = fold([item.title, item.theme, item.meetingType, item.date, item.reportDraft.summary].join(" "));
        return terms.every((term) => haystack.includes(term)) && (report === "validated" ? item.validatedVersion > 0 : report === "pending" ? !item.validatedVersion : true);
      });
      const offset = Number(url.searchParams.get("offset") || 0);
      const limit = Number(url.searchParams.get("limit") || 50);
      const payload = { meetings: selected.slice(offset, offset + limit), total: selected.length, hasMore: offset + limit < selected.length };
      if (q === "lent") {
        await slowGate;
        try { await json(payload); } catch { /* The obsolete request was aborted. */ }
        slowFinished();
        return;
      }
      return json(payload);
    }
    const item = data.find((entry) => url.pathname === `/api/meetings/${entry.id}`);
    if (item) {
      if (req.method() === "PUT") Object.assign(item, req.postDataJSON());
      return json({ meeting: item });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await page.goto(url);
  const list = page.locator(".meetingList");
  await page.getByRole("status").filter({ hasText: "50 réunions affichées sur 54" }).waitFor();
  assert.equal(await list.getByRole("button").count(), 50);
  const title = page.getByLabel("Titre", { exact: true });
  const summary = page.getByLabel("Synthèse rédigée et modifiable");
  await summary.fill("Saisie à conserver pendant la recherche");
  const searchInput = page.getByLabel("Rechercher une réunion", { exact: true });
  async function search(value) {
    const response = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/meetings" && url.searchParams.get("q") === value;
    });
    await searchInput.fill(value);
    await page.clock.fastForward(350);
    await response;
  }
  await search("REUNION ETE");
  await list.getByRole("button", { name: /Réunion été/ }).waitFor();
  assert.equal(await list.getByRole("button").count(), 1);
  assert.equal(await title.inputValue(), "Séance de suivi 1");
  assert.equal(await summary.inputValue(), "Saisie à conserver pendant la recherche");
  assert.equal(dialogs, 0);
  await page.getByRole("combobox", { name: "Filtrer les réunions par compte rendu", exact: true }).selectOption("pending");
  await page.clock.fastForward(350);
  await page.getByText("Aucune réunion ne correspond à ces filtres.", { exact: true }).waitFor();
  assert.equal(await summary.inputValue(), "Saisie à conserver pendant la recherche");
  await page.getByRole("button", { name: "Effacer les filtres", exact: true }).click();
  await page.clock.fastForward(1);
  await page.getByRole("status").filter({ hasText: "50 réunions affichées sur 54" }).waitFor();
  await page.getByRole("button", { name: "Afficher plus de réunions", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "54 réunions affichées sur 54" }).waitFor();
  assert.equal(await list.getByRole("button").count(), 54);
  assert.equal(await summary.inputValue(), "Saisie à conserver pendant la recherche");
  console.log("✓ Recherche d’une ancienne réunion hors première page, filtres et pagination sans perdre la saisie ouverte");
  await search("partage charges");
  await list.getByRole("button", { name: /Réunion été/ }).waitFor();
  await search("50%");
  await list.getByRole("button", { name: /Réunion été/ }).waitFor();
  await search("panne");
  await page.getByRole("alert").filter({ hasText: "Recherche temporairement indisponible" }).waitFor();
  await page.getByRole("button", { name: "Réessayer la recherche", exact: true }).click();
  await page.getByText("Aucune réunion ne correspond à ces filtres.", { exact: true }).waitFor();
  assert.equal(await summary.inputValue(), "Saisie à conserver pendant la recherche");
  const slowRequest = page.waitForRequest((request) => new URL(request.url()).searchParams.get("q") === "lent");
  await searchInput.fill("lent");
  await page.clock.fastForward(350);
  await slowRequest;
  await search("reunion ete");
  await list.getByRole("button", { name: /Réunion été/ }).waitFor();
  releaseSlow();
  await slowDone;
  await page.clock.runFor(1);
  assert.equal(await list.getByRole("button").count(), 1);
  await list.getByRole("button", { name: /Réunion été/ }).click();
  assert.equal(dialogs, 1, "Ouvrir le résultat doit toujours protéger la saisie non enregistrée");
  assert.equal(await title.inputValue(), "Séance de suivi 1");
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 850 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Débordement à ${width}px`);
  }
  await context.close();
  console.log("✓ Recherche dans le compte rendu, reprise après erreur, réponse obsolète ignorée et affichage mobile/bureau");
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
