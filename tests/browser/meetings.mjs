import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
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
      const nextVersion = (meeting.validatedVersions[0]?.version || 0) + 1;
      const snapshot = {
        schema: "finca-meeting-report-v1",
        meeting: { id: meeting.id, title: meeting.title, date: meeting.date, meetingType: meeting.meetingType, agenda: meeting.agenda },
        reportDraft: structuredClone(meeting.reportDraft), participants: structuredClone(meeting.participants),
        markers: structuredClone(meeting.markers), links: [], validatedAt: "2026-11-06T12:00:00Z"
      };
      meeting = { ...meeting, status: "validated", validatedVersions: [{ id: `v${nextVersion}`, version: nextVersion, validatedAt: "2026-11-06T12:00:00Z", snapshot }, ...meeting.validatedVersions] };
      return json({ meeting, version: nextVersion });
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
  await summary.fill("Brouillon plus récent non validé");
  const beforeExport = requests.length;
  async function exportVersion(number) {
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: `Exporter la version ${number} (.txt)`, exact: true }).click();
    const download = await downloadEvent;
    assert.ok(download.suggestedFilename().includes(`_v${number}_`));
    const content = await readFile(await download.path(), "utf8");
    return content;
  }
  const firstExport = await exportVersion(1);
  assert.ok(firstExport.includes("Synthèse à conserver malgré une panne"));
  assert.ok(!firstExport.includes("Brouillon plus récent non validé"));
  assert.equal(await summary.inputValue(), "Brouillon plus récent non validé");
  assert.equal(requests.length, beforeExport, "Exporter ne doit pas sauvegarder ou valider le brouillon");
  await validate.click();
  await page.getByText("Compte rendu validé · v2", { exact: true }).waitFor();
  const oldExport = await exportVersion(1);
  const newExport = await exportVersion(2);
  assert.equal(oldExport, firstExport, "La première version doit rester identique après une seconde validation");
  assert.ok(newExport.includes("Brouillon plus récent non validé"));
  assert.ok(newExport.includes("Version validée : 2"));
  console.log("✓ Téléchargement texte par version, brouillon exclu, texte saisi intact et ancienne version inchangée après une nouvelle validation");
  await context.close();
  console.log("✓ Sauvegarde avant validation, double clic neutralisé, contrôles temporairement bloqués puis réactivés");
  const draftContext = await browser.newContext({ locale: "fr-FR" });
  const draftsPage = await draftContext.newPage();
  let discardChanges = true;
  const leaveDialogs = [];
  draftsPage.on("dialog", (dialog) => {
    leaveDialogs.push(dialog.message());
    return discardChanges ? dialog.accept() : dialog.dismiss();
  });
  draftsPage.setDefaultTimeout(10000);
  await draftsPage.clock.install();
  let currentMeeting = {
    id: "draft-one", title: "Préparation serveur", date: "2026-11-06",
    meetingType: "Conseil de famille", status: "draft", stage: "Échanges",
    agenda: [], validatedVersions: [], linkedDocuments: [], reportDraft: { summary: "Synthèse serveur", subjects: "Travaux" },
    transcriptionState: "running",
    transcript: { segments: [{ sourceSpeaker: "SPEAKER_00", speakerConfidence: "non-identifie", speaker: "Intervenant 1", start: 0, text: "Bonjour" }], warnings: [] },
    transcriptText: "Transcription initiale",
    participants: [{ id: "p1", name: "Nom serveur", presence: "present", role: "", isFacilitator: true }],
    markers: [{ id: "m1", type: "question", note: "Note serveur", classification: "question_ouverte", timeSeconds: 0, responsible: "", dueDate: "" }]
  };
  let otherMeeting = { ...currentMeeting, id: "draft-two", title: "Autre réunion", transcriptionState: "idle", participants: [], markers: [], reportDraft: { summary: "Autre synthèse", subjects: "" } };
  let detailGate;
  let preparationGate;
  let rejectPreparation = false;
  await draftsPage.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === "/api/meetings") return json({ meetings: [currentMeeting, otherMeeting] });
    if (pathname === "/api/meetings/draft-two") {
      if (request.method() === "PUT") otherMeeting = { ...otherMeeting, ...request.postDataJSON() };
      return json({ meeting: otherMeeting });
    }
    if (pathname === "/api/meetings/draft-one" && request.method() === "GET") {
      const snapshot = structuredClone(currentMeeting);
      if (detailGate) await detailGate;
      return json({ meeting: snapshot });
    }
    if (pathname === "/api/meetings/draft-one" && request.method() === "PUT") {
      if (preparationGate) await preparationGate;
      if (rejectPreparation) return json({ error: "Sauvegarde momentanément impossible" }, 503);
      currentMeeting = { ...currentMeeting, ...request.postDataJSON() };
      return json({ meeting: currentMeeting });
    }
    if (pathname.endsWith("/participants/p1")) {
      currentMeeting = { ...currentMeeting, participants: [{ ...currentMeeting.participants[0], ...request.postDataJSON() }] };
      return json({ meeting: currentMeeting });
    }
    if (pathname.endsWith("/markers/m1")) {
      currentMeeting = { ...currentMeeting, markers: [{ ...currentMeeting.markers[0], ...request.postDataJSON() }] };
      return json({ meeting: currentMeeting });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await draftsPage.goto(route);
  const title = draftsPage.getByLabel("Titre", { exact: true });
  const draftSummary = draftsPage.getByLabel("Synthèse rédigée et modifiable");
  const participantName = draftsPage.getByLabel("Nom", { exact: true });
  const markerNote = draftsPage.getByLabel("Note", { exact: true });
  await title.fill("Préparation en cours de rédaction");
  await draftSummary.fill("Synthèse en cours de rédaction");
  await participantName.fill("Nom corrigé localement");
  await markerNote.fill("Note en cours de rédaction");
  const speakerChoice = draftsPage.locator(".speakerFixRow select");
  await speakerChoice.selectOption("Nom serveur");
  currentMeeting = { ...currentMeeting, transcriptText: "Transcription reçue pendant la rédaction" };
  const poll = draftsPage.waitForResponse((response) => response.request().method() === "GET" && response.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.clock.fastForward(2600);
  await poll;
  await draftsPage.locator(".transcript").filter({ hasText: "Transcription reçue pendant la rédaction" }).waitFor();
  assert.equal(await title.inputValue(), "Préparation en cours de rédaction");
  assert.equal(await draftSummary.inputValue(), "Synthèse en cours de rédaction");
  assert.equal(await participantName.inputValue(), "Nom corrigé localement");
  assert.equal(await markerNote.inputValue(), "Note en cours de rédaction");
  assert.equal(await speakerChoice.inputValue(), "Nom serveur");
  console.log("✓ Le résultat de transcription se met à jour sans écraser préparation, synthèse, participant ni repère en cours de saisie");

  rejectPreparation = true;
  await draftsPage.getByRole("button", { name: "Enregistrer la préparation", exact: true }).click();
  await draftsPage.getByRole("alert").filter({ hasText: "Sauvegarde momentanément impossible" }).waitFor();
  const failedSavePoll = draftsPage.waitForResponse((response) => response.request().method() === "GET" && response.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.clock.fastForward(2600);
  await failedSavePoll;
  assert.equal(await title.inputValue(), "Préparation en cours de rédaction");
  assert.equal(await draftSummary.inputValue(), "Synthèse en cours de rédaction");
  assert.equal(await draftsPage.getByRole("alert").innerText(), "Sauvegarde momentanément impossible");
  rejectPreparation = false;
  console.log("✓ Un échec de sauvegarde reste visible et le rafraîchissement suivant conserve les saisies");

  let releasePreparation;
  preparationGate = new Promise((resolve) => { releasePreparation = resolve; });
  const preparationRequest = draftsPage.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.getByRole("button", { name: "Enregistrer la préparation", exact: true }).click();
  await preparationRequest;
  await title.fill("Nouvelle saisie pendant la sauvegarde");
  const preparationResponse = draftsPage.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith("/api/meetings/draft-one"));
  releasePreparation();
  await preparationResponse;
  await draftsPage.locator(".meetingNotice.ok").filter({ hasText: "Préparation enregistrée" }).waitFor();
  assert.equal(currentMeeting.title, "Préparation en cours de rédaction");
  assert.equal(await title.inputValue(), "Nouvelle saisie pendant la sauvegarde");
  assert.equal(await draftSummary.inputValue(), "Synthèse en cours de rédaction");
  const afterSavePoll = draftsPage.waitForResponse((response) => response.request().method() === "GET" && response.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.clock.fastForward(2600);
  await afterSavePoll;
  assert.equal(await title.inputValue(), "Nouvelle saisie pendant la sauvegarde");
  preparationGate = undefined;
  const secondSave = draftsPage.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.getByRole("button", { name: "Enregistrer la préparation", exact: true }).click();
  await secondSave;
  assert.equal(currentMeeting.title, "Nouvelle saisie pendant la sauvegarde");
  console.log("✓ Le retour d’une sauvegarde lente conserve les caractères saisis depuis son envoi");

  const participantSave = draftsPage.waitForResponse((response) => response.url().endsWith("/participants/p1"));
  await draftsPage.locator(".participantList").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await participantSave;
  const markerSave = draftsPage.waitForResponse((response) => response.url().endsWith("/markers/m1"));
  await draftsPage.getByRole("button", { name: "Enregistrer ce repère", exact: true }).click();
  await markerSave;
  assert.equal(currentMeeting.participants[0].name, "Nom corrigé localement");
  assert.equal(currentMeeting.markers[0].note, "Note en cours de rédaction");

  let releaseOldPoll;
  detailGate = new Promise((resolve) => { releaseOldPoll = resolve; });
  const oldPollRequest = draftsPage.waitForRequest((request) => request.method() === "GET" && request.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.clock.fastForward(2600);
  await oldPollRequest;
  await draftsPage.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  await draftsPage.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Autre réunion");
  const oldPollResponse = draftsPage.waitForResponse((response) => response.request().method() === "GET" && response.url().endsWith("/api/meetings/draft-one"));
  releaseOldPoll();
  await oldPollResponse;
  await draftsPage.clock.runFor(1);
  assert.equal(await title.inputValue(), "Autre réunion");
  assert.equal(await draftSummary.inputValue(), "Autre synthèse");
  detailGate = undefined;
  currentMeeting = { ...currentMeeting, transcriptionState: "idle" };
  await draftsPage.locator(".meetingList button").first().click();
  await draftsPage.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Nouvelle saisie pendant la sauvegarde");
  let releaseBackgroundSave;
  preparationGate = new Promise((resolve) => { releaseBackgroundSave = resolve; });
  await title.fill("Ancienne réunion sauvegardée en arrière-plan");
  const backgroundSave = draftsPage.waitForRequest((request) => request.method() === "PUT" && request.url().endsWith("/api/meetings/draft-one"));
  await draftsPage.getByRole("button", { name: "Enregistrer la préparation", exact: true }).click();
  await backgroundSave;
  await draftsPage.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  await draftsPage.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Autre réunion");
  const backgroundResponse = draftsPage.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith("/api/meetings/draft-one"));
  releaseBackgroundSave();
  await backgroundResponse;
  await draftsPage.clock.runFor(1);
  assert.equal(await title.inputValue(), "Autre réunion");
  assert.equal(await draftSummary.inputValue(), "Autre synthèse");
  assert.equal(currentMeeting.title, "Ancienne réunion sauvegardée en arrière-plan");
  discardChanges = false;
  await draftSummary.fill("Texte non enregistré à conserver");
  await draftsPage.locator(".meetingList button").first().click();
  assert.equal(await title.inputValue(), "Autre réunion");
  assert.equal(await draftSummary.inputValue(), "Texte non enregistré à conserver");
  for (const name of ["+ Nouvelle", "Importer des comptes rendus", "Registre des décisions"]) {
    await draftsPage.getByRole("button", { name, exact: true }).click();
    assert.equal(await draftSummary.inputValue(), "Texte non enregistré à conserver");
  }
  const wouldProtectUnload = () => draftsPage.evaluate(() => {
    const event = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  });
  assert.equal(await wouldProtectUnload(), true);
  const reloadDialog = draftsPage.waitForEvent("dialog", (dialog) => dialog.type() === "beforeunload");
  const reloadAttempt = draftsPage.reload().catch(() => null);
  await reloadDialog;
  await reloadAttempt;
  assert.equal(await draftSummary.inputValue(), "Texte non enregistré à conserver");
  const reportSaved = draftsPage.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith("/api/meetings/draft-two"));
  await draftsPage.getByRole("button", { name: "Sauvegarder le brouillon", exact: true }).click();
  await reportSaved;
  await draftsPage.locator(".meetingNotice.ok").filter({ hasText: "Brouillon du compte rendu sauvegardé" }).waitFor();
  assert.equal(await wouldProtectUnload(), false);
  const beforeCleanNavigation = leaveDialogs.length;
  await draftsPage.locator(".meetingList button").first().click();
  await draftsPage.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Ancienne réunion sauvegardée en arrière-plan");
  assert.equal(leaveDialogs.length, beforeCleanNavigation, "Une saisie enregistrée ne doit pas provoquer de confirmation");
  console.log("✓ Annuler la sortie préserve le texte ; changer de vue et quitter la page sont protégés uniquement en présence de saisies");

  await markerNote.fill("Repère modifié sans enregistrement");
  await draftsPage.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  assert.equal(await markerNote.inputValue(), "Repère modifié sans enregistrement");
  await participantName.fill("Participant modifié sans enregistrement");
  await draftsPage.getByRole("button", { name: "+ Nouvelle", exact: true }).click();
  assert.equal(await participantName.inputValue(), "Participant modifié sans enregistrement");
  assert.equal(await wouldProtectUnload(), true);
  const markerGuardSave = draftsPage.waitForResponse((response) => response.url().endsWith("/markers/m1"));
  await draftsPage.getByRole("button", { name: "Enregistrer ce repère", exact: true }).click();
  await markerGuardSave;
  const participantGuardSave = draftsPage.waitForResponse((response) => response.url().endsWith("/participants/p1"));
  await draftsPage.locator(".participantList").getByRole("button", { name: "Enregistrer", exact: true }).click();
  await participantGuardSave;
  await draftsPage.clock.runFor(1);
  assert.equal(await wouldProtectUnload(), false);
  console.log("✓ Les repères et participants non enregistrés sont également détectés, puis libérés après sauvegarde");

  await markerNote.fill("Texte explicitement abandonné");
  discardChanges = true;
  await draftsPage.locator(".meetingList").getByRole("button", { name: /Autre réunion/ }).click();
  await draftsPage.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Autre réunion");
  assert.equal(await wouldProtectUnload(), false);
  await draftsPage.getByRole("button", { name: "+ Nouvelle", exact: true }).click();
  await title.fill("Nouvelle réunion non enregistrée");
  discardChanges = false;
  await draftsPage.getByRole("button", { name: "Annuler", exact: true }).click();
  assert.equal(await title.inputValue(), "Nouvelle réunion non enregistrée");
  discardChanges = true;
  await draftsPage.getByRole("button", { name: "Annuler", exact: true }).click();
  await draftsPage.waitForFunction(() => document.querySelector('.meetingGrid input')?.value === "Autre réunion");
  assert.equal(await wouldProtectUnload(), false);
  console.log("✓ L’abandon confirmé fonctionne et l’annulation d’une nouvelle réunion revient à la réunion précédente");
  await draftContext.close();
  console.log("✓ Enregistrement des corrections et rejet d’une ancienne réponse après changement de réunion");

  const actionContext = await browser.newContext({ locale: "fr-FR" });
  const actionPage = await actionContext.newPage();
  actionPage.setDefaultTimeout(10000);
  let acceptAction = false;
  let actionDialogs = 0;
  actionPage.on("dialog", (dialog) => { actionDialogs += 1; return acceptAction ? dialog.accept() : dialog.dismiss(); });
  let actionMeeting = {
    ...meeting, id: "action-meeting", title: "Réunion avec action confirmée", transcriptionState: "idle",
    validatedVersions: [{ version: 1 }],
    markers: [{ id: "action-marker", type: "action", classification: "action_confirmee", note: "Travaux à organiser", responsible: "", dueDate: "", timeSeconds: 0 }]
  };
  let actionCalls = 0;
  let failAction = true;
  let releaseAction;
  let actionGate = new Promise((resolve) => { releaseAction = resolve; });
  await actionPage.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === "/api/meetings") return json({ meetings: [actionMeeting] });
    if (pathname === "/api/meetings/action-meeting") return json({ meeting: actionMeeting });
    if (pathname.endsWith("/markers/action-marker")) {
      actionMeeting = { ...actionMeeting, markers: [{ ...actionMeeting.markers[0], ...request.postDataJSON() }] };
      return json({ meeting: actionMeeting });
    }
    if (pathname.endsWith("/create-action")) {
      actionCalls += 1;
      assert.equal(request.postDataJSON().confirmed, true);
      await actionGate;
      if (failAction) return json({ error: "Création refusée pour le test" }, 503);
      return json({ meeting: actionMeeting, duplicate: false });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await actionPage.goto(route);
  const createAction = actionPage.getByRole("button", { name: "Créer l’action FINCA", exact: true });
  await createAction.click();
  assert.equal(actionCalls, 0, "Une confirmation annulée ne doit envoyer aucune demande");
  assert.equal(actionDialogs, 1);
  const actionNote = actionPage.getByLabel("Note", { exact: true });
  await actionNote.fill("Travaux corrigés avant création");
  assert.equal(await createAction.isDisabled(), true);
  await actionPage.getByText("Enregistrez ce repère avant de créer l’action pour reprendre vos dernières corrections.", { exact: true }).waitFor();
  await actionPage.getByRole("button", { name: "Enregistrer ce repère", exact: true }).click();
  await actionPage.waitForFunction(() => ![...document.querySelectorAll('button')].find((button) => button.textContent === "Créer l’action FINCA")?.disabled);
  assert.equal(actionMeeting.markers[0].note, "Travaux corrigés avant création");
  acceptAction = true;
  await createAction.evaluate((button) => { button.click(); button.click(); });
  const pendingAction = actionPage.getByRole("button", { name: "Création de l’action en cours…", exact: true });
  await pendingAction.waitFor();
  assert.equal(await pendingAction.isDisabled(), true);
  assert.equal(await actionNote.isDisabled(), true);
  assert.equal(await actionPage.locator("#meeting-marker-action-marker .markerFields input:enabled, #meeting-marker-action-marker .markerFields select:enabled").count(), 0);
  assert.equal(await actionPage.getByRole("button", { name: "Enregistrer ce repère", exact: true }).isDisabled(), true);
  await actionPage.waitForFunction(() => document.querySelector('#meeting-marker-action-marker input')?.disabled);
  releaseAction();
  await actionPage.getByRole("alert").filter({ hasText: "Création refusée pour le test" }).waitFor();
  assert.equal(actionCalls, 1, "Un double clic doit produire une seule demande");
  assert.equal(actionDialogs, 2, "Un double clic doit demander une seule confirmation");
  assert.equal(await createAction.isEnabled(), true);
  assert.equal(await actionNote.isEnabled(), true);
  failAction = false;
  actionGate = Promise.resolve();
  await createAction.click();
  await actionPage.getByText("Action confirmée créée dans FINCA MARIA.", { exact: true }).waitFor();
  assert.equal(actionCalls, 2);
  assert.equal(await actionPage.getByRole("alert").count(), 0, "Le succès ne doit pas conserver l’erreur précédente");
  assert.equal(await actionNote.inputValue(), "Travaux corrigés avant création");
  await actionContext.close();
  console.log("✓ Action confirmée : annulation, corrections enregistrées, double clic verrouillé, échec puis nouvelle tentative");

  const documentContext = await browser.newContext({ locale: "fr-FR" });
  const documentPage = await documentContext.newPage();
  documentPage.setDefaultTimeout(10000);
  let documentMeeting = {
    ...meeting, id: "document-meeting", title: "Réunion avec document", transcriptionState: "idle", validatedVersions: [],
    markers: [{ id: "document-marker", type: "document_evoque", classification: "document_evoque", note: "Devis à consulter", timeSeconds: 0 }],
    links: [{ id: "old-link", markerId: "document-marker", kind: "document", targetRef: "missing-document" }]
  };
  let documentsMode = "error";
  let releaseDocuments;
  let documentsGate = new Promise((resolve) => { releaseDocuments = resolve; });
  let linkCalls = 0;
  let failLink = true;
  let releaseLink;
  let linkGate = new Promise((resolve) => { releaseLink = resolve; });
  await documentPage.route("**/api/**", async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
    if (pathname === "/api/meetings") return json({ meetings: [documentMeeting] });
    if (pathname === "/api/meetings/document-meeting") return json({ meeting: documentMeeting });
    if (pathname.endsWith("/markers/document-marker")) {
      documentMeeting = { ...documentMeeting, markers: [{ ...documentMeeting.markers[0], ...request.postDataJSON() }] };
      return json({ meeting: documentMeeting });
    }
    if (pathname === "/api/meetings/documents") {
      await documentsGate;
      if (documentsMode === "error") return json({ error: "Liste temporairement indisponible" }, 503);
      if (documentsMode === "malformed") return json({ documents: [{ id: "invalid" }] });
      if (documentsMode === "empty") return json({ documents: [] });
      return json({ documents: [{ id: "doc-one", name: "Devis toiture validé" }, { id: "doc-two", name: "Plan validé" }] });
    }
    if (pathname.endsWith("/link-document")) {
      linkCalls += 1;
      assert.equal(request.postDataJSON().documentId, "doc-one");
      await linkGate;
      if (failLink) return json({ error: "Rattachement refusé pour le test" }, 503);
      documentMeeting = { ...documentMeeting, links: [...documentMeeting.links, { id: "new-link", markerId: "document-marker", kind: "document", targetRef: "doc-one" }] };
      return json({ meeting: documentMeeting, duplicate: false });
    }
    return json({ documents: [], localEngineReady: false });
  });
  await documentPage.goto(route);
  const documentSelect = documentPage.getByRole("combobox", { name: "Document BAÚL à rattacher", exact: true });
  const linkButton = documentPage.getByRole("button", { name: "Lier", exact: true });
  await documentSelect.waitFor();
  const reloadDocuments = documentPage.getByRole("button", { name: "Recharger les documents BAÚL", exact: true });
  const emptyDocuments = documentPage.getByText("Aucun document BAÚL validé disponible pour le rattachement.", { exact: true });
  await documentPage.getByRole("status").filter({ hasText: "Chargement des documents BAÚL" }).waitFor();
  assert.equal(await documentSelect.isDisabled(), true);
  assert.equal(await reloadDocuments.isDisabled(), true);
  assert.equal(await emptyDocuments.count(), 0);
  releaseDocuments();
  await documentPage.getByRole("alert").filter({ hasText: "Liste temporairement indisponible" }).waitFor();
  assert.equal(await emptyDocuments.count(), 0);
  assert.equal(await documentSelect.isDisabled(), true);
  const documentNote = documentPage.getByLabel("Note", { exact: true });
  await documentNote.fill("Note à conserver pendant la reprise des documents");
  documentsGate = Promise.resolve();
  documentsMode = "malformed";
  await reloadDocuments.click();
  await documentPage.getByRole("alert").filter({ hasText: "La liste des documents BAÚL reçue est incomplète" }).waitFor();
  assert.equal(await emptyDocuments.count(), 0);
  documentsMode = "empty";
  await reloadDocuments.click();
  await emptyDocuments.waitFor();
  assert.equal(await documentSelect.isDisabled(), true);
  assert.equal(await documentPage.getByRole("alert").count(), 0);
  documentsMode = "ready";
  await reloadDocuments.click();
  await documentPage.waitForFunction(() => !document.querySelector('[aria-label="Document BAÚL à rattacher"]')?.disabled);
  assert.equal(await emptyDocuments.count(), 0);
  assert.equal(await documentNote.inputValue(), "Note à conserver pendant la reprise des documents");
  await documentPage.getByText("Document BAÚL indisponible dans la liste des documents validés", { exact: true }).waitFor();
  assert.equal(await linkButton.isDisabled(), true);
  await documentSelect.selectOption("doc-one");
  await linkButton.evaluate((button) => { button.click(); button.click(); });
  const linking = documentPage.getByRole("button", { name: "Rattachement en cours…", exact: true });
  await linking.waitFor();
  assert.equal(await linking.isDisabled(), true);
  assert.equal(await documentSelect.isDisabled(), true);
  releaseLink();
  await documentPage.getByRole("alert").filter({ hasText: "Rattachement refusé pour le test" }).waitFor();
  assert.equal(linkCalls, 1);
  assert.equal(await documentSelect.inputValue(), "doc-one");
  assert.equal(await documentSelect.isEnabled(), true);
  failLink = false;
  linkGate = Promise.resolve();
  await linkButton.click();
  await documentPage.getByText("Document BAÚL rattaché à la réunion.", { exact: true }).waitFor();
  await documentPage.locator("#meeting-marker-document-marker li").filter({ hasText: "Devis toiture validé" }).waitFor();
  assert.equal(await linkButton.isDisabled(), true);
  assert.equal(await documentPage.getByRole("alert").count(), 0);
  await documentPage.getByRole("status").filter({ hasText: "Ce document est déjà rattaché à cette réunion." }).waitFor();
  await documentSelect.selectOption("doc-two");
  assert.equal(await linkButton.isEnabled(), true);
  const savedDocumentNote = documentPage.waitForResponse((response) => response.url().endsWith("/markers/document-marker"));
  await documentPage.getByRole("button", { name: "Enregistrer ce repère", exact: true }).click();
  await savedDocumentNote;
  await documentPage.waitForFunction(() => !document.querySelector('#meeting-marker-document-marker small')?.textContent?.includes("Modifications non enregistrées"));
  await documentPage.reload();
  await documentPage.locator("#meeting-marker-document-marker li").filter({ hasText: "Devis toiture validé" }).waitFor();
  await documentPage.getByRole("combobox", { name: "Document BAÚL à rattacher", exact: true }).selectOption("doc-one");
  assert.equal(await documentPage.getByRole("button", { name: "Lier", exact: true }).isDisabled(), true);
  assert.equal(linkCalls, 2);
  await documentContext.close();
  console.log("✓ Documents rattachés visibles après rechargement, choix conservé après erreur, double clic bloqué et doublon désactivé");


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
