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
const baul = await mkdtemp(path.join(tmpdir(), "finca-audio-browser-"));
const port = Number(process.env.FINCA_AUDIO_E2E_PORT || 5227);
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
  await page.addInitScript(() => {
    window.audioTest = { micCalls: 0, recorders: 0, stopped: 0 };
    const stream = { getTracks: () => [{ stop: () => { window.audioTest.stopped += 1; } }] };
    Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: {
      getUserMedia: () => {
        window.audioTest.micCalls += 1;
        return new Promise((resolve, reject) => {
          window.audioTest.allowMicrophone = () => resolve(stream);
          window.audioTest.denyMicrophone = () => reject(new Error("Refus simulé"));
        });
      }
    } });
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { window.audioTest.recorders += 1; this.state = "inactive"; this.mimeType = "audio/ogg"; }
      start() { this.state = "recording"; }
      requestData() { this.ondataavailable?.({ data: new Blob(["audio fictif de test"], { type: "audio/ogg" }) }); }
      stop() {
        if (this.state === "inactive") throw new Error("Recorder inactive");
        this.state = "inactive";
        queueMicrotask(() => this.onstop?.());
      }
    };
  });
  let meeting = {
    id: "audio-test", title: "Réunion audio fictive", date: "2026-11-07", meetingType: "Conseil de famille",
    status: "draft", stage: "Échanges", participants: [], markers: [], validatedVersions: [], agenda: [],
    reportDraft: {}, hasAudio: false, audioChunkCount: 0, transcriptionState: "idle"
  };
  const other = { ...meeting, id: "other-test", title: "Autre réunion de test" };
  let consentCalls = 0;
  let chunkCalls = 0;
  let finalizeCalls = 0;
  let failFinalize = true;
  let releaseChunk;
  const chunkGate = new Promise((resolve) => { releaseChunk = resolve; });
  let finalizeGate;
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    const json = (value, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    if (pathname === "/api/meetings") return json({ meetings: [meeting, other] });
    if (pathname === "/api/meetings/audio-test") return json({ meeting });
    if (pathname === "/api/meetings/other-test") return json({ meeting: other });
    if (pathname.endsWith("/recording-consent")) { consentCalls += 1; return json({ ok: true }); }
    if (pathname.includes("/audio/chunks/")) {
      chunkCalls += 1;
      await chunkGate;
      meeting = { ...meeting, status: "recording", audioChunkCount: 1 };
      return json({ ok: true }, 201);
    }
    if (pathname.endsWith("/audio/finalize")) {
      finalizeCalls += 1;
      assert.equal(req.postDataJSON().mimeType, undefined, "Le serveur doit déduire le format depuis les blocs sauvegardés");
      if (finalizeGate) await finalizeGate;
      if (failFinalize) return json({ error: "Finalisation temporairement indisponible" }, 503);
      meeting = { ...meeting, hasAudio: true, audioMimeType: "audio/ogg", status: "ready" };
      return json({ ok: true, meeting });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await page.goto(url);
  await page.getByLabel(/J’ai informé les participants/).check();
  const record = page.getByRole("button", { name: "● Enregistrer", exact: true });
  await record.click({ trial: true });
  await record.evaluate((button) => { button.click(); button.click(); });
  await page.waitForFunction(() => window.audioTest.micCalls === 1);
  assert.equal(consentCalls, 1);
  assert.equal(await record.isDisabled(), true);
  await page.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  await page.getByRole("alert").filter({ hasText: "Attendez la réponse" }).waitFor();
  assert.equal(await page.getByLabel("Titre", { exact: true }).inputValue(), "Réunion audio fictive");
  assert.equal(await page.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true }); window.dispatchEvent(event); return event.defaultPrevented;
  }), true);
  await page.evaluate(() => window.audioTest.allowMicrophone());
  const stop = page.getByRole("button", { name: "■ Arrêter", exact: true });
  await stop.waitFor();
  assert.equal(await page.evaluate(() => window.audioTest.recorders), 1);
  await page.getByRole("button", { name: "+ Nouvelle", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Arrêtez l’enregistrement" }).waitFor();
  console.log("✓ Une seule demande de microphone et un seul enregistrement ; changement de réunion bloqué pendant le démarrage et la capture");

  const chunkRequest = page.waitForRequest((req) => req.url().includes("/audio/chunks/"));
  await stop.click();
  await chunkRequest;
  await page.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  await page.getByRole("alert").filter({ hasText: "Attendez la fin de la sauvegarde audio" }).waitFor();
  assert.ok(await page.evaluate(() => window.audioTest.stopped) > 0);
  releaseChunk();
  await page.getByRole("status").filter({ hasText: "Finalisation à reprendre" }).waitFor();
  const retry = page.getByRole("button", { name: /^Reprendre la sauvegarde audio/ });
  await retry.waitFor();
  assert.equal(finalizeCalls, 1);
  assert.equal(chunkCalls, 1);
  assert.equal(await record.count(), 0);
  await page.reload();
  await retry.waitFor();
  assert.equal(await record.count(), 0, "Un audio inachevé ne doit pas être écrasé par un nouvel enregistrement");
  failFinalize = false;
  let releaseFinalization;
  finalizeGate = new Promise((resolve) => { releaseFinalization = resolve; });
  const finalRequest = page.waitForRequest((req) => req.url().endsWith("/audio/finalize"));
  await retry.click({ trial: true });
  await retry.evaluate((button) => { button.click(); button.click(); });
  await finalRequest;
  assert.equal(await retry.isDisabled(), true);
  await page.getByRole("button", { name: "+ Nouvelle", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Attendez la fin de la sauvegarde audio" }).waitFor();
  releaseFinalization();
  await page.getByRole("status").filter({ hasText: "Enregistrement original sauvegardé" }).waitFor();
  assert.equal(finalizeCalls, 2);
  assert.equal(chunkCalls, 1, "Les blocs déjà envoyés ne doivent pas être transférés à nouveau");
  assert.equal(await retry.count(), 0);
  await page.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  await page.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Autre réunion de test");
  console.log("✓ Arrêt, envoi protégé, échec de finalisation puis reprise après rechargement sans nouvel envoi des blocs");
  await context.close();

  const deniedContext = await browser.newContext();
  const denied = await deniedContext.newPage();
  await denied.addInitScript(() => {
    Object.defineProperty(navigator, "mediaDevices", { value: { getUserMedia: async () => { throw new Error("Refus simulé"); } } });
    window.MediaRecorder = class { static isTypeSupported() { return true; } };
  });
  await denied.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const clean = { ...other, id: "denied-test", title: "Test refus microphone" };
    const payload = pathname === "/api/meetings" ? { meetings: [clean] } : pathname === "/api/meetings/denied-test" ? { meeting: clean } : { ok: true, documents: [] };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
  });
  await denied.goto(url);
  await denied.getByLabel(/J’ai informé les participants/).check();
  await denied.getByRole("button", { name: "● Enregistrer", exact: true }).click();
  await denied.getByRole("alert").filter({ hasText: "Microphone indisponible ou refusé" }).waitFor();
  assert.equal(await denied.getByRole("button", { name: "● Enregistrer", exact: true }).isEnabled(), true);
  await denied.getByRole("button", { name: "+ Nouvelle", exact: true }).click();
  await denied.getByRole("heading", { name: "Préparer une nouvelle réunion", exact: true }).waitFor();
  await deniedContext.close();
  console.log("✓ Un refus du microphone libère les contrôles et permet de continuer sans enregistrement");

  const unsupportedContext = await browser.newContext();
  const unsupported = await unsupportedContext.newPage();
  await unsupported.addInitScript(() => {
    window.stoppedTestTracks = 0;
    Object.defineProperty(navigator, "mediaDevices", { value: {
      getUserMedia: async () => ({ getTracks: () => [{ stop: () => { window.stoppedTestTracks += 1; } }] })
    } });
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { throw new Error("Format indisponible simulé"); }
    };
  });
  await unsupported.route("**/api/**", (route) => {
    const pathname = new URL(route.request().url()).pathname;
    const clean = { ...other, id: "unsupported-test", title: "Test format indisponible" };
    const payload = pathname === "/api/meetings" ? { meetings: [clean] } : pathname === "/api/meetings/unsupported-test" ? { meeting: clean } : { ok: true, documents: [] };
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(payload) });
  });
  await unsupported.goto(url);
  await unsupported.getByLabel(/J’ai informé les participants/).check();
  await unsupported.getByRole("button", { name: "● Enregistrer", exact: true }).click();
  await unsupported.getByRole("alert").filter({ hasText: "Format indisponible simulé" }).waitFor();
  assert.equal(await unsupported.evaluate(() => window.stoppedTestTracks), 1);
  assert.equal(await unsupported.getByRole("button", { name: "● Enregistrer", exact: true }).isEnabled(), true);
  await unsupportedContext.close();
  console.log("✓ Le flux microphone est fermé si le navigateur ne peut pas construire l’enregistreur");
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
