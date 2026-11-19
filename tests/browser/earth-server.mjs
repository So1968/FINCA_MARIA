import assert from "node:assert/strict";
import { createRequire } from "node:module";
import path from "node:path";
import { EARTH_MAINTENANCE_KEY as key } from "../../app/src/lib/earthMaintenance.mjs";
const origin = process.env.FINCA_TEST_URL;
assert.equal(process.env.FINCA_RUNTIME_TEST, "1");
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname) && process.env.FINCA_BOOTSTRAP_ADMIN_EMAIL?.endsWith("@example.test"));
const cookie = process.env.FINCA_TEST_COOKIE;
assert.ok(cookie?.startsWith("finca_session="));
const { chromium } = createRequire(path.resolve(import.meta.dirname, "../../app/package.json"))("playwright");
const browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
const contexts = [];
const season = new Date().getMonth() >= 10 ? `${new Date().getFullYear()}/${new Date().getFullYear() + 1}` : `${new Date().getFullYear() - 1}/${new Date().getFullYear()}`;
const panel = page => page.getByRole("region", { name: "Calendrier d'entretien de la terre", exact: true });
const notes = page => panel(page).locator(".task").first().getByLabel("Produits, doses, quantités ou remarques");
const engineer = page => panel(page).locator(".task").first().getByLabel("Avis ou prescription de l'ingénieur");
const record = data => data.sharedState[key]?.value.campaigns?.[season]?.["diagnostic-technique"];
const bootstrap = async () => {
  const response = await fetch(`${origin}/api/bootstrap`, { headers: { Cookie: cookie } });
  assert.equal(response.status, 200); return response.json();
};
async function eventually(operation, message) {
  for (let i = 0; i < 150; i++) { if (await operation()) return; await new Promise(resolve => setTimeout(resolve, 200)); }
  throw new Error(message);
}
async function open() {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" }); contexts.push(context);
  await context.addCookies([{ name: "finca_session", value: cookie.slice("finca_session=".length), url: origin, httpOnly: true, sameSite: "Strict", secure: new URL(origin).protocol === "https:" }]);
  const page = await context.newPage(); page.setDefaultTimeout(30000);
  await page.goto(`${origin}/?area=terre&tab=entretien`);
  await panel(page).waitFor(); await panel(page).locator(".task summary").first().click();
  try { await page.getByRole("button", { name: /État de synchronisation : Synchronisé/ }).waitFor(); }
  catch (error) {
    console.error("État du partage de test :", await page.locator(".fincaSharedSync").innerText());
    throw error;
  }
  return page;
}
try {
  const a = await open();
  await notes(a).fill("Observation partagée test"); await panel(a).getByRole("button", { name: "Enregistrer mon suivi", exact: true }).first().click();
  await eventually(async () => record(await bootstrap())?.notes === "Observation partagée test", "La clé TERRE doit être acceptée et conservée par PostgreSQL");
  const b = await open(); await eventually(async () => await notes(b).inputValue() === "Observation partagée test", "Deuxième navigateur : suivi reçu");
  const marker = await a.evaluate(() => { window.earthPageMarker = "toujours ouverte"; return window.earthPageMarker; });
  await notes(a).fill("Brouillon A test"); await engineer(b).fill("Avis B test");
  await panel(b).getByRole("button", { name: "Enregistrer mon suivi", exact: true }).first().click();
  await eventually(async () => record(await bootstrap())?.engineerNote === "Avis B test", "Avis B partagé");
  await a.evaluate(() => window.dispatchEvent(new Event("focus")));
  await eventually(async () => await engineer(a).inputValue() === "Avis B test", "Avis reçu sans rechargement");
  assert.equal(await notes(a).inputValue(), "Brouillon A test"); assert.equal(await a.evaluate(() => window.earthPageMarker), marker);
  await panel(a).getByRole("button", { name: "Enregistrer mon suivi", exact: true }).first().click();
  await eventually(async () => { const value = record(await bootstrap()); return value?.notes === "Brouillon A test" && value?.engineerNote === "Avis B test"; }, "Fusion du brouillon et de l'avis dans la base");
  const family = await fetch(`${origin}/api/family/bootstrap`, { headers: { Cookie: cookie } });
  assert.equal(family.status, 200); assert.equal(key in (await family.json()).sharedState, false, "TERRE reste exclue de l’interface familiale restreinte");
  console.log("✓ TERRE : saisie mobile → API → PostgreSQL → deuxième navigateur, brouillon conservé sans rechargement, champs rapprochés et interface familiale sans TERRE");
} finally { for (const context of contexts) await context.close(); await browser.close(); }
