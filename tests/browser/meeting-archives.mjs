import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium, firefox } = require("playwright");
const browserName = process.env.FINCA_TEST_BROWSER || "chromium";
if (!["chromium", "firefox"].includes(browserName)) {
  throw new Error("FINCA_TEST_BROWSER doit être chromium ou firefox.");
}
const browserType = browserName === "firefox" ? firefox : chromium;
const browserExecutablePath = browserName === "firefox"
  ? process.env.FINCA_FIREFOX_PATH
  : process.env.FINCA_CHROMIUM_PATH;
const baul = await mkdtemp(path.join(tmpdir(), "finca-archives-browser-"));
const port = Number(process.env.FINCA_ARCHIVES_E2E_PORT || 5231);
const origin = `http://127.0.0.1:${port}`;
const url = `${origin}/?view=reunions`;
const server = spawn(
  process.execPath,
  [
    "node_modules/vite/bin/vite.js",
    "--config",
    "vite.config.preview.js",
    "--host",
    "127.0.0.1",
    "--port",
    String(port),
    "--strictPort",
  ],
  {
    cwd: path.join(root, "app"),
    env: { ...process.env, CORTIJO_BAUL_DIR: baul },
    stdio: ["ignore", "pipe", "pipe"],
  },
);
let logs = "";
server.stdout.on("data", (data) => {
  logs += data;
});
server.stderr.on("data", (data) => {
  logs += data;
});
let spawnError;
server.on("error", (error) => {
  spawnError = error;
});
let browser;

