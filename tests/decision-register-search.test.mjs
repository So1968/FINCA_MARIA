import assert from "node:assert/strict";
import test from "node:test";
import { searchDecisionRegister } from "../app/src/lib/decisionRegisterSearch.mjs";

const rows = [
  { id: "1", note: "Réparer le cœur du puits", responsible: "Álvaro", title: "Été", date: "2026-08-12" },
  { id: "2", note: "Clôture", responsible: null, meetingType: "Conseil familial", dueDate: "2026-12-10" }
];

test("recherche du registre : accents, ligatures et mots répartis entre plusieurs champs", () => {
  assert.deepEqual(searchDecisionRegister(rows, " ALVARO coeur ETE "), [rows[0]]);
  assert.deepEqual(searchDecisionRegister(rows, "conseil 2026-12"), [rows[1]]);
  assert.deepEqual(searchDecisionRegister(rows, "puits cloture"), []);
});

test("recherche du registre : mots littéraux, champs absents et ordre conservé", () => {
  assert.equal(searchDecisionRegister(rows, "  "), rows);
  assert.deepEqual(searchDecisionRegister(rows, "%"), []);
  assert.deepEqual(searchDecisionRegister([{ id: "3" }], "undefined"), []);
  assert.deepEqual(searchDecisionRegister(rows, "2026"), rows);
  assert.equal(rows[0].note, "Réparer le cœur du puits");
});
