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
const baul = await mkdtemp(path.join(tmpdir(), "finca-preparation-browser-"));
const port = Number(process.env.FINCA_PREPARATION_E2E_PORT || 5230);
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
  let allowDiscard = false;
  page.on("dialog", (dialog) => allowDiscard ? dialog.accept() : dialog.dismiss());
  let meeting = { id: "preparation-test", title: "Réunion existante", date: "2026-11-08", meetingType: "Conseil de famille", status: "draft", stage: "Échanges", participants: [{ id: "p1", name: "Personne de test", role: "Autre", presence: "present" }], markers: [], validatedVersions: [], reportDraft: {}, transcriptionState: "idle" };
  let creations = 0;
  let createdBody;
  await page.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const json = (body) => route.fulfill({ contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === "/api/meetings" && request.method() === "POST") {
      creations += 1;
      createdBody = request.postDataJSON();
      meeting = { ...meeting, ...createdBody, participants: createdBody.participants };
      return json({ meeting });
    }
    if (pathname === "/api/meetings") return json({ meetings: [meeting] });
    if (pathname.endsWith("/participants/p1")) {
      meeting = { ...meeting, participants: [{ ...meeting.participants[0], ...request.postDataJSON() }] };
      return json({ meeting });
    }
    if (pathname === "/api/meetings/preparation-test") return json({ meeting });
    return json({ documents: [], localEngineReady: false });
  });
  await page.goto(url);
  const existingRole = page.getByRole("textbox", { name: "Préciser le rôle", exact: true });
  await existingRole.waitFor();
  assert.equal(await existingRole.inputValue(), "Autre", "Un rôle historique doit rester affiché intégralement");
  await existingRole.fill("Conseiller de test");
  await page.locator(".participantRow").filter({ hasText: "Anime" }).getByRole("button", { name: "Enregistrer", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('.participantRow small')?.textContent?.includes("Modifications non enregistrées"));
  assert.equal(meeting.participants[0].role, "Conseiller de test");
  await page.getByRole("button", { name: "+ Nouvelle", exact: true }).click();
  await page.getByText("Ajouter plusieurs participants en une fois", { exact: true }).click();
  const names = page.getByLabel("Noms à ajouter", { exact: true });
  await names.fill("Liste non ajoutée");
  await page.getByRole("button", { name: "Annuler", exact: true }).click();
  assert.equal(await names.inputValue(), "Liste non ajoutée");
  assert.equal(creations, 0);
  const tooMany = Array.from({ length: 101 }, (_, i) => `Personne fictive ${i}`).join("\n");
  await names.fill(tooMany);
  await page.getByRole("button", { name: "Ajouter ces participants", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "au maximum 100 nouveaux participants" }).waitFor();
  assert.equal(await names.inputValue(), tooMany);
  assert.equal(await page.getByLabel("Nom", { exact: true }).count(), 1);
  await names.fill("Alice; alice;\nBob");
  await page.getByRole("button", { name: "Ajouter ces participants", exact: true }).click();
  assert.equal(await names.inputValue(), "");
  assert.equal(await page.getByLabel("Nom", { exact: true }).count(), 3);
  const alice = page.locator(".participantRow").filter({ has: page.locator('input[value="Alice"]') });
  assert.equal(await alice.getByLabel("Présence", { exact: true }).inputValue(), "unknown");
  await alice.getByRole("combobox", { name: "Rôle dans la réunion", exact: true }).selectOption("__other__");
  await alice.getByRole("textbox", { name: "Préciser le rôle", exact: true }).fill("Tuteur de test");
  allowDiscard = true;
  await page.getByRole("button", { name: "Remplir avec un exemple", exact: true }).click();
  await page.getByText("Exemple fictif inséré dans le formulaire. Rien n’a été enregistré comme réunion.", { exact: true }).waitFor();
  assert.equal(creations, 0);
  const title = page.getByLabel("Titre", { exact: true });
  await title.fill("Titre à préserver");
  allowDiscard = false;
  await page.getByRole("button", { name: "Remplir avec un exemple", exact: true }).click();
  assert.equal(await title.inputValue(), "Titre à préserver");
  await names.fill("Nom encore en attente");
  await page.getByRole("button", { name: "Créer et préparer la réunion", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Ajoutez les noms de la liste" }).waitFor();
  assert.equal(creations, 0);
  await names.fill("");
  await page.getByRole("button", { name: "Créer et préparer la réunion", exact: true }).click();
  await page.getByRole("heading", { name: "Titre à préserver", exact: true }).waitFor();
  assert.equal(creations, 1);
  assert.deepEqual(createdBody.participants.map(({ name, role, presence }) => ({ name, role, presence })), [{ name: "Alice", role: "Tuteur de test", presence: "unknown" }, { name: "Bob", role: "Participant", presence: "unknown" }]);
  await context.close();
  console.log("✓ Exemple sans écriture, remplacement annulable, rôles historiques/libres, liste protégée, plafond sans troncature et création explicite");
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