try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (spawnError) throw spawnError;
    if (server.exitCode !== null) throw new Error(`Serveur arrêté : ${logs}`);
    try {
      const response = await fetch(`${origin}/api/finca/local-identity`);
      const identity = await response.json();
      ready =
        identity.application === "finca-maria" &&
        identity.checkout === path.join(root, "app");
    } catch {
      /* Le serveur démarre. */
    }
    if (ready) break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  assert.ok(ready, `Serveur de test indisponible : ${logs}`);
  browser = await browserType.launch({
    headless: true,
    ...(browserExecutablePath ? { executablePath: browserExecutablePath } : {}),
  });
  const context = await browser.newContext({ locale: "fr-FR" });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  const original =
    "Réunion fictive n° 3 du 28/01/2022\nPrésents : Personne Test\nParticipants : Personne Inconnue\nProposition : repeindre le portail";
  let meeting = {
    id: "archive-browser",
    title: "Archive fictive",
    date: "2022-01-28",
    meetingType: "Archive",
    theme: "Portail",
    status: "review",
    stage: "Clôture",
    participants: [],
    markers: [],
    validatedVersions: [],
    reportDraft: { historicOriginal: original },
    transcriptionState: "idle",
    participantCount: 0,
    presentCount: 0,
    markerCount: 0,
    sources: [],
  };
  const old = {
    ...meeting,
    id: "archive-2021",
    title: "Archive précédente",
    date: "2021-12-01",
  };
  let releaseReview;
  const reviewGate = new Promise((resolve) => {
    releaseReview = resolve;
  });
  let saved = 0;
  let analyzed = 0;
  let lastBody;
  const { previewArchive, participationSummary } = await import(
    "../../server/src/archive-domain.js"
  );
  await page.route("**/api/**", async (route) => {
    const req = route.request();
    const parsed = new URL(req.url());
    const pathname = parsed.pathname;
    const json = (value, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(value),
      });
    if (pathname === "/api/meetings")
      return json({ meetings: [meeting, old], total: 2, hasMore: false });
    if (pathname === "/api/meetings/archive-browser") return json({ meeting });
    if (pathname === "/api/meetings/archive-2021")
      return json({ meeting: old });
    if (pathname === "/api/meetings/archive-preview") {
      analyzed++;
      return json({ ...previewArchive(original), originalText: original });
    }
    if (pathname === "/api/meetings/structure-review") {
      saved++;
      await reviewGate;
      lastBody = req.postDataJSON();
      meeting = {
        ...meeting,
        participants: lastBody.participants.map((p, i) => ({
          ...p,
          id: `person-${i}`,
        })),
        markers: lastBody.markers.map((m, i) => ({
          ...m,
          id: `marker-${i}`,
          timeSeconds: 0,
        })),
        participantCount: lastBody.participants.length,
        markerCount: lastBody.markers.length,
      };
      return json({ meeting });
    }
    if (pathname === "/api/meetings/participation") {
      const meetings = [meeting, old].filter(
        (m) =>
          (!parsed.searchParams.get("from") ||
            m.date >= parsed.searchParams.get("from")) &&
          (!parsed.searchParams.get("to") ||
            m.date <= parsed.searchParams.get("to")),
      );
      return json({
        meetings,
        people: participationSummary(
          meetings,
          meeting.participants.map((p) => ({ ...p, meetingId: meeting.id })),
        ),
        denominatorNote:
          "Présents + absents + excusés. Les inconnus sont exclus.",
      });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "Archive fictive", exact: true })
    .waitFor();
  assert.equal(
    await page
      .locator(".meetingYear summary")
      .allTextContents()
      .then((v) => v.join(",")),
    "2022,2021",
  );
  await page
    .getByRole("button", {
      name: "Vérifier les participants et repères de cette archive",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Analyser et afficher l’aperçu", exact: true })
    .click();
  await page
    .getByText("Texte original utilisé pour la vérification", { exact: true })
    .waitFor();
  assert.equal(analyzed, 1);
  assert.equal(saved, 0);
  const save = page.getByRole("button", {
    name: "Enregistrer les informations vérifiées",
    exact: true,
  });
  assert.equal(await save.isDisabled(), true);
  const presence = page.getByLabel("Présence du participant 2");
  assert.equal(await presence.inputValue(), "unknown");
  assert.equal(
    await page.getByLabel("Statut du repère 1").inputValue(),
    "proposition",
  );
  await page.getByRole("checkbox", { name: /J’ai vérifié les noms/ }).check();
  await presence.selectOption("excused");
  assert.equal(
    await save.isDisabled(),
    true,
    "Une correction exige une nouvelle validation explicite",
  );
  await page.getByRole("checkbox", { name: /J’ai vérifié les noms/ }).check();
  await save.click();
  await page
    .locator(".meetingList")
    .getByRole("button", { name: /Archive précédente/ })
    .click();
  await page
    .getByRole("alert")
    .filter({ hasText: "Attendez la fin du traitement de l’archive" })
    .waitFor();
  releaseReview();
  await page
    .getByRole("heading", { name: "Archive fictive", exact: true })
    .waitFor();
  assert.equal(saved, 1);
  assert.equal(lastBody.participants[1].presence, "excused");
  assert.equal(meeting.reportDraft.historicOriginal, original);
  await page
    .getByRole("button", { name: "Participants et participation", exact: true })
    .click();
  await page.getByRole("table").waitFor();
  await page.getByRole("row").filter({ hasText: "Personne Test" }).waitFor();
  await page.getByLabel("Début de période").fill("2022-01-01");
  await page.getByLabel("Fin de période").fill("2022-12-31");
  await page
    .getByRole("row")
    .filter({ hasText: "Personne Test" })
    .filter({ hasText: "100 % (1/1)" })
    .waitFor();
  await page
    .getByText("Historique de Personne Inconnue", { exact: true })
    .click();
  await page.getByText("2022-01-28 · Excusé ·", { exact: false }).waitFor();
  await page
    .getByRole("button", { name: "Revenir aux réunions", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: "Importer un Word pour cette réunion",
      exact: true,
    })
    .click();
  const target = page.getByRole("combobox", {
    name: "Destination du document Word",
    exact: true,
  });
  assert.equal(await target.inputValue(), meeting.id);
  await page.locator('input[type="file"]').setInputFiles({
    name: "fictif.docx",
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: Buffer.from(
      "Fixture : lecture Word testée séparément avec l’API et PostgreSQL",
    ),
  });
  await page
    .getByRole("button", { name: "Analyser et afficher l’aperçu", exact: true })
    .click();
  await page
    .getByText("Texte original utilisé pour la vérification", { exact: true })
    .waitFor();
  assert.equal(
    saved,
    1,
    "Choisir et analyser un Word ne doit rien enregistrer",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await context.close();
  console.log(
    "✓ Archives par année, aperçu sans écriture, validation révoquée après correction, présences/statistiques par période, import Word et affichage mobile",
  );
} finally {
  try {
    await browser?.close();
  } finally {
    if (server.exitCode === null && server.signalCode === null) {
      const closed = once(server, "close");
      server.kill("SIGTERM");
      await closed;
    }
    await rm(baul, { recursive: true, force: true });
  }
}
