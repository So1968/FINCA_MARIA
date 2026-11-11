import assert from "node:assert/strict";
import {
  HOUSE_DEPARTURE_TASKS,
  normalizeDepartureChecks,
  changeDepartureCheck,
  countDepartureChecks
} from "../src/lib/houseDepartureChecklist.mjs";

assert.equal(HOUSE_DEPARTURE_TASKS.length, 6, "La liste de départ doit avoir six vérifications");
assert.deepEqual(normalizeDepartureChecks(null), {});
assert.deepEqual(normalizeDepartureChecks([]), {});
assert.deepEqual(normalizeDepartureChecks({ done: { linge: true, cles: false, inconnu: true } }), { linge: true });
assert.deepEqual(normalizeDepartureChecks({ version: 1, done: { dechets: true } }), { dechets: true });
assert.deepEqual(normalizeDepartureChecks({ linge: "true" }), {}, "Seuls les booléens vrais sont retenus");
const first = changeDepartureCheck({}, "linge", true);
assert.deepEqual(first, { linge: true });
assert.deepEqual(changeDepartureCheck(first, "cles", true), { linge: true, cles: true });
assert.deepEqual(changeDepartureCheck(first, "linge", false), {});
assert.deepEqual(changeDepartureCheck(first, "inconnu", true), first, "Une clef inconnue ne doit pas être ajoutée");
assert.deepEqual(first, { linge: true }, "Un changement ne doit pas modifier l'objet d'origine");
assert.equal(countDepartureChecks({ done: { linge: true, dechets: true, inconnu: true } }), 2);
console.log("FINCA MARIA : état de la checklist de départ vérifié");
