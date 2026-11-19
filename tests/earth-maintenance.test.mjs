import test from "node:test";
import assert from "node:assert/strict";
import { changeEarthField, earthConflicts, hasEarthChanges, mergeEarthChanges, validEarthTracking } from "../app/src/lib/earthMaintenance.mjs";
import { earthTab, earthUrl } from "../app/src/lib/fincaNavigation.mjs";
test("les liens TERRE nettoient les anciens paramètres et reconnaissent chaque rubrique", () => {
  for (const tab of ["gestion", "entretien", "analyse", "strategie", "actions"]) {
    const url = new URL(earthUrl("https://example.test/?view=cortijo-maison&mode=vacanciers#jardin", tab));
    assert.equal(earthTab(tab), tab); assert.equal(url.searchParams.get("tab"), tab); assert.equal(url.searchParams.get("view"), null); assert.equal(url.hash, "");
  }
  assert.equal(earthTab("ancien", "autre-ancien"), "gestion");
});
test("un suivi TERRE de forme inattendue est détecté sans normalisation destructive", () => {
  for (const value of [null, [], {}, { campaigns: [] }, { campaigns: { test: null } }, { campaigns: { test: { action: "inconnue" } } }]) assert.equal(validEarthTracking(value), false);
  assert.equal(validEarthTracking({ campaigns: { "campagne ancienne": { ancien: { unknown: true } } }, extra: "conservé" }), true);
});
test("les saisies TERRE fusionnent les champs distincts et préservent les anciennes campagnes", () => {
  const before = { campaigns: { "2020/2021": { old: { note: "Ancien" } }, "2026/2027": { a: { notes: "Début", unknown: true } } }, extra: "Conservé" };
  const changes = changeEarthField(before, {}, "2026/2027", "a", "notes", "Saisie locale");
  const received = { ...before, campaigns: { ...before.campaigns, "2026/2027": { a: { ...before.campaigns["2026/2027"].a, engineerNote: "Reçu ailleurs" } } } };
  const merged = mergeEarthChanges(received, changes, true);
  assert.equal(merged.campaigns["2026/2027"].a.engineerNote, "Reçu ailleurs"); assert.equal(merged.campaigns["2026/2027"].a.notes, "Saisie locale");
  assert.deepEqual(merged.campaigns["2020/2021"], before.campaigns["2020/2021"]); assert.equal(merged.extra, "Conservé"); assert.equal(merged.campaigns["2026/2027"].a.unknown, true);
});
test("les conflits sur un même champ TERRE sont repérés et la version précédente est historisée", () => {
  const source = { campaigns: { test: { a: { notes: "Avant" } } } };
  const changes = changeEarthField(source, {}, "test", "a", "notes", "Local");
  const remote = { campaigns: { test: { a: { notes: "Distant" } } } };
  assert.equal(earthConflicts(remote, changes).length, 1);
  assert.equal(mergeEarthChanges(remote, changes, true).campaigns.test.a.history[0].before.notes, "Distant");
  assert.equal(hasEarthChanges(changeEarthField(source, changes, "test", "a", "notes", "Avant")), false);
});
