import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { HOUSE_KEYS } from "../../app/src/lib/houseData.mjs";
const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const origin = process.env.BASE_URL || process.env.APP_ORIGIN;
const email = process.env.FINCA_BOOTSTRAP_ADMIN_EMAIL;
const password = process.env.FINCA_BOOTSTRAP_ADMIN_PASSWORD;
assert.equal(process.env.FINCA_HOUSE_RUNTIME_TEST, "1", "Ce test écrit uniquement dans une pile de test explicitement activée.");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
assert.ok(email?.endsWith("@example.test") && password, "Compte de test requis, aucun compte familial réel autorisé.");
const browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
const contexts = [];
const reservationName = `Séjour intégration Maison test ${Date.now()}`;
const roomName = `Chambre intégration test ${Date.now()}`;
const bootstrap = async (context) => context.pages()[0].evaluate(async () => {
  const response = await fetch("/api/bootstrap");
  if (!response.ok) throw new Error(`Lecture bootstrap : ${response.status}`);
  return response.json();
});
async function eventually(operation, message) {
  const end = Date.now() + 30000;
  while (Date.now() < end) {
    if (await operation()) return;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(message);
}
async function login() {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: "fr-FR" }); contexts.push(context);
  const response = await context.request.post(`${origin}/api/auth/login`, { headers: { Origin: origin }, data: { email, password } });
  assert.equal(response.status(), 200, "Connexion au compte de test");
  const page = await context.newPage(); page.setDefaultTimeout(15000);
  const errors = []; page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(`${origin}/?view=cortijo-maison`);
  try { await page.getByRole("button", { name: /État de synchronisation : Synchronisé/ }).waitFor(); }
  catch { throw new Error(`Maison serveur indisponible : ${new URL(page.url()).pathname}, ${errors.join(" ; ")}, ${(await page.locator("body").innerText()).slice(0, 1200)}`); }
  return { context, page };
}
try {
  const first = await login(); const a = first.page;
  const initial = await bootstrap(first.context);
  const roomState = initial.sharedState[HOUSE_KEYS.rooms];
  const roomResponse = await a.evaluate(async ({ key, value, expectedVersion }) => {
    const response = await fetch(`/api/state/${encodeURIComponent(key)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value, expectedVersion }) });
    return response.status;
  }, { key: HOUSE_KEYS.rooms, value: { ...roomState?.value, rooms: { ...roomState?.value?.rooms, [roomName]: { beds: 2 } } }, expectedVersion: roomState?.version || 0 });
  assert.equal(roomResponse, 200);
  await a.evaluate(() => dispatchEvent(new Event("focus")));
  await a.waitForFunction(({ key, room }) => JSON.parse(localStorage.getItem(key) || "{}").rooms?.[room], { key: HOUSE_KEYS.rooms, room: roomName });
  const formA = a.getByRole("form", { name: "Réservation", exact: true });
  await formA.getByLabel("Occupant", { exact: true }).fill(reservationName);
  await formA.getByLabel("Chambre", { exact: true }).selectOption(roomName);
  await formA.getByLabel("Arrivée", { exact: true }).fill("2042-11-19");
  await formA.getByLabel("Départ", { exact: true }).fill("2042-11-21");
  await formA.getByRole("button", { name: "Créer la réservation" }).click();
  await eventually(async () => (await bootstrap(first.context)).reservations.some((item) => item.name === reservationName), "La réservation n’a pas atteint PostgreSQL.");
  const original = (await bootstrap(first.context)).reservations.find((item) => item.name === reservationName);
  await a.evaluate(() => { window.houseRuntimeMarker = "brouillon conservé"; });
  await formA.getByLabel("Occupant", { exact: true }).fill("Brouillon à préserver test");
  const second = await login(); const b = second.page;
  await b.getByLabel("Toutes les dates, y compris les anciens séjours").check();
  const rowB = b.getByRole("region", { name: "Liste des séjours" }).getByRole("article").filter({ hasText: reservationName });
  await rowB.getByRole("button", { name: "Modifier", exact: true }).click();
  await b.getByRole("form", { name: "Réservation", exact: true }).getByLabel("Départ", { exact: true }).fill("2042-11-23");
  await b.getByRole("button", { name: "Enregistrer les modifications", exact: true }).click();
  await eventually(async () => (await bootstrap(second.context)).reservations.find((item) => item.id === original.id)?.departure === "2042-11-23", "La modification n’a pas atteint PostgreSQL.");
  await a.bringToFront(); await a.evaluate(() => window.dispatchEvent(new Event("focus")));
  await a.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key) || "[]").find((item) => item.id === id)?.departure === "2042-11-23", { key: HOUSE_KEYS.bookings, id: original.id });
  assert.equal(await a.evaluate(() => window.houseRuntimeMarker), "brouillon conservé");
  assert.equal(await formA.getByLabel("Occupant", { exact: true }).inputValue(), "Brouillon à préserver test");
  console.log("✓ Serveur : création et modification réelles en PostgreSQL, second navigateur synchronisé sans rechargement ni perte du formulaire en cours");
  await b.bringToFront(); b.once("dialog", (dialog) => dialog.accept());
  await rowB.getByRole("button", { name: "Annuler le séjour" }).click();
  await eventually(async () => !(await bootstrap(second.context)).reservations.some((item) => item.id === original.id), "L’annulation n’a pas atteint le serveur.");
  await eventually(async () => Boolean((await bootstrap(second.context)).sharedState[HOUSE_KEYS.bookingTrash]?.value.some((item) => item.id === original.id)), "L’historique d’annulation n’a pas été partagé.");
  await a.bringToFront(); await a.evaluate(() => window.dispatchEvent(new Event("focus")));
  await a.waitForFunction(({ key, id }) => JSON.parse(localStorage.getItem(key) || "[]").some((item) => item.booking?.id === id), { key: HOUSE_KEYS.syncRecovery, id: original.id });
  assert.equal(await formA.getByLabel("Occupant", { exact: true }).inputValue(), "Brouillon à préserver test");
  await b.bringToFront();
  await b.locator("summary").filter({ hasText: "Historique des annulations" }).click();
  await b.getByRole("article").filter({ has: b.getByRole("heading", { name: `${reservationName} — ${roomName}`, exact: true }) }).getByRole("button", { name: "Restaurer ce séjour" }).click();
  await eventually(async () => (await bootstrap(second.context)).reservations.some((item) => item.name === original.name && item.id !== original.id), "Le séjour restauré n’est pas revenu dans PostgreSQL.");
  console.log("✓ Serveur : annulation, historique partagé, copie de récupération sur l’autre appareil et restauration réelle");
  await b.getByRole("navigation", { name: "Rubriques Maison" }).getByRole("link", { name: /^Fonctionnement/ }).click();
  await b.getByLabel("Consignes — Eau", { exact: true }).fill("Consignes eau intégration serveur test");
  await eventually(async () => (await bootstrap(second.context)).sharedState[HOUSE_KEYS.notes]?.value["infra-Eau"] === "Consignes eau intégration serveur test", "Les consignes n’ont pas atteint le serveur.");
  await b.getByRole("navigation", { name: "Rubriques Maison" }).getByRole("link", { name: /^Entretien/ }).click();
  await b.locator("summary").filter({ hasText: "Checklists d’arrivée" }).click();
  await b.locator("summary").filter({ hasText: "Contrôles de départ complémentaires" }).click();
  await b.getByLabel("Clés rangées", { exact: true }).check();
  await eventually(async () => Boolean((await bootstrap(second.context)).sharedState[HOUSE_KEYS.departure]?.value.cles), "La checklist de départ n’a pas été partagée.");
  const familyData = await b.evaluate(async () => { const response = await fetch("/api/family/bootstrap"); if (!response.ok) throw new Error(`Partage familial : ${response.status}`); return response.json(); });
  assert.ok(familyData.sharedState[HOUSE_KEYS.departure]); assert.ok(familyData.sharedState[HOUSE_KEYS.bookingTrash]);
  const third = await login(); await third.page.getByRole("navigation", { name: "Rubriques Maison" }).getByRole("link", { name: /^Fonctionnement/ }).click();
  assert.equal(await third.page.getByLabel("Consignes — Eau", { exact: true }).inputValue(), "Consignes eau intégration serveur test");
  console.log("✓ Serveur : consignes et checklist de départ persistantes, clés autorisées pour le partage familial et lecture depuis un navigateur neuf");
  await b.bringToFront();
  await b.getByRole("navigation", { name: "Rubriques Maison" }).getByRole("link", { name: /^Fonctionnement/ }).click();
  await b.evaluate(async (key) => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    const local = JSON.parse(localStorage.getItem(key));
    local["infra-Eau"] = "COPIE_LOCALE_CONFLIT_TEST";
    localStorage.setItem(key, JSON.stringify(local));
    dispatchEvent(new Event("finca-maria-storage-updated"));
    const remote = await (await fetch("/api/bootstrap")).json();
    const state = remote.sharedState[key];
    const response = await fetch(`/api/state/${encodeURIComponent(key)}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ expectedVersion: state.version, value: { ...state.value, "infra-Eau": "VERSION_SERVEUR_CONFLIT_TEST" } }) });
    if (!response.ok) throw new Error(`Préparation du conflit : ${response.status}`);
    delete document.visibilityState;
    window.houseConflictMarker = true;
    dispatchEvent(new Event("focus"));
  }, HOUSE_KEYS.notes);
  await b.waitForFunction(({ key, recovery }) => JSON.parse(localStorage.getItem(key) || "{}")["infra-Eau"] === "VERSION_SERVEUR_CONFLIT_TEST"
    && JSON.parse(localStorage.getItem(recovery) || "[]").some((item) => item.stateKey === key && item.value?.["infra-Eau"] === "COPIE_LOCALE_CONFLIT_TEST"), { key: HOUSE_KEYS.notes, recovery: HOUSE_KEYS.syncRecovery });
  assert.equal(await b.evaluate(() => window.houseConflictMarker), true);
  console.log("✓ Serveur : conflit de version réel, version distante conservée et copie locale intacte sans rechargement");
  await b.evaluate((key) => { localStorage.setItem(key, "{invalid"); dispatchEvent(new Event("finca-maria-storage-updated")); dispatchEvent(new Event("focus")); }, HOUSE_KEYS.bookings);
  await b.waitForFunction(() => document.querySelector(".fincaSharedSyncButton")?.getAttribute("title") === "Hors connexion");
  assert.equal(await b.evaluate((key) => localStorage.getItem(key), HOUSE_KEYS.bookings), "{invalid");
  console.log("✓ Serveur : stockage local illisible détecté avant synchronisation et jamais remplacé par un tableau vide");

} finally {
  for (const context of contexts) await context.close();
  await browser.close();
}
