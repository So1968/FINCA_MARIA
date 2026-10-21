import test from "node:test";
import assert from "node:assert/strict";
import { parseHistoricReports } from "../app/src/lib/historicMeetingImport.js";

test("archives séparées, date française et date ISO", () => {
  const reports = parseHistoricReports("Conseil du 12/05/2024\nDécision : réparer le toit\n--------\nRéunion 2025-06-20\nLe conseil décide de vérifier les comptes");
  assert.equal(reports.length, 2);
  assert.equal(reports[0].date, "2024-05-12");
  assert.equal(reports[1].date, "2025-06-20");
  assert.equal(reports[0].candidates.length, 1);
  assert.equal(reports[1].candidates.length, 1);
});

test("pas de décision inventée par une simple discussion", () => {
  const reports = parseHistoricReports("Réunion du 12/05/2024\nDiscussion autour du jardin.\nUne personne propose de vendre la parcelle.");
  assert.equal(reports[0].candidates.length, 0);
});

test("saisie vide", () => {
  assert.deepEqual(parseHistoricReports(" "), []);
});
