import test from "node:test";
import assert from "node:assert/strict";
import { HOUSE_KEYS, bookingConflict, changeHouseRecord, houseRecords, houseSection, keepHouseRecovery, mergeHouseBookings, mergeEditedFields, readHouseData, removeHouseRecord, syncableHouseBooking, syncableHouseBookings, validHouseDate } from "../app/src/lib/houseData.mjs";
import { documentedHouseInventory, getInventorySummary } from "../app/src/data/cortijoHouseInventory.js";
import { houseGuideHtml, houseGuideText, publicHousePlaces } from "../app/src/lib/houseGuide.mjs";

test("les anciens liens Maison ouvrent directement une des six rubriques", () => {
  for (const [hash, expected] of [["#presences", "calendrier"], ["#preparer-chambres", "calendrier"], ["#menage", "entretien"], ["#depart-maison", "entretien"], ["#patio-jardin", "jardin"], ["#visite", "fonctionnement"], ["#reglements", "fonctionnement"], ["#sorties", "sorties"]]) assert.equal(houseSection(hash), expected);
  assert.equal(houseSection("#inconnu"), "calendrier");
});
test("les anciennes données et champs inconnus survivent à une modification ciblée", () => {
  const old = [null, { id: "ancien", name: "Test", place: "Annexe historique", legacy: { valeur: 12 } }, "entrée inconnue"];
  const changed = changeHouseRecord(old, "ancien", { name: "Corrigé" });
  assert.deepEqual(changed, [null, { ...old[1], name: "Corrigé" }, "entrée inconnue"]);
  assert.deepEqual(old[1].name, "Test");
  assert.equal(houseRecords(old).length, 1);
});
test("un stockage corrompu est signalé sans écriture ni substitution silencieuse", () => {
  let writes = 0;
  for (const raw of ["{invalid", "null", "{}"])
    assert.equal(readHouseData({ getItem: () => raw, setItem: () => { writes++; } }, "test", []).error, true);
  assert.equal(writes, 0);
  assert.deepEqual(readHouseData({ getItem: () => null }, "test", []), { value: [], error: false });
});
test("des identifiants anciens dupliqués ne font pas modifier ou annuler deux fiches à la fois", () => {
  const items = [{ id: "doublon", name: "Premier" }, { id: "doublon", name: "Second" }];
  const rows = houseRecords(items);
  assert.notEqual(rows[0]._key, rows[1]._key);
  assert.equal(changeHouseRecord(items, rows[0]._key, { name: "Modifié" })[1].name, "Second");
  assert.deepEqual(removeHouseRecord(items, rows[0]._key), [items[1]]);
});
test("modifier ou archiver un objet documentaire ne le double pas dans les totaux", () => {
  const item = documentedHouseInventory[0];
  const initial = getInventorySummary([]);
  const override = getInventorySummary([{ ...item, quantity: 0 }]);
  assert.equal(override.currentEntries, initial.currentEntries);
  assert.equal(override.current.filter((row) => row.id === item.id).length, 1);
  assert.equal(override.current.find((row) => row.id === item.id).quantity, 0);
  assert.equal(getInventorySummary([{ ...item, archivedAt: "date" }]).currentEntries, initial.currentEntries - 1);
});
test("la copie de récupération ne duplique pas un conflit et refuse de remplacer une archive illisible", () => {
  const memory = new Map();
  const storage = { getItem: (key) => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value) };
  const payload = { stateKey: HOUSE_KEYS.notes, value: { old: "note à préserver" } };
  assert.equal(keepHouseRecovery(storage, payload), true);
  assert.equal(keepHouseRecovery(storage, payload), true);
  assert.equal(JSON.parse(memory.get(HOUSE_KEYS.syncRecovery)).length, 1);
  memory.set(HOUSE_KEYS.syncRecovery, "{invalid");
  assert.equal(keepHouseRecovery(storage, payload), false);
  assert.equal(memory.get(HOUSE_KEYS.syncRecovery), "{invalid");
});
test("les nuits contiguës restent possibles, les chevauchements et dates impossibles sont repérés", () => {
  const first = { id: "a", name: "Test", place: "Chambre", arrival: "2027-01-10", departure: "2027-01-12" };
  assert.equal(bookingConflict([first], { ...first, arrival: "2027-01-12", departure: "2027-01-14" }), undefined);
  assert.equal(bookingConflict([first], { ...first, arrival: "2027-01-11", departure: "2027-01-14" })?.id, "a");
  assert.equal(bookingConflict([first], first, "a"), undefined);
  assert.equal(bookingConflict([first], { ...first, place: "Autre" }), undefined);
  assert.equal(validHouseDate("2027-02-29"), false);
  assert.equal(validHouseDate("2028-02-29"), true);
  assert.equal(syncableHouseBooking({ ...first, departure: "" }), false);
  assert.equal(syncableHouseBooking({ ...first, place: "Ancienne chambre hors liste" }), true);
  assert.equal(syncableHouseBooking({ ...first, note: "x".repeat(1001) }), false, "Ne pas envoyer au serveur une ancienne note qui serait tronquée.");
});
test("le partage conserve les anciens doublons et notes longues sans les tronquer ni les multiplier", () => {
  const valid = { id: "ancien", name: "Test", place: "Annexe", arrival: "2027-01-01", departure: "2027-01-02", note: "note" };
  const doubled = [{ ...valid, unknown: "premier" }, { ...valid, unknown: "second" }];
  assert.equal(syncableHouseBookings(doubled).length, 0);
  assert.deepEqual(mergeHouseBookings(doubled, [valid]), doubled);
  assert.deepEqual(mergeHouseBookings(mergeHouseBookings(doubled, [valid]), [valid]), doubled);
  const long = { ...valid, note: "x".repeat(1001) };
  assert.deepEqual(mergeHouseBookings([long], [{ ...valid, note: "x".repeat(1000) }]), [long]);
  const unknown = { ...valid, custom: { family: "conservé" } };
  assert.deepEqual(mergeHouseBookings([unknown], [{ ...valid, name: "Corrigé" }]), [{ ...unknown, name: "Corrigé" }]);
});
test("le guide partageable exclut notes privées, archives et protocoles dangereux et échappe le HTML", () => {
  const places = [
    { name: '<img src=x onerror="alert(1)">', status: "À conseiller", note: "Conseil public", familyNote: "SECRET_TEST_PRIVE", hidden: "SECRET_TEST_INTERNE", mapUrl: "javascript:alert(1)" },
    { name: "Refusé", status: "Ne plus conseiller" }, { name: "Archivé", status: "À conseiller", archivedAt: "date" }
  ];
  assert.equal(publicHousePlaces(places).length, 1);
  for (const result of [houseGuideText(places), houseGuideHtml(places)]) {
    assert.ok(result.includes("Conseil public"));
    for (const secret of ["SECRET_TEST_PRIVE", "SECRET_TEST_INTERNE", "javascript:", "Refusé", "Archivé"]) assert.ok(!result.includes(secret));
  }
  assert.ok(!houseGuideHtml(places).includes("<img"));
  assert.ok(houseGuideHtml(places).includes("&lt;img"));
});

test("une saisie ne remplace que ses champs modifiés et signale les modifications concurrentes", () => {
  const initial = { name: "Avant", note: "Ancienne note", quantity: 0 };
  const latest = { ...initial, note: "Note reçue", unknown: true };
  assert.deepEqual(mergeEditedFields(initial, latest, { ...initial, name: "Après" }), { patch: { name: "Après" }, conflicts: [] });
  assert.deepEqual(mergeEditedFields(initial, latest, { ...initial, note: "Ma note" }), { patch: { note: "Ma note" }, conflicts: ["note"] });
  assert.deepEqual(mergeEditedFields(initial, latest, { ...initial, note: "Note reçue" }).conflicts, []);
  assert.deepEqual(mergeEditedFields({ note: null }, {}, { note: "" }).patch, {});
  assert.deepEqual(mergeEditedFields(initial, latest, { ...initial, quantity: 1 }).patch, { quantity: 1 });
});
