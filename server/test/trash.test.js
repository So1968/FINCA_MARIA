import test from "node:test";
import assert from "node:assert/strict";
import { createTrashRouter } from "../src/trash.js";

function response() {
  const output = [];
  return { output, json: (_res, status, body) => output.push({ status, body }) };
}
const actor = { id: 1, roles: ["admin-projet"] };

test("la consultation des corbeilles est accessible à la famille sans donner droit à l'écriture", async () => {
  let readCalls = 0;
  let adminCalls = 0;
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => ({ rows: [] }) },
    requireFamilyUser: async () => { readCalls++; },
    requireAdmin: async () => { adminCalls++; throw new Error("Interdit"); },
    readBody: async () => ({}), json, audit: async () => {}, baulRoot: "/tmp/baul"
  });
  assert.equal(await handler({}, {}, new URL("http://localhost/api/trash")), true);
  assert.equal(output[0].status, 200);
  assert.equal(readCalls, 1);
  assert.equal(adminCalls, 0);
});

test("un rôle non administrateur ne peut restaurer ou purger", async () => {
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => { throw Error("SQL ne doit pas être interrogé"); } },
    requireFamilyUser: async () => {},
    requireAdmin: async () => ({ id: 2, roles: ["admin-secretariat"] }),
    readBody: async () => ({}), json, audit: async () => {}, baulRoot: "/tmp/baul"
  });
  await handler({ method: "POST" }, {}, new URL("http://localhost/api/trash/reservation/id/restore"));
  assert.equal(output[0].status, 403);
});

test("la purge d'un document reste bloquée même pour un administrateur", async () => {
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => { throw Error("Aucun accès à la base attendu"); } },
    requireFamilyUser: async () => {},
    requireAdmin: async () => actor,
    readBody: async () => ({}), json, audit: async () => {}, baulRoot: "/tmp/baul"
  });
  await handler({ method: "POST" }, {}, new URL("http://localhost/api/trash/document/doc1/purge"));
  assert.equal(output[0].status, 409);
});

test("la purge d'une réservation exige une confirmation correspondant à l'identifiant", async () => {
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => { throw Error("Aucun accès à la base attendu"); } },
    requireFamilyUser: async () => {},
    requireAdmin: async () => actor,
    readBody: async () => ({ confirmation: "VIDER DEFINITIVEMENT", itemId: "autre", kind: "reservation" }),
    json, audit: async () => {}, baulRoot: "/tmp/baul"
  });
  await handler({ method: "POST" }, {}, new URL("http://localhost/api/trash/reservation/id/purge"));
  assert.equal(output[0].status, 400);
});
