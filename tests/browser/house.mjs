import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, rm, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { once } from "node:events";
import path from "node:path";
import { HOUSE_KEYS } from "../../app/src/lib/houseData.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(root, "app/package.json"));
const { chromium } = require("playwright");
const baul = await mkdtemp(path.join(tmpdir(), "finca-house-browser-"));
const artifacts = process.env.FINCA_HOUSE_ARTIFACTS || "/tmp/finca-maison-qa";
await mkdir(artifacts, { recursive: true });
const port = Number(process.env.FINCA_HOUSE_PORT || 5229);
const origin = `http://127.0.0.1:${port}`;
const server = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--config", "vite.config.preview.js", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: path.join(root, "app"), env: { ...process.env, CORTIJO_BAUL_DIR: baul }, stdio: ["ignore", "pipe", "pipe"] });
let logs = ""; server.stdout.on("data", (data) => { logs += data; }); server.stderr.on("data", (data) => { logs += data; });
let browser; let activePage;
const fixture = {
  [HOUSE_KEYS.bookings]: [{ id: "presence-ancienne", name: "Ancien séjour test", place: "Annexe ancienne", arrival: "2027-01-02", departure: "2027-01-04", note: "Note conservée", unknown: { family: "à préserver" } }, { id: "presence-incomplete", name: "Séjour incomplet test", place: "Couchage ancien", note: "Dates à compléter", legacy: true }],
  [HOUSE_KEYS.notes]: { inventory: "Anciennes notes inventaire test", "infra-Eau": "Anciennes consignes eau test", "visit-acces": "Ancienne visite test", unknownNote: "à conserver" },
  [HOUSE_KEYS.inventory]: [{ id: "inventaire-ancien", object: "Objet ancien test", category: "Meubles", room: "Annexe", quantity: 0, status: "À vérifier", note: "Note inventaire", unknown: "conservé" }],
  [HOUSE_KEYS.garden]: { "laurier-central": { beforePhotos: "avant-test.jpg", afterPhotos: "apres-test.jpg", observations: "Observation ancienne test", unknown: "conservé" }, "autre-arbre": { observations: "autre fiche conservée" } },
  [HOUSE_KEYS.places]: [{ id: "lieu-ancien", name: "Lieu ancien test", zone: "Zone test", category: "Nature", duration: "2 h", status: "À conseiller", note: "Conseil public test", familyNote: "SECRET_FAMILLE_GUIDE_TEST", unknown: "conservé" }, { id: "lieu-refuse", name: "Lieu non recommandé test", status: "Ne plus conseiller" }],
  [HOUSE_KEYS.maintenance]: [{ id: "travail-ancien", title: "Travail ancien test", date: "2026-09-01", priority: "P2", status: "À faire", assignedTo: "Responsable ancien test", note: "Détail ancien", unknown: "conservé" }],
  [HOUSE_KEYS.checklist]: { stayLabel: "Séjour ancien test", checked: { "0-0": true, unknownCheck: true }, unknown: "conservé" },
  [HOUSE_KEYS.departure]: { done: { cles: true, ancienControle: true }, unknown: "conservé" },
  [HOUSE_KEYS.rooms]: { rooms: { "La Hera": { beds: 2, bedTypes: "Lit double test", note: "Note chambre test", unknown: true }, "Annexe ancienne": { beds: 1 } }, unknown: true },
  [HOUSE_KEYS.ready]: { "La Hera": true, "Ancienne chambre": true },
  [HOUSE_KEYS.bookingTrash]: [],
  cortijo_action_assignments_v1: { test: { status: "En cours", note: "TERRE à préserver" } },
  finca_maria_meetings_local_v1: [{ id: "reunion-sentinelle", text: "RÉUNIONS à préserver" }]
};
async function seed(context, values = fixture) {
  await context.addInitScript((values) => {
    for (const [key, value] of Object.entries(values)) if (localStorage.getItem(key) === null) localStorage.setItem(key, JSON.stringify(value));
  }, values);
}
const stored = (page, key) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)), key);
async function go(page, section) {
  await page.getByRole("navigation", { name: "Rubriques Maison" }).getByRole("link", { name: new RegExp(`^${section}`) }).click();
}
const panel = (page, name) => page.getByRole("region", { name, exact: true });
async function noOverflow(page, step) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `Débordement : ${step}`);
}
async function verifyDraftProtection(width) {
  const failures = [];
  const draftFixture = {
    ...fixture,
    [HOUSE_KEYS.bookings]: [
      { id: "draft-booking-a", name: "Séjour A test", place: "La Hera", arrival: "2027-01-02", departure: "2027-01-04" },
      { id: "draft-booking-b", name: "Séjour B test", place: "La Golondrina", arrival: "2027-01-05", departure: "2027-01-07" }
    ],
    [HOUSE_KEYS.inventory]: [{ id: "draft-item-a", object: "Objet A test", category: "Meubles", quantity: 1 }, { id: "draft-item-b", object: "Objet B test", category: "Meubles", quantity: 2 }],
    [HOUSE_KEYS.maintenance]: [{ id: "draft-work-a", title: "Travail A test", status: "À faire", priority: "P2" }, { id: "draft-work-b", title: "Travail B test", status: "À faire", priority: "P2" }],
    [HOUSE_KEYS.garden]: { "laurier-central": { interventions: [{ id: "draft-garden-a", work: "Intervention A test", date: "2027-01-10" }, { id: "draft-garden-b", work: "Intervention B test", date: "2027-01-12" }] } },
    [HOUSE_KEYS.places]: [{ id: "draft-place-a", name: "Lieu A test", status: "À conseiller" }, { id: "draft-place-b", name: "Lieu B test", status: "À conseiller" }]
  };
  const cases = [
    { section: "Calendrier et réservations", form: "Réservation", field: "Occupant", a: "Séjour A test", b: "Séjour B test", key: HOUSE_KEYS.bookings, property: "name", submit: "Enregistrer les modifications" },
    { section: "Inventaire", form: "Fiche inventaire", field: "Objet", a: "Objet A test", b: "Objet B test", summary: "Ajouter un objet ou modifier une fiche", key: HOUSE_KEYS.inventory, property: "object", submit: "Enregistrer l’objet" },
    { section: "Entretien", form: "Travail ou réparation", field: "Travail / réparation", a: "Travail A test", b: "Travail B test", summary: "Ajouter un travail ou une réparation", key: HOUSE_KEYS.maintenance, property: "title", submit: "Enregistrer le travail" },
    { section: "Jardin", form: "Intervention jardin", field: "Intervention", a: "Intervention A test", b: "Intervention B test", key: HOUSE_KEYS.garden, property: "work", submit: "Enregistrer l’intervention" },
    { section: "Sorties", form: "Fiche sortie", field: "Lieu", a: "Lieu A test", b: "Lieu B test", summary: "Ajouter un lieu ou modifier une fiche", key: HOUSE_KEYS.places, property: "name", submit: "Enregistrer le lieu" }
  ];
  for (const item of cases) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "fr-FR" });
    await seed(context, draftFixture);
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(10000);
    const dialogs = []; let accept = false; let decision = Promise.resolve();
    page.on("dialog", dialog => { dialogs.push({ type: dialog.type(), message: dialog.message() }); decision = accept ? dialog.accept() : dialog.dismiss(); });
    const edit = name => item.section === "Jardin"
      ? page.getByRole("button", { name: `Modifier l’intervention — ${name}`, exact: true })
      : panel(page, item.section).getByRole("article").filter({ has: page.getByRole("heading", { name, exact: true }) }).getByRole("button", { name: "Modifier", exact: true });
    try {
      await page.goto(`${origin}/?view=cortijo-maison`); await go(page, item.section);
      if (item.section === "Calendrier et réservations") await page.getByLabel("Toutes les dates, y compris les anciens séjours").check();
      if (item.summary) await panel(page, item.section).locator("summary").filter({ hasText: item.summary }).click();
      const form = page.getByRole("form", { name: item.form, exact: true });
      const field = form.getByLabel(item.field, { exact: true });
      const before = await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.values(HOUSE_KEYS));
      await field.fill(`Brouillon ${item.section} test`);
      await edit(item.a).click();
      assert.equal(await field.inputValue(), `Brouillon ${item.section} test`, "Refuser le remplacement doit conserver le brouillon.");
      assert.equal(dialogs.at(-1)?.type, "confirm");
      if (item.section === "Calendrier et réservations") {
        await page.locator(".houseDayPick").first().click();
        assert.equal(await field.inputValue(), `Brouillon ${item.section} test`, "Un jour du calendrier ne doit pas vider la saisie.");
      }
      accept = true; await edit(item.a).click(); accept = false;
      assert.equal(await field.inputValue(), item.a);
      await field.fill(`Modification A ${width} test`);
      await go(page, item.section === "Sorties" ? "Inventaire" : "Sorties"); await go(page, item.section);
      const sameCount = dialogs.length;
      await edit(item.a).click();
      assert.equal(await field.inputValue(), `Modification A ${width} test`, "Rouvrir la même fiche doit garder la saisie.");
      assert.equal(dialogs.length, sameCount, "Aucune demande de remplacement pour la même fiche.");
      await edit(item.b).click();
      assert.equal(await field.inputValue(), `Modification A ${width} test`);
      accept = true; await edit(item.b).click(); accept = false;
      assert.equal(await field.inputValue(), item.b);
      const edited = `Modification B ${item.section} ${width} test`;
      await field.fill(edited);
      const leaving = page.waitForEvent("dialog", { predicate: dialog => dialog.type() === "beforeunload" });
      await page.close({ runBeforeUnload: true }); await leaving; await decision;
      assert.equal(page.isClosed(), false); assert.equal(await field.inputValue(), edited);
      assert.deepEqual(await page.evaluate(keys => Object.fromEntries(keys.map(key => [key, localStorage.getItem(key)])), Object.values(HOUSE_KEYS)), before, "Aucune écriture avant enregistrement explicite.");
      await form.getByRole("button", { name: item.submit, exact: true }).click();
      const saved = await stored(page, item.key);
      const records = item.section === "Jardin" ? saved["laurier-central"].interventions : saved;
      assert.ok(records.some(record => record[item.property] === edited));
      const cleanCount = dialogs.length;
      await edit(item.a).click();
      assert.equal(dialogs.length, cleanCount, "Aucune confirmation après sauvegarde réussie.");
      const closed = page.waitForEvent("close"); await page.close({ runBeforeUnload: true }); await closed;
      assert.equal(dialogs.length, cleanCount, "Un formulaire intact ne doit pas empêcher la fermeture.");
      console.log(`✓ ${width}px : brouillons ${item.section}, refus/acceptation, même fiche, retour de rubrique, fermeture protégée et sauvegarde`);
    } catch (error) {
      failures.push(item.section); console.error(`✗ Brouillon ${item.section} ${width}px : ${error.stack}`);
    } finally { await context.close(); }
  }
  assert.deepEqual(failures, [], "Les cinq formulaires doivent protéger les saisies en cours.");
}
try {
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${origin}/api/finca/local-identity`); if ((await r.json()).checkout === path.join(root, "app")) break; } catch {}
    if (server.exitCode !== null) throw new Error(logs);
    if (i === 99) throw new Error(`Serveur indisponible : ${logs}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  browser = await chromium.launch({ headless: true, ...(process.env.FINCA_CHROMIUM_PATH ? { executablePath: process.env.FINCA_CHROMIUM_PATH } : {}) });
  for (const width of [1280, 390]) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, locale: "fr-FR", acceptDownloads: true, permissions: ["clipboard-read", "clipboard-write"] });
    await seed(context);
    const page = await context.newPage(); activePage = page; page.setDefaultTimeout(10000);
    const errors = []; page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(origin);
    await page.locator(".fincaAreaChoice--maison").click();
    await page.waitForURL(/view=cortijo-maison/);
    await panel(page, "Calendrier mensuel").waitFor();
    assert.equal(await page.getByRole("navigation", { name: "Rubriques Maison" }).getByRole("link").count(), 6);
    await noOverflow(page, `calendrier initial ${width}`);
    for (const name of ["Inventaire", "Entretien", "Jardin", "Fonctionnement", "Sorties", "Calendrier et réservations"]) {
      await go(page, name); await panel(page, name).getByRole("heading", { name, exact: true }).waitFor(); await noOverflow(page, `${name} ${width}`);
    }
    for (const [key, value] of Object.entries(fixture)) assert.deepEqual(await stored(page, key), value, `Aucune réécriture à l’ouverture : ${key}`);
    console.log(`✓ ${width}px : accueil → Maison en un clic, six rubriques, absence de débordement, données anciennes inchangées à l’ouverture`);
    const reservations = panel(page, "Calendrier et réservations");
    const originalMonth = await reservations.locator(".houseMonth h3").textContent();
    await reservations.getByRole("button", { name: "Mois suivant", exact: true }).click();
    assert.notEqual(await reservations.locator(".houseMonth h3").textContent(), originalMonth);
    await reservations.getByRole("button", { name: "Mois précédent", exact: true }).click();
    assert.equal(await reservations.locator(".houseMonth h3").textContent(), originalMonth);
    await reservations.getByRole("button", { name: "Aujourd’hui", exact: true }).click();
    const bookingForm = reservations.getByRole("form", { name: "Réservation", exact: true });
    await bookingForm.getByLabel("Occupant", { exact: true }).fill("Occupant test");
    await bookingForm.getByLabel("Chambre", { exact: true }).selectOption("La Hera");
    await bookingForm.getByLabel("Arrivée", { exact: true }).fill("2027-01-10");
    await bookingForm.getByLabel("Départ", { exact: true }).fill("2027-01-12");
    await bookingForm.getByLabel("Remarque", { exact: true }).fill("Remarque séjour test");
    await bookingForm.getByRole("button", { name: "Créer la réservation" }).click();
    const created = (await stored(page, HOUSE_KEYS.bookings)).find((item) => item.name === "Occupant test"); assert.ok(created?.id);
    await bookingForm.getByLabel("Occupant", { exact: true }).fill("Conflit test");
    await bookingForm.getByLabel("Arrivée", { exact: true }).fill("2027-01-11");
    await bookingForm.getByLabel("Départ", { exact: true }).fill("2027-01-13");
    await bookingForm.getByRole("button", { name: "Créer la réservation" }).click();
    await reservations.getByRole("status").filter({ hasText: "Conflit" }).waitFor();
    assert.equal((await stored(page, HOUSE_KEYS.bookings)).length, 3);
    const stays = panel(page, "Liste des séjours");
    page.once("dialog", dialog => dialog.accept());
    await stays.getByRole("article").filter({ hasText: "Occupant test" }).getByRole("button", { name: "Modifier", exact: true }).click();
    await bookingForm.getByLabel("Occupant", { exact: true }).fill("Occupant corrigé test");
    await bookingForm.getByLabel("Départ", { exact: true }).fill("2027-01-14");
    await bookingForm.getByRole("button", { name: "Enregistrer les modifications" }).click();
    assert.equal((await stored(page, HOUSE_KEYS.bookings)).find((item) => item.id === created.id).departure, "2027-01-14");
    page.once("dialog", (dialog) => dialog.accept());
    await stays.getByRole("article").filter({ hasText: "Occupant corrigé test" }).getByRole("button", { name: "Annuler le séjour" }).click();
    assert.equal((await stored(page, HOUSE_KEYS.bookings)).length, 2);
    assert.equal((await stored(page, HOUSE_KEYS.bookingTrash))[0].id, created.id);
    await reservations.locator("summary").filter({ hasText: "Historique des annulations" }).click();
    await reservations.getByRole("button", { name: "Restaurer ce séjour" }).click();
    assert.ok((await stored(page, HOUSE_KEYS.bookings)).some((item) => item.restoredFrom === created.id));
    assert.equal((await stored(page, HOUSE_KEYS.bookingTrash)).length, 1);
    await reservations.locator("summary").filter({ hasText: "Chambres, couchages" }).click();
    const room = reservations.getByRole("article").filter({ has: page.getByRole("heading", { name: "La Hera", exact: true }) }).last();
    await room.getByLabel("Couchages", { exact: true }).fill("3");
    assert.equal((await stored(page, HOUSE_KEYS.rooms)).rooms["La Hera"].unknown, true);
    await page.reload(); await panel(page, "Calendrier mensuel").waitFor();
    assert.equal((await stored(page, HOUSE_KEYS.bookings))[0].unknown.family, "à préserver");
    console.log(`✓ ${width}px : réservation, conflit, modification, annulation conservée, restauration, couchages et rechargement`);

    await go(page, "Inventaire"); const inventory = panel(page, "Inventaire");
    await inventory.locator("summary").filter({ hasText: "Ajouter un objet ou modifier une fiche" }).click();
    const inventoryForm = inventory.getByRole("form", { name: "Fiche inventaire" });
    await inventoryForm.getByLabel("Objet", { exact: true }).fill("Objet ajouté test");
    await inventoryForm.getByLabel("Quantité", { exact: true }).fill("0");
    await inventoryForm.getByRole("button", { name: "Enregistrer l’objet" }).click();
    const objectCard = inventory.getByRole("article").filter({ has: page.getByRole("heading", { name: "Objet ajouté test", exact: true }) });
    await objectCard.getByRole("button", { name: "Modifier", exact: true }).click();
    await inventoryForm.getByLabel("Quantité", { exact: true }).fill("11");
    await inventoryForm.getByLabel("Note", { exact: true }).fill("Besoin enregistré test");
    await inventoryForm.getByRole("button", { name: "Enregistrer l’objet" }).click();
    assert.equal((await stored(page, HOUSE_KEYS.inventory)).find((item) => item.object === "Objet ajouté test").quantity, 11);
    await inventory.getByLabel("Filtrer les catégories").selectOption("Meubles");
    await inventory.getByLabel("Filtrer les besoins").selectOption("Présent");
    page.once("dialog", (dialog) => dialog.accept()); await objectCard.getByRole("button", { name: "Archiver l’objet" }).click();
    await inventory.getByLabel("Afficher les objets archivés").check(); await objectCard.getByRole("button", { name: "Restaurer l’objet" }).click();
    await inventory.getByLabel("Afficher les objets archivés").uncheck();
    await inventory.getByLabel("Rechercher dans l’inventaire").fill("Objet ajouté test"); assert.equal(await objectCard.count(), 1);
    assert.equal((await stored(page, HOUSE_KEYS.inventory))[0].unknown, "conservé");

    await go(page, "Entretien"); const maintenance = panel(page, "Entretien"); const workForm = maintenance.getByRole("form", { name: "Travail ou réparation" });
    await maintenance.locator("summary").filter({ hasText: "Checklists d’arrivée" }).click();
    await maintenance.getByLabel("Préparer les couchages nécessaires", { exact: true }).check();
    await maintenance.locator("summary").filter({ hasText: "Ajouter un travail ou une réparation" }).click();
    assert.equal((await stored(page, HOUSE_KEYS.checklist)).checked.unknownCheck, true);
    await workForm.getByLabel("Travail / réparation", { exact: true }).fill("Réparation ajoutée test");
    await workForm.getByLabel("Responsable", { exact: true }).fill("Responsable test");
    await workForm.getByLabel("Échéance", { exact: true }).fill("2027-01-20");
    await workForm.getByRole("button", { name: "Enregistrer le travail" }).click();
    const workCard = maintenance.getByRole("article").filter({ has: page.getByRole("heading", { name: "Réparation ajoutée test", exact: true }) });
    await workCard.getByRole("button", { name: "Marquer fait" }).click();
    await maintenance.getByLabel("Filtrer les travaux").selectOption("Faits"); await workCard.waitFor();
    assert.equal((await stored(page, HOUSE_KEYS.maintenance)).find((item) => item.title === "Réparation ajoutée test").status, "Fait");
    assert.equal((await stored(page, HOUSE_KEYS.maintenance)).find((item) => item.id === "travail-ancien").unknown, "conservé");
    page.once("dialog", (dialog) => dialog.accept());
    await workCard.getByRole("button", { name: "Archiver le travail" }).click();
    await maintenance.getByLabel("Filtrer les travaux").selectOption("Archivés");
    await workCard.getByRole("button", { name: "Restaurer le travail" }).click();
    await maintenance.getByLabel("Filtrer les travaux").selectOption("Faits");
    await workCard.getByRole("button", { name: "Rouvrir le travail" }).click();
    await maintenance.getByLabel("Filtrer les travaux").selectOption("Ouverts");
    await workCard.waitFor();
    console.log(`✓ ${width}px : inventaire (création, quantité zéro, modification, archive/restauration, recherche), ménage, responsable, échéance et suivi des travaux`);

    await go(page, "Jardin"); const garden = panel(page, "Jardin"); const laurier = garden.getByRole("article", { name: "Suivi Laurier central" });
    await laurier.getByLabel("Observations", { exact: true }).fill("Observation nouvelle test");
    await laurier.getByLabel("Prochaine vérification", { exact: true }).fill("2027-01-25");
    const gardenForm = garden.getByRole("form", { name: "Intervention jardin" });
    await gardenForm.getByLabel("Intervention", { exact: true }).fill("Contrôle jardin test");
    await gardenForm.getByLabel("Date prévue", { exact: true }).fill("2027-01-22");
    await gardenForm.getByRole("button", { name: "Planifier l’intervention" }).click();
    await garden.getByRole("button", { name: "Modifier l’intervention — Contrôle jardin test" }).click();
    await gardenForm.getByLabel("Date prévue", { exact: true }).fill("2027-01-23");
    await gardenForm.getByRole("button", { name: "Enregistrer l’intervention" }).click();
    await garden.getByRole("button", { name: "Marquer réalisée — Contrôle jardin test" }).click();
    for (const tree of ["Cerisier", "Citronnier"]) await garden.getByRole("article", { name: `Suivi ${tree}`, exact: true }).getByLabel("Observations", { exact: true }).fill(`Observation ${tree} test`);
    await laurier.getByLabel("Ajouter une photo").setInputFiles({ name: "photo-test.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==", "base64") });
    await laurier.getByRole("img").waitFor();
    assert.ok(await laurier.getByRole("img").evaluate((img) => img.complete && img.naturalWidth > 0));
    await garden.getByLabel("Filtrer le mois du jardin").fill("2027-01");
    await garden.getByRole("button", { name: "Tous les mois du jardin" }).click();
    await laurier.getByRole("button", { name: "Consigner un point dans l’historique" }).click();
    assert.equal((await stored(page, HOUSE_KEYS.garden))["laurier-central"].beforePhotos, "avant-test.jpg");
    assert.equal((await stored(page, HOUSE_KEYS.garden))["autre-arbre"].observations, "autre fiche conservée");
    await go(page, "Fonctionnement"); const functioning = panel(page, "Fonctionnement");
    await functioning.getByLabel("Consignes — Eau", { exact: true }).fill("Consignes eau modifiées test");
    assert.equal((await stored(page, HOUSE_KEYS.notes)).unknownNote, "à conserver");
    console.log(`✓ ${width}px : jardin (observations, calendrier, intervention réalisée, photo et historique) et consignes conservées`);

    await go(page, "Sorties"); const outings = panel(page, "Sorties"); const placeForm = outings.getByRole("form", { name: "Fiche sortie" });
    await outings.locator("summary").filter({ hasText: "Ajouter un lieu ou modifier une fiche" }).click();
    await placeForm.getByLabel("Lieu", { exact: true }).fill("Lieu ajouté test");
    await placeForm.getByLabel("Notre avis", { exact: true }).selectOption("À conseiller");
    await placeForm.getByLabel("Description pour le guide").fill("Description publique ajoutée test");
    await placeForm.getByLabel("Note privée familiale").fill("SECRET_AJOUTE_GUIDE_TEST");
    await placeForm.getByLabel("Lien carte", { exact: true }).fill("https://example.test/sortie");
    await placeForm.getByRole("button", { name: "Enregistrer le lieu" }).click();
    await outings.getByRole("button", { name: "Copier le guide", exact: true }).click();
    const clipboard = await page.evaluate(() => navigator.clipboard.readText());
    assert.ok(clipboard.includes("Description publique ajoutée test")); assert.ok(!clipboard.includes("SECRET_")); assert.ok(!clipboard.includes("Lieu non recommandé test"));
    await page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: async (payload) => { window.houseShared = payload; } }));
    await outings.getByRole("button", { name: "Partager le guide", exact: true }).click();
    assert.ok(!(await page.evaluate(() => window.houseShared.text)).includes("SECRET_"));
    const addedPlace = outings.getByRole("article").filter({ has: page.getByRole("heading", { name: "Lieu ajouté test", exact: true }) });
    await addedPlace.getByRole("button", { name: "Modifier", exact: true }).click();
    await placeForm.getByLabel("Durée", { exact: true }).fill("Demi-journée test");
    await placeForm.getByRole("button", { name: "Enregistrer le lieu" }).click();
    await outings.getByLabel("Filtrer les avis").selectOption("À conseiller");
    await outings.getByLabel("Rechercher une sortie").fill("Lieu ajouté test");
    await addedPlace.waitFor();
    page.once("dialog", (dialog) => dialog.accept()); await addedPlace.getByRole("button", { name: "Archiver le lieu" }).click();
    await outings.getByLabel("Afficher les lieux archivés").check(); await addedPlace.getByRole("button", { name: "Restaurer le lieu" }).click();
    await outings.getByLabel("Afficher les lieux archivés").uncheck();
    const downloaded = page.waitForEvent("download"); await outings.getByRole("button", { name: "Télécharger le guide partageable" }).click();
    const download = await downloaded; const downloadPath = await download.path(); const html = await readFile(downloadPath, "utf8");
    assert.ok(html.includes("Description publique ajoutée test")); assert.ok(!html.includes("SECRET_"));
    const beforeGuide = await page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])), Object.values(HOUSE_KEYS));
    await outings.getByRole("link", { name: "Aperçu du guide vacanciers" }).click();
    await page.getByRole("heading", { name: "Guide vacanciers — les sorties" }).waitFor();
    await page.evaluate(() => { window.print = () => { window.housePrinted = true; }; });
    await page.getByRole("button", { name: "Imprimer le guide" }).click();
    assert.equal(await page.evaluate(() => window.housePrinted), true);
    assert.equal(await page.getByRole("textbox").count(), 0); assert.ok(!(await page.locator("body").innerText()).includes("SECRET_"));
    assert.deepEqual(await page.evaluate((keys) => Object.fromEntries(keys.map((key) => [key, localStorage.getItem(key)])), Object.values(HOUSE_KEYS)), beforeGuide);
    await page.getByRole("link", { name: "Maison · Sorties" }).click();
    await panel(page, "Sorties").waitFor();
    await page.screenshot({ path: path.join(artifacts, `maison-sorties-${width}.png`), fullPage: true });
    for (const [hash, section] of [["presences", "Calendrier et réservations"], ["preparer-chambres", "Calendrier et réservations"], ["menage", "Entretien"], ["depart-maison", "Entretien"], ["patio-jardin", "Jardin"], ["visite", "Fonctionnement"], ["reglements", "Fonctionnement"]]) {
      await page.goto(`${origin}/?view=cortijo-maison#${hash}`); await panel(page, section).getByRole("heading", { name: section, exact: true }).waitFor(); await noOverflow(page, `${hash} ${width}`);
    }
    assert.deepEqual(await stored(page, "cortijo_action_assignments_v1"), fixture.cortijo_action_assignments_v1);
    assert.deepEqual(await stored(page, "finca_maria_meetings_local_v1"), fixture.finca_maria_meetings_local_v1);
    assert.deepEqual(errors, []);
    console.log(`✓ ${width}px : carnet, copie et fichier du guide sans notes privées, aperçu sans écriture, anciens liens et sentinelles TERRE/RÉUNIONS préservés`);
    await context.close();
  }
  for (const width of [1280, 390]) await verifyDraftProtection(width);
  const corrupt = await browser.newContext(); await seed(corrupt); const broken = await corrupt.newPage(); activePage = broken;
  await broken.goto(`${origin}/?view=cortijo-maison`);
  await broken.evaluate((key) => { localStorage.setItem(key, "{invalid"); dispatchEvent(new Event("finca-maria-storage-updated")); }, HOUSE_KEYS.bookings);
  await broken.getByRole("alert").filter({ hasText: "Lecture impossible" }).waitFor();
  assert.equal(await broken.getByRole("form", { name: "Réservation", exact: true }).getByLabel("Occupant", { exact: true }).isDisabled(), true);
  await broken.reload(); await broken.getByRole("alert").filter({ hasText: "Lecture impossible" }).waitFor();
  assert.equal(await broken.evaluate((key) => localStorage.getItem(key), HOUSE_KEYS.bookings), "{invalid"); await corrupt.close();
  console.log("✓ Stockage de réservations illisible : conservé à l’identique et modifications bloquées après rechargement");

  const quota = await browser.newContext(); await seed(quota); const unsaved = await quota.newPage(); activePage = unsaved;
  await unsaved.addInitScript((key) => { const original = Storage.prototype.setItem; window.restoreHouseStorage = () => { Storage.prototype.setItem = original; }; Storage.prototype.setItem = function (name, value) { if (name === key) throw new DOMException("Quota", "QuotaExceededError"); return original.call(this, name, value); }; }, HOUSE_KEYS.notes);
  await unsaved.goto(`${origin}/?view=cortijo-maison#fonctionnement`);
  await unsaved.getByLabel("Consignes — Eau", { exact: true }).fill("Note non enregistrée test");
  await unsaved.getByRole("alert").filter({ hasText: "Modifications non enregistrées" }).waitFor();
  assert.equal((await stored(unsaved, HOUSE_KEYS.notes))["infra-Eau"], fixture[HOUSE_KEYS.notes]["infra-Eau"]);
  await go(unsaved, "Inventaire"); await go(unsaved, "Fonctionnement");
  assert.equal(await unsaved.getByLabel("Consignes — Eau", { exact: true }).inputValue(), "Note non enregistrée test");
  const parallel = await quota.newPage();
  await parallel.goto(`${origin}/?view=cortijo-maison#fonctionnement`);
  await parallel.getByLabel("Consignes — Électricité", { exact: true }).fill("Électricité reçue de l’autre onglet test");
  await unsaved.waitForFunction((key) => JSON.parse(localStorage.getItem(key) || "{}")["infra-Électricité"] === "Électricité reçue de l’autre onglet test", HOUSE_KEYS.notes);
  assert.equal(await unsaved.getByLabel("Consignes — Eau", { exact: true }).inputValue(), "Note non enregistrée test");
  await unsaved.evaluate(() => window.restoreHouseStorage());
  await unsaved.getByRole("button", { name: "Réessayer la sauvegarde" }).click();
  await unsaved.reload(); assert.equal(await unsaved.getByLabel("Consignes — Eau", { exact: true }).inputValue(), "Note non enregistrée test");
  assert.equal((await stored(unsaved, HOUSE_KEYS.notes))["infra-Électricité"], "Électricité reçue de l’autre onglet test");
  await quota.close();
  console.log("✓ Quota dépassé : erreur visible, brouillon conservé entre rubriques, nouvelle tentative et persistance après rechargement");
} catch (error) {
  if (activePage && !activePage.isClosed()) { await activePage.screenshot({ path: path.join(artifacts, "echec-maison.png"), fullPage: true }).catch(() => {}); }
  throw error;
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) { const closed = once(server, "close"); server.kill("SIGTERM"); await closed; }
  await rm(baul, { recursive: true, force: true });
}
