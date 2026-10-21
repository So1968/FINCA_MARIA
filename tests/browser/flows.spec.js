import { test, expect } from "@playwright/test";
import { readFile } from "node:fs/promises";

const keys = {
  actions: "finca_maria_action_assignments_v1",
  works: "finca_maria_travaux_v1",
  notes: "finca_maria_maison_notes_v1",
  presences: "finca_maria_maison_presences_v1"
};

async function openBackup(page) {
  await page.getByRole("heading", { name: "Mes sauvegardes", exact: true }).click();
}

test("six distinct sections, keyboard navigation and remembered selection", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  for (const name of ["Gestion", "Analyse", "Stratégie", "Actions", "Travaux", "Maison"]) {
    await page.getByRole("tab", { name, exact: true }).click();
    await expect(page.getByRole("tabpanel")).toHaveCount(1);
    await expect(page.getByRole("tabpanel")).toHaveAccessibleName(name);
  }
  await expect(page.getByRole("link", { name: "Ouvrir la Maison", exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Maison", exact: true })).toHaveAttribute("aria-selected", "true");
  await page.getByRole("tab", { name: "Maison", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect(page.getByRole("tab", { name: "Gestion", exact: true })).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("tabpanel")).toHaveAccessibleName("Analyse");
  expect(errors).toEqual([]);
});

test("legacy action assignments remain editable and survive reload", async ({ page }) => {
  await page.addInitScript(({ key }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ "san-juan-historique": { assignedTo: "Sofía", resolution: "Appeler lundi" } }));
  }, { key: keys.actions });
  await page.goto("/?view=cortijo-memoire&contact=san-juan");
  await expect(page.getByRole("combobox", { name: "Attribution", exact: true })).toHaveValue("Sofía");
  await page.getByRole("combobox", { name: "Suivi", exact: true }).selectOption("En cours");
  await page.reload();
  await page.getByRole("button", { name: "En cours", exact: false }).click();
  await expect(page.getByRole("combobox", { name: "Suivi", exact: true })).toHaveValue("En cours");
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key))["san-juan-historique"].resolution, keys.actions)).toBe("Appeler lundi");
});

test("edits in another tab appear without losing other fields", async ({ context, page }) => {
  await page.goto("/?view=cortijo-memoire&contact=san-juan");
  const other = await context.newPage();
  await other.goto("/?view=cortijo-memoire&contact=san-juan");
  await other.getByRole("button", { name: /Toutes/ }).click();
  await page.getByRole("combobox", { name: "Suivi", exact: true }).selectOption("En cours");
  await expect(other.getByRole("combobox", { name: "Suivi", exact: true })).toHaveValue("En cours");
  await other.getByRole("combobox", { name: "Attribution", exact: true }).selectOption("Sofía");
  await page.getByRole("button", { name: /Toutes/ }).click();
  await expect(page.getByRole("combobox", { name: "Attribution", exact: true })).toHaveValue("Sofía");
  await expect(page.getByRole("combobox", { name: "Suivi", exact: true })).toHaveValue("En cours");
});

test("export and previewed import transfer all data to a fresh browser", async ({ page, browser }) => {
  await page.goto("/");
  const data = {
    actions: { "san-juan-historique": { status: "En cours", resolution: "À rappeler" } },
    works: { "g-citronnier": { status: "Terminé", note: "Vérifié" } },
    notes: { inventory: "Deux couvertures" },
    presences: [{ id: "p1", name: "Sofía", arrival: "2026-11-01", departure: "2026-11-05", place: "Chambre 1", note: "" }]
  };
  await page.evaluate(({ keys, data }) => {
    for (const [name, value] of Object.entries(data)) localStorage.setItem(keys[name], JSON.stringify(value));
  }, { keys, data });
  await openBackup(page);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter ma sauvegarde" }).click();
  const content = await readFile(await (await downloaded).path());
  expect(JSON.parse(content).data).toEqual(data);

  const target = await browser.newContext();
  const next = await target.newPage();
  await next.goto("http://127.0.0.1:4174/?view=cortijo-maison");
  await next.evaluate((key) => localStorage.setItem(key, '{"autre":"Note locale à conserver"}'), keys.notes);
  await openBackup(next);
  await next.getByLabel("Fichier de sauvegarde").setInputFiles({ name: "sauvegarde.json", mimeType: "application/json", buffer: content });
  await expect(next.getByRole("heading", { name: "Sauvegarde prête à importer" })).toBeVisible();
  expect(await next.evaluate((key) => localStorage.getItem(key), keys.actions)).toBeNull();
  const safetyCopy = next.waitForEvent("download");
  await next.getByRole("button", { name: "Fusionner cette sauvegarde" }).click();
  await safetyCopy;
  await expect(next.getByRole("status")).toContainText("Sauvegarde fusionnée");
  await next.getByRole("heading", { name: "Inventaire et besoins de la maison", exact: true }).click();
  await expect(next.getByRole("textbox", { name: "Inventaire et besoins de la maison", exact: true })).toHaveValue("Deux couvertures");
  const restored = await next.evaluate((keys) => Object.fromEntries(Object.entries(keys).map(([name, key]) => [name, JSON.parse(localStorage.getItem(key))])), keys);
  expect(restored).toEqual({ ...data, notes: { ...data.notes, autre: "Note locale à conserver" } });
  await target.close();
});

test("an invalid import changes no existing data", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((key) => localStorage.setItem(key, '{"inventory":"Conserver"}'), keys.notes);
  await openBackup(page);
  await page.getByLabel("Fichier de sauvegarde").setInputFiles({ name: "invalide.json", mimeType: "application/json", buffer: Buffer.from('{"app":"OTHER"}') });
  await expect(page.getByRole("alert")).toContainText("non reconnu");
  await expect(page.getByRole("button", { name: "Fusionner cette sauvegarde" })).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), keys.notes)).toBe('{"inventory":"Conserver"}');
});

test("storage failure is visible and unsaved edits remain exportable", async ({ page }) => {
  await page.addInitScript((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, name, value);
    };
  }, keys.notes);
  await page.goto("/?view=cortijo-maison");
  await page.getByRole("heading", { name: "Inventaire et besoins de la maison", exact: true }).click();
  await page.getByRole("textbox", { name: "Inventaire et besoins de la maison", exact: true }).fill("Note à sauvegarder");
  await expect(page.getByRole("alert")).toContainText("seulement dans cette page");
  await openBackup(page);
  const downloaded = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exporter ma sauvegarde" }).click();
  const content = JSON.parse(await readFile(await (await downloaded).path(), "utf8"));
  expect(content.data.notes.inventory).toBe("Note à sauvegarder");
});

test("mobile home page fits within a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  await page.getByRole("tab", { name: "Maison", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole("link", { name: "Ouvrir la Maison", exact: true })).toBeVisible();
});

test("work notes and status survive a reload and drive the finished filter", async ({ page }) => {
  await page.goto("/?view=cortijo-travaux");
  await page.getByRole("textbox", { name: "Notes — Contrôler le citronnier après dégagement", exact: true }).fill("Contrôle effectué");
  await page.getByRole("combobox", { name: "Statut — Contrôler le citronnier après dégagement", exact: true }).selectOption("Terminé");
  await page.reload();
  await page.getByRole("button", { name: "Terminé", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Notes — Contrôler le citronnier après dégagement", exact: true })).toHaveValue("Contrôle effectué");
  await expect(page.getByRole("combobox", { name: "Statut — Contrôler le citronnier après dégagement", exact: true })).toHaveValue("Terminé");
  await expect(page.getByRole("textbox")).toHaveCount(1);
});
