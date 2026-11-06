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
const baul = await mkdtemp(path.join(tmpdir(), "finca-meetings-browser-"));
const port = Number(process.env.FINCA_MEETINGS_E2E_PORT || 5226);
const origin = `http://127.0.0.1:${port}`;
const route = `${origin}/?view=reunions`;
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
  let confirm = true;
  page.on("dialog", (dialog) => confirm ? dialog.accept() : dialog.dismiss());
  let meeting = {
    id: "meeting-test", title: "Réunion fictive de test", date: "2026-11-06",
    meetingType: "Conseil de famille", status: "draft", stage: "Validation",
    participants: [], markers: [], agenda: [], linkedDocuments: [], validatedVersions: [],
    reportDraft: { summary: "Ancienne synthèse", subjects: "Travaux" },
    transcriptionState: "idle"
  };
  let failSave = true;
  let failValidation = false;
  let saveGate;
  let validationGate;
  const requests = [];
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === "/api/meetings" && request.method() === "GET") return json({ meetings: [meeting] });
    if (pathname === "/api/meetings/meeting-test" && request.method() === "GET") return json({ meeting });
    if (pathname === "/api/meetings/meeting-test" && request.method() === "PUT") {
      requests.push("save");
      if (saveGate) await saveGate;
      if (failSave) return json({ error: "Enregistrement refusé pour le test" }, 500);
      meeting = { ...meeting, ...request.postDataJSON() };
      return json({ meeting });
    }
    if (pathname === "/api/meetings/meeting-test/validate") {
      requests.push("validate");
      if (validationGate) await validationGate;
      if (failValidation) return json({ error: "Validation indisponible pour le test" }, 503);
      meeting = { ...meeting, status: "validated", validatedVersions: [{ id: "v1", version: 1, validatedAt: "2026-11-06T12:00:00Z" }] };
      return json({ meeting, version: 1 });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await page.goto(route);
  const summary = page.getByLabel("Synthèse rédigée et modifiable");
  await summary.fill("Synthèse à conserver malgré une panne");
  const validate = page.getByRole("button", { name: "Valider cette version", exact: true });
  await validate.click();
  await page.getByRole("alert").filter({ hasText: "Enregistrement refusé" }).waitFor();
  assert.deepEqual(requests, ["save"], "Aucune validation ne doit suivre un enregistrement échoué");
  assert.equal(await summary.inputValue(), "Synthèse à conserver malgré une panne");
  assert.equal(await validate.isEnabled(), true);
  assert.equal(await page.locator(".validatedBadge").count(), 0);
  console.log("✓ Un échec de sauvegarde empêche la validation et conserve le texte saisi");

  confirm = false;
  await validate.click();
  assert.deepEqual(requests, ["save"], "Annuler la confirmation ne doit envoyer aucune écriture");
  confirm = true;
  failSave = false;
  failValidation = true;
  await validate.click();
  await page.getByRole("alert").filter({ hasText: "Validation indisponible" }).waitFor();
  assert.deepEqual(requests, ["save", "save", "validate"]);
  assert.equal(await summary.inputValue(), "Synthèse à conserver malgré une panne");
  assert.equal(await validate.isEnabled(), true);
  assert.equal(await page.locator(".validatedBadge").count(), 0);
  console.log("✓ Une confirmation annulée n’écrit rien et un échec de validation ne crée pas de badge de réussite");

  failValidation = false;
  let releaseSave;
  let releaseValidation;
  saveGate = new Promise((resolve) => { releaseSave = resolve; });
  validationGate = new Promise((resolve) => { releaseValidation = resolve; });
  const saving = page.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith("/api/meetings/meeting-test"));
  await validate.evaluate((button) => { button.click(); button.click(); });
  await saving;
  await page.getByRole("status").filter({ hasText: "Enregistrement du brouillon" }).waitFor();
  assert.equal(await summary.isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "Sauvegarder le brouillon", exact: true }).isDisabled(), true);
  assert.equal(await page.getByRole("button", { name: "+ Nouvelle", exact: true }).isDisabled(), true);
  assert.equal(await validate.isDisabled(), true);
  const validating = page.waitForRequest((request) => request.url().endsWith("/api/meetings/meeting-test/validate"));
  releaseSave();
  await validating;
  await page.getByRole("status").filter({ hasText: "Validation du compte rendu" }).waitFor();
  assert.equal(await summary.isDisabled(), true);
  releaseValidation();
  await page.locator(".meetingNotice.ok").filter({ hasText: "Compte rendu validé" }).waitFor();
  assert.deepEqual(requests, ["save", "save", "validate", "save", "validate"], "Le double clic ne doit pas créer deux validations");
  assert.equal(await page.locator(".validatedBadge").innerText(), "Compte rendu validé · v1");
  assert.equal(await summary.isEnabled(), true);
  assert.equal(meeting.reportDraft.summary, "Synthèse à conserver malgré une panne");
  assert.deepEqual(errors, []);
  await context.close();
  console.log("✓ Sauvegarde avant validation, double clic neutralisé, contrôles temporairement bloqués puis réactivés");
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
