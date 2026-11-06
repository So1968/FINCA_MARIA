import test from "node:test";
import assert from "node:assert/strict";
import { ASSIGNMENTS_STORAGE_KEY, readAssignments, writeAssignments, actionBucket, actionFilter, actionsUrl, matchesActionFilter, summarizeActions, mergeAssignmentChanges } from "../app/src/lib/actionAssignments.mjs";

test("la lecture conserve les statuts historiques et les champs inconnus sans écrire", () => {
  const assignments = { sanjuan: { status: "Terminée", resolution: "Reçu", custom: 42 } };
  const storage = { getItem: (key) => { assert.equal(key, ASSIGNMENTS_STORAGE_KEY); return JSON.stringify(assignments); }, setItem: () => assert.fail("Écriture au chargement") };
  assert.deepEqual(readAssignments(storage), { assignments, error: false });
});

test("un stockage absent est vide, un stockage illisible reste signalé", () => {
  assert.deepEqual(readAssignments({ getItem: () => null }), { assignments: {}, error: false });
  for (const raw of ["", "invalide", "[]", "null", "42", '{"action":null}', '{"action":[]}', '{"action":"invalide"}']) {
    assert.equal(readAssignments({ getItem: () => raw }).error, true);
  }
  assert.equal(readAssignments({ getItem: () => { throw new Error("Interdit"); } }).error, true);
});

test("une écriture échouée ne peut pas annoncer une sauvegarde réussie", () => {
  assert.equal(writeAssignments({ setItem: () => { throw new Error("Quota"); } }, {}), false);
  let persisted;
  assert.equal(writeAssignments({ setItem: (key, value) => { assert.equal(key, ASSIGNMENTS_STORAGE_KEY); persisted = value; } }, { action: { status: "En cours" } }), true);
  assert.deepEqual(JSON.parse(persisted), { action: { status: "En cours" } });
});

test("les deux vues classent pareil les anciens et nouveaux statuts", () => {
  for (const status of ["Terminée", "Action accomplie"]) assert.equal(actionBucket(status), "done");
  for (const status of ["Attribuée", "En cours", "En attente"]) assert.equal(actionBucket(status), "progress");
  assert.equal(actionBucket(), "todo");
  assert.equal(actionFilter("inconnu"), "active");
});

test("aller-retour conserve le dossier, le filtre Accomplies et le sous-chemin", () => {
  for (const filter of ["active", "todo", "progress", "done", "all"]) {
    const outward = actionsUrl("https://finca.example/famille/?area=terre#ancien", { contact: "pelaez", filter, dossier: true });
    const portal = new URL(outward);
    assert.equal(portal.pathname, "/famille/");
    assert.equal(portal.searchParams.get("view"), "cortijo-memoire");
    const back = new URL(actionsUrl(outward, { contact: portal.searchParams.get("contact"), filter: portal.searchParams.get("filter") }));
    assert.equal(back.pathname, "/famille/");
    assert.equal(back.searchParams.get("area"), "terre");
    assert.equal(back.searchParams.get("tab"), "actions");
    assert.equal(back.searchParams.get("contact"), "pelaez");
    assert.equal(back.searchParams.get("filter"), filter);
    assert.equal(back.searchParams.has("view"), false);
    assert.equal(back.hash, "");
  }
});

test("les compteurs ne comptent qu’une fois une action citée dans plusieurs dossiers", () => {
  const actions = [{ id: "a" }, { id: "a" }, { id: "b" }, { id: "c" }];
  const assignments = { a: { status: "Terminée" }, b: { status: "Attribuée" } };
  assert.deepEqual(summarizeActions(actions, assignments), { active: 2, todo: 1, progress: 1, done: 1, all: 3 });
  assert.equal(matchesActionFilter("En attente", "progress"), true);
  assert.equal(matchesActionFilter("Action accomplie", "active"), false);
  assert.equal(matchesActionFilter(undefined, "todo"), true);
});

test("une modification partielle conserve les champs et les autres actions déjà enregistrés", () => {
  const saved = { a: { status: "En cours", dueAt: "2026-12-01", custom: 42 }, b: { resolution: "Reçu" } };
  const next = mergeAssignmentChanges(saved, { a: { assignedTo: "Clemencia" } });
  assert.deepEqual(next, { a: { ...saved.a, assignedTo: "Clemencia" }, b: saved.b });
  assert.equal(saved.a.assignedTo, undefined);
});
