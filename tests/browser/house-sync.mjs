import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { HOUSE_KEYS } from "../../app/src/lib/houseData.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const baul = await mkdtemp(path.join(tmpdir(), "finca-house-sync-"));
const port = Number(process.env.FINCA_HOUSE_SYNC_PORT || 5230);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--config", "vite.config.preview.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], {
  cwd: path.join(root, "app"), env: { ...process.env, CORTIJO_BAUL_DIR: baul, VITE_FINCA_SERVER_MODE: "1" }, stdio: ["ignore", "pipe", "pipe"]
});
let logs = "";
server.stdout.on("data", data => { logs += data; }); server.stderr.on("data", data => { logs += data; });
let browser;
const failures = [];
const remoteBooking = { id: "remote-home-test", name: "Séjour serveur test", place: "La Hera", arrival: "2042-01-10", departure: "2042-01-12", note: "" };
async function homepage({ storage = {}, sharedState = {}, quotaKey } = {}) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" });
  await context.addInitScript(({ storage, quotaKey }) => {
    for (const [key, raw] of Object.entries(storage)) if (localStorage.getItem(key) === null) localStorage.setItem(key, raw);
    if (quotaKey) {
      const prototype = Object.getPrototypeOf(localStorage); const original = prototype.setItem;
      prototype.setItem = function (key, value) {
        if (key === quotaKey) throw new DOMException("Quota de test", "QuotaExceededError");
        return original.call(this, key, value);
      };
    }
  }, { storage, quotaKey });
  const writes = [];
  await context.route("**/api/**", async route => {
    const request = route.request(); const url = new URL(request.url());
    if (url.pathname === "/api/auth/me") return route.fulfill({ json: { user: { name: "Audit test", email: "audit@example.test", roles: ["admin-general"] }, expiresAt: Date.now() + 3600000 } });
    if (url.pathname === "/api/bootstrap") return route.fulfill({ json: { reservations: [remoteBooking], roomReady: {}, sharedState } });
    if (request.method() !== "GET") { writes.push({ path: url.pathname, body: request.postDataJSON() }); return route.fulfill({ json: { ok: true } }); }
    return route.continue();
  });
  const page = await context.newPage(); page.setDefaultTimeout(10000);
  await page.goto(origin);
  await page.locator(".fincaTwoWorlds").waitFor();
  await page.evaluate(() => dispatchEvent(new Event("finca:navigation")));
  await page.waitForFunction(() => /^(Synchronisé|Hors connexion)/.test(document.querySelector(".fincaSharedSyncButton")?.getAttribute("title") || ""));
  return { context, page, writes };
}
async function scenario(name, run) {
  try { await run(); console.log(`✓ ${name}`); }
  catch (error) { failures.push(name); console.error(`✗ ${name}\n${error.stack}`); }
}
try {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { const response = await fetch(`${origin}/api/finca/local-identity`); if ((await response.json()).checkout === path.join(root, "app")) break; } catch {}
    if (server.exitCode !== null || attempt === 99) throw new Error(logs || "Serveur de test indisponible.");
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
  await scenario("Accueil : ancien séjour incomplet et champs inconnus conservés avec les réservations du serveur", async () => {
    const legacy = { id: "legacy-home-test", name: "Ancien séjour test", place: "Chambre ancienne", note: "Dates à compléter", custom: { keep: true } };
    const { context, page, writes } = await homepage({ storage: { [HOUSE_KEYS.bookings]: JSON.stringify([legacy]), azoth_finca_sync_initialized_v1: "1" } });
    try {
      const bookings = await page.evaluate(key => JSON.parse(localStorage.getItem(key)), HOUSE_KEYS.bookings);
      assert.deepEqual(bookings.find(item => item.id === legacy.id), legacy);
      assert.ok(bookings.some(item => item.id === remoteBooking.id)); assert.deepEqual(writes, []);
    } finally { await context.close(); }
  });
  await scenario("Accueil : stockage Maison illisible conservé sans substitution par les données distantes", async () => {
    const { context, page, writes } = await homepage({ storage: { [HOUSE_KEYS.bookings]: "{invalid", azoth_finca_sync_initialized_v1: "1" } });
    try {
      assert.equal(await page.evaluate(key => localStorage.getItem(key), HOUSE_KEYS.bookings), "{invalid");
      assert.equal(await page.locator(".fincaSharedSyncButton").getAttribute("title"), "Hors connexion"); assert.deepEqual(writes, []);
    } finally { await context.close(); }
  });
  await scenario("Accueil : première connexion, copie récupérable de l’ancienne note avant adoption du serveur", async () => {
    const local = { "infra-Eau": "NOTE_LOCALE_ACCUEIL_TEST" }; const remote = { "infra-Eau": "NOTE_SERVEUR_ACCUEIL_TEST" };
    const { context, page } = await homepage({ storage: { [HOUSE_KEYS.notes]: JSON.stringify(local) }, sharedState: { [HOUSE_KEYS.notes]: { value: remote, version: 2 } } });
    try {
      const recovery = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || "[]"), HOUSE_KEYS.syncRecovery);
      assert.ok(recovery.some(item => item.stateKey === HOUSE_KEYS.notes && item.value?.["infra-Eau"] === local["infra-Eau"]));
      assert.deepEqual(await page.evaluate(key => JSON.parse(localStorage.getItem(key)), HOUSE_KEYS.notes), remote);
    } finally { await context.close(); }
  });
  await scenario("Accueil : quota pendant le partage signalé, aucune fausse confirmation de synchronisation", async () => {
    const { context, page } = await homepage({ storage: { azoth_finca_sync_initialized_v1: "1" }, sharedState: { [HOUSE_KEYS.notes]: { value: { test: "NOTE_DISTANTE_QUOTA_TEST" }, version: 1 } }, quotaKey: HOUSE_KEYS.notes });
    try {
      assert.equal(await page.locator(".fincaSharedSyncButton").getAttribute("title"), "Hors connexion");
      assert.equal(await page.evaluate(key => localStorage.getItem(key), HOUSE_KEYS.notes), null);
    } finally { await context.close(); }
  });
  assert.deepEqual(failures, [], "Protections Maison requises dès l’accueil. Routes API simulées ; le serveur réel est contrôlé par house-server.mjs.");
} finally {
  await browser?.close(); server.kill("SIGTERM");
  if (server.exitCode === null) await Promise.race([once(server, "exit"), new Promise(resolve => setTimeout(resolve, 3000))]);
  await rm(baul, { recursive: true, force: true });
}
