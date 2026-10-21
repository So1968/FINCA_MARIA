import test from "node:test";
import assert from "node:assert/strict";
import { createDataStore, KEYS, parseBackup, validPresenceDates } from "../src/lib/storage.js";

function storageFixture(initial = {}) {
  const values = new Map(Object.entries(initial));
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key)
  };
  return { storage, values, store: createDataStore(() => storage) };
}

test("reads existing browser data and the original plain-text navigation preference", () => {
  const { store } = storageFixture({ [KEYS.actions]: '{"san-juan-historique":{"assignedTo":"Sofía","resolution":"À rappeler"}}', [KEYS.navigation]: "maison" });
  assert.equal(store.read(KEYS.actions)["san-juan-historique"].resolution, "À rappeler");
  assert.equal(store.read(KEYS.navigation), "maison");
});

test("exports and restores all four kinds of data into a fresh browser", () => {
  const { store } = storageFixture();
  store.update(KEYS.actions, { a: { assignedTo: "Sofía", status: "En cours", dueAt: "2026-11-12", resolution: "RDV confirmé" } });
  store.update(KEYS.works, { w: { status: "Terminé", priority: "Haute", note: "Fait" } });
  store.update(KEYS.notes, { inventory: "Deux couvertures" });
  store.update(KEYS.presences, [{ id: "p1", name: "Sofía", arrival: "2026-11-12", departure: "2026-11-15", place: "Chambre 1", note: "" }]);
  const backup = parseBackup(JSON.stringify(store.backup()));
  const fresh = storageFixture();
  fresh.store.restore(backup);
  assert.deepEqual(fresh.store.backup().data, backup.data);
});

test("merges matching records field by field while keeping unrelated data", () => {
  const { store } = storageFixture();
  store.update(KEYS.actions, { a: { assignedTo: "Sofía", resolution: "Note locale" }, b: { status: "En attente" } });
  store.update(KEYS.notes, { inventory: "Inventaire", autre: "Conserver" });
  store.update(KEYS.presences, [{ id: "p1", name: "Sofía", place: "Chambre 1" }]);
  const incoming = storageFixture().store.backup();
  incoming.data.actions = { a: { status: "En cours" } };
  incoming.data.notes = { inventory: "Inventaire importé" };
  incoming.data.presences = [{ id: "p1", name: "Sofía corrigé" }, { id: "p2", name: "Ana" }];
  store.restore(incoming);
  assert.deepEqual(store.read(KEYS.actions), { a: { assignedTo: "Sofía", resolution: "Note locale", status: "En cours" }, b: { status: "En attente" } });
  assert.equal(store.read(KEYS.notes).autre, "Conserver");
  assert.equal(store.read(KEYS.presences).length, 2);
  assert.equal(store.read(KEYS.presences)[0].place, "Chambre 1");
  assert.equal(store.read(KEYS.presences)[0].name, "Sofía corrigé");
});

test("rejects malformed, foreign, future and incomplete backups before changing data", () => {
  const { store, values } = storageFixture({ [KEYS.notes]: '{"inventory":"Conserver"}' });
  const before = [...values];
  const valid = store.backup();
  for (const candidate of ["{", "null", "[]", JSON.stringify({ ...valid, app: "OTHER" }), JSON.stringify({ ...valid, version: 2 }), JSON.stringify({ ...valid, data: { ...valid.data, notes: null } }), JSON.stringify({ ...valid, data: { actions: {} } })]) {
    assert.throws(() => parseBackup(candidate));
    assert.deepEqual([...values], before);
  }
});

test("rejects prototype keys, duplicate presence identifiers and oversized files", () => {
  const valid = JSON.stringify(storageFixture().store.backup());
  assert.throws(() => parseBackup(valid.replace('"notes":{}', '"notes":{"__proto__":"bad"}')));
  const backup = JSON.parse(valid);
  backup.data.presences = [{ id: "same", name: "A" }, { id: "same", name: "B" }];
  assert.throws(() => parseBackup(JSON.stringify(backup)));
  assert.throws(() => parseBackup(" ".repeat(5 * 1024 * 1024 + 1)));
});

test("a rejected restore leaves all existing data untouched", () => {
  const { store, values } = storageFixture({ [KEYS.notes]: '{"inventory":"Conserver"}' });
  const before = [...values];
  assert.throws(() => store.restore({ app: "FINCA_MARIA", version: 1, data: { actions: {} } }));
  assert.deepEqual([...values], before);
});

test("failed writes keep the latest edits available for export", () => {
  const { store, storage } = storageFixture();
  storage.setItem = () => { throw new Error("QuotaExceededError"); };
  store.update(KEYS.notes, { inventory: "Modification non enregistrée" });
  assert.equal(store.backup().data.notes.inventory, "Modification non enregistrée");
  assert.ok(store.getIssues().some((issue) => issue.includes("modifications restent")));
});

test("blocked localStorage does not crash and edits can still be exported", () => {
  const store = createDataStore(() => { throw new Error("SecurityError"); });
  assert.deepEqual(store.read(KEYS.notes), {});
  store.update(KEYS.notes, { inventory: "À sauvegarder" });
  assert.equal(store.backup().data.notes.inventory, "À sauvegarder");
  assert.ok(store.getIssues().length > 0);
});

test("corrupt existing data is not overwritten by a new edit", () => {
  const { store, storage } = storageFixture({ [KEYS.actions]: "null" });
  assert.throws(() => store.read(KEYS.actions));
  store.update(KEYS.actions, { a: { status: "En cours" } });
  assert.equal(storage.getItem(KEYS.actions), "null");
  assert.ok(store.getIssues().length > 0);
});

test("independent tabs update the latest stored record rather than a stale snapshot", () => {
  const { store, storage } = storageFixture();
  const other = createDataStore(() => storage);
  store.read(KEYS.actions);
  other.update(KEYS.actions, { a: { status: "En cours" } });
  store.update(KEYS.actions, (current) => ({ ...current, a: { ...current.a, assignedTo: "Sofía" } }));
  assert.deepEqual(other.read(KEYS.actions), { a: { status: "En cours", assignedTo: "Sofía" } });
});

test("restoration rolls back earlier writes when storage fails midway", () => {
  const { store, storage, values } = storageFixture({ [KEYS.actions]: '{"a":{"status":"En cours"}}', [KEYS.notes]: '{"inventory":"Conserver"}' });
  const incoming = store.backup();
  incoming.data.actions.a.status = "Action accomplie";
  incoming.data.works = { w: { status: "Terminé" } };
  const before = [...values];
  const write = storage.setItem;
  let count = 0;
  storage.setItem = (key, value) => { if (++count === 2) throw new Error("quota"); write(key, value); };
  assert.throws(() => store.restore(incoming), /Import annulé/);
  assert.deepEqual([...values], before);
});

test("validates calendar dates and arrival/departure order", () => {
  assert.equal(validPresenceDates("2026-11-12", "2026-11-15"), true);
  assert.equal(validPresenceDates("2026-11-12", "2026-11-11"), false);
  assert.equal(validPresenceDates("2026-02-30", ""), false);
  assert.equal(validPresenceDates("", ""), true);
});
