import test from "node:test";
import assert from "node:assert/strict";
import { meetingListQuery, normalizeMeetingSearch } from "../server/src/meeting-list.js";

test("recherche française et espagnole, accents et ligatures", () => {
  assert.equal(normalizeMeetingSearch("RÉUNION été · Peláez · CŒUR"), "reunion ete · pelaez · coeur");
});

test("recherche liée par paramètres, jokers littéraux et mots combinés", () => {
  const query = meetingListQuery(new URLSearchParams({ q: "été 50% a_b \\" }));
  assert.deepEqual(query.values, [["%ete%", "%50\\%%", "%a\\_b%", "%\\\\%"]]);
  const unsafe = "' OR true --";
  const injection = meetingListQuery(new URLSearchParams({ q: unsafe }));
  assert.ok(!injection.where.includes(unsafe));
  assert.ok(injection.where.includes("deleted_at IS NULL"));
});

test("filtres sur les versions validées et pagination bornée", () => {
  assert.ok(meetingListQuery(new URLSearchParams({ report: "validated" })).where.includes("EXISTS"));
  assert.ok(meetingListQuery(new URLSearchParams({ report: "pending" })).where.includes("NOT EXISTS"));
  const query = meetingListQuery(new URLSearchParams({ limit: "50", offset: "100" }));
  assert.equal(query.limit, 50);
  assert.equal(query.offset, 100);
  for (const params of [{ report: "unknown" }, { limit: "0" }, { limit: "251" }, { offset: "-1" }, { offset: "1.5" }, { q: "a".repeat(201) }]) {
    assert.throws(() => meetingListQuery(new URLSearchParams(params)), (error) => error.status === 400);
  }
});
