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
const baul = await mkdtemp(path.join(tmpdir(), "finca-register-browser-"));
const port = Number(process.env.FINCA_REGISTER_E2E_PORT || 5229);
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
  let dialogs = 0;
  page.on("dialog", (dialog) => { dialogs += 1; return dialog.dismiss(); });
  const meeting = {
    id: "register-meeting", title: "Réunion source du registre", date: "2026-11-07", meetingType: "Conseil de famille",
    status: "draft", stage: "Échanges", participants: [], validatedVersions: [], agenda: [], hasAudio: false,
    reportDraft: {}, audioChunkCount: 0, transcriptionState: "idle",
    markers: [
      { id: "m-confirmed", type: "decision", classification: "decision_confirmee", note: "Décision confirmée de test", timeSeconds: 12 },
      { id: "m-pending", type: "decision", classification: "a_valider", note: "", timeSeconds: 25 }
    ]
  };
  let rows = meeting.markers.map((marker) => ({ ...marker, meetingId: meeting.id, title: meeting.title, date: meeting.date }));
  let failRegister = true;
  let failDetail = false;
  let malformedRegister = false;
  let registerCalls = 0;
  let releaseRegister;
  const initialGate = new Promise((resolve) => { releaseRegister = resolve; });
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const pathname = new URL(req.url()).pathname;
    const json = (value, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(value) });
    if (pathname === "/api/meetings") return json({ meetings: [meeting], total: 1, hasMore: false });
    if (pathname === "/api/meetings/decision-register") {
      registerCalls += 1;
      if (failRegister) { await initialGate; failRegister = false; return json({ error: "Registre temporairement indisponible" }, 503); }
      if (malformedRegister) { return route.fulfill({ contentType: "text/html", body: "<html>Page indisponible</html>" }); }
      return json({ decisions: rows });
    }
    if (pathname === "/api/meetings/register-meeting") {
      if (failDetail) { failDetail = false; return json({ error: "Compte rendu indisponible pour le test" }, 404); }
      return json({ meeting });
    }
    if (pathname === "/api/meetings/register-meeting/markers/m-pending") {
      Object.assign(meeting.markers[1], req.postDataJSON());
      rows = rows.map((row) => row.id === "m-pending" ? { ...row, ...req.postDataJSON() } : row);
      return json({ meeting });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await page.goto(url);
  await page.getByRole("heading", { name: meeting.title, exact: true }).waitFor();
  await page.getByRole("button", { name: "Registre des décisions", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Chargement du registre" }).waitFor();
  assert.equal(await page.getByText("Aucun élément dans cette rubrique.", { exact: true }).count(), 0);
  releaseRegister();
  await page.getByRole("alert").filter({ hasText: "Registre temporairement indisponible" }).waitFor();
  assert.equal(await page.getByText("Aucun élément dans cette rubrique.", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Réessayer le registre", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "2 éléments dans cette rubrique" }).waitFor();
  const search = page.getByRole("searchbox", { name: "Rechercher dans le registre", exact: true });
  await search.fill("aucune correspondance");
  await page.getByText("Aucun élément ne correspond à cette recherche dans cette rubrique.", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Effacer la recherche du registre", exact: true }).click();
  assert.equal(await search.inputValue(), "");
  await page.getByRole("status").filter({ hasText: "2 éléments dans cette rubrique" }).waitFor();
  await search.fill("REUNION source");
  await page.getByRole("status").filter({ hasText: "2 éléments dans cette rubrique" }).waitFor();
  await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).selectOption("pending");
  await page.getByRole("status").filter({ hasText: "1 élément dans cette rubrique" }).waitFor();
  await page.getByText("Repère sans commentaire", { exact: true }).waitFor();
  await page.getByRole("button", { name: "Voir le compte rendu d’origine", exact: true }).click();
  const target = page.locator("#meeting-marker-m-pending");
  await target.waitFor();
  await page.waitForFunction(() => document.activeElement?.id === "meeting-marker-m-pending");
  assert.ok((await target.getAttribute("class")).includes("isHighlighted"));
  const note = target.getByLabel("Note", { exact: true });
  await note.fill("Correction du repère à conserver");
  const beforeBlockedReturn = registerCalls;
  await target.getByRole("button", { name: "Retour au registre", exact: true }).click();
  assert.equal(dialogs, 1);
  assert.equal(await note.inputValue(), "Correction du repère à conserver");
  assert.equal(registerCalls, beforeBlockedReturn);
  await target.getByRole("button", { name: "Enregistrer ce repère", exact: true }).click();
  await page.waitForFunction(() => !document.querySelector('#meeting-marker-m-pending small')?.textContent?.includes("Modifications non enregistrées"));
  await target.getByRole("button", { name: "Retour au registre", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "1 élément dans cette rubrique" }).waitFor();
  assert.equal(await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).inputValue(), "pending");
  assert.equal(await search.inputValue(), "REUNION source");
  await page.getByText("Correction du repère à conserver", { exact: true }).waitFor();
  assert.equal(dialogs, 1, "Le retour après enregistrement ne doit pas demander une nouvelle confirmation");
  console.log("✓ Chargement et échec distingués du registre vide, reprise, filtre conservé et repère d’origine mis en évidence");

  await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).selectOption("confirmed");
  await page.getByRole("button", { name: "Voir le compte rendu d’origine", exact: true }).click();
  await page.waitForFunction(() => document.activeElement?.id === "meeting-marker-m-confirmed");
  assert.equal(await page.locator(".markerCard.isHighlighted").count(), 1);
  await page.getByRole("button", { name: "← Retour au registre des décisions", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "1 élément dans cette rubrique" }).waitFor();
  assert.equal(await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).inputValue(), "confirmed");
  failDetail = true;
  await page.getByRole("button", { name: "Voir le compte rendu d’origine", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Compte rendu indisponible pour le test" }).waitFor();
  assert.equal(await page.getByRole("heading", { name: meeting.title, exact: true }).count(), 0, "Ne pas afficher l’ancien compte rendu lorsque l’ouverture échoue");
  malformedRegister = true;
  await page.getByRole("button", { name: "← Retour au registre des décisions", exact: true }).click();
  await page.getByRole("alert").filter({ hasText: "Le registre reçu est incomplet" }).waitFor();
  malformedRegister = false;
  assert.equal(await page.getByText("Aucun élément dans cette rubrique.", { exact: true }).count(), 0);
  await page.getByRole("button", { name: "Réessayer le registre", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "1 élément dans cette rubrique" }).waitFor();
  assert.equal(await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).inputValue(), "confirmed");
  await page.getByRole("button", { name: "Effacer la recherche du registre", exact: true }).click();
  rows = [];
  await page.getByRole("button", { name: "Revenir aux réunions", exact: true }).click();
  await page.getByRole("button", { name: "Registre des décisions", exact: true }).click();
  await page.getByText("Aucun élément dans cette rubrique.", { exact: true }).waitFor();
  assert.equal(await page.getByRole("alert").count(), 0);
  rows = [
    ...Array.from({ length: 25 }, (_, i) => ({ ...meeting.markers[0], id: `first-${i}`, meetingId: meeting.id, title: "Début du registre", note: `Repère initial ${i}` })),
    { ...meeting.markers[0], meetingId: meeting.id, title: meeting.title },
    ...Array.from({ length: 25 }, (_, i) => ({ ...meeting.markers[0], id: `last-${i}`, meetingId: meeting.id, title: "Fin du registre", note: `Repère final ${i}` }))
  ];
  await page.getByRole("button", { name: "Revenir aux réunions", exact: true }).click();
  await page.getByRole("button", { name: "Registre des décisions", exact: true }).click();
  const sources = page.getByRole("button", { name: "Voir le compte rendu d’origine", exact: true });
  const previous = page.getByRole("button", { name: "Page précédente du registre", exact: true });
  const next = page.getByRole("button", { name: "Page suivante du registre", exact: true });
  await page.getByRole("status").filter({ hasText: "Éléments 1 à 25 sur 51" }).waitFor();
  assert.equal(await sources.count(), 25);
  assert.equal(await previous.isDisabled(), true);
  await next.click();
  await page.getByRole("status").filter({ hasText: "Éléments 26 à 50 sur 51" }).waitFor();
  await sources.first().click();
  await page.waitForFunction(() => document.activeElement?.id === "meeting-marker-m-confirmed");
  await page.getByRole("button", { name: "← Retour au registre des décisions", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Éléments 26 à 50 sur 51" }).waitFor();
  await next.click();
  await page.getByRole("status").filter({ hasText: "Éléments 51 à 51 sur 51" }).waitFor();
  assert.equal(await sources.count(), 1);
  assert.equal(await next.isDisabled(), true);
  await previous.click();
  await page.getByRole("status").filter({ hasText: "Éléments 26 à 50 sur 51" }).waitFor();
  await search.fill("Fin du registre");
  await page.getByRole("status").filter({ hasText: "25 éléments dans cette rubrique" }).waitFor();
  assert.equal(await sources.count(), 25);
  assert.equal(await next.count(), 0);
  await page.getByRole("button", { name: "Effacer la recherche du registre", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "Éléments 1 à 25 sur 51" }).waitFor();
  await next.click();
  await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).selectOption("pending");
  await page.getByText("Aucun élément dans cette rubrique.", { exact: true }).waitFor();
  await page.getByRole("combobox", { name: "Filtrer le registre des décisions", exact: true }).selectOption("all");
  await page.getByRole("status").filter({ hasText: "Éléments 1 à 25 sur 51" }).waitFor();
  // Le registre peut rétrécir pendant la consultation d’un compte rendu.
  await next.click();
  await sources.first().click();
  await page.waitForFunction(() => document.activeElement?.id === "meeting-marker-m-confirmed");
  rows = rows.slice(0, 2);
  await page.getByRole("button", { name: "← Retour au registre des décisions", exact: true }).click();
  await page.getByRole("status").filter({ hasText: "2 éléments dans cette rubrique" }).waitFor();
  assert.equal(await sources.count(), 2);
  assert.equal(await next.count(), 0);
  console.log("✓ Pagination bornée à 25 cartes, dernière page, retour conservé, recherche et filtres réinitialisant la page, registre réduit");
  await context.close();
  console.log("✓ Retour protégé en cas de saisie, filtre confirmé conservé, source indisponible et registre réellement vide");
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
