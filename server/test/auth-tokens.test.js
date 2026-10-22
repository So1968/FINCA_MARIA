import test from "node:test";
import assert from "node:assert/strict";
import { generateOneTimeToken, hashOneTimeToken, consumeOneTimeToken } from "../src/auth-tokens.js";

test("jetons aléatoires et empreintes distinctes", () => {
  const a = generateOneTimeToken("invite");
  const b = generateOneTimeToken("invite");
  assert.notEqual(a.secret, b.secret);
  assert.notEqual(a.hash, b.hash);
  assert.equal(a.hash, hashOneTimeToken(a.secret));
  assert.match(a.hash, /^[a-f0-9]{64}$/);
  assert.throws(() => generateOneTimeToken("unknown"));
});

test("jeton expiré ou consommé : refus", async () => {
  const queries = [];
  const client = { query: async (sql, params) => {
    queries.push({ sql, params });
    return { rowCount: 0, rows: [] };
  }};
  const result = await consumeOneTimeToken(client, {
    secret: generateOneTimeToken("password_reset").secret,
    purpose: "password_reset"
  });
  assert.equal(result, null);
  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /used_at IS NULL AND expires_at >/);
  assert.match(queries[0].sql, /FOR UPDATE/);
});

test("jeton valide : marque la consommation dans la transaction", async () => {
  const queries = [];
  const client = { query: async (sql) => {
    queries.push(sql);
    return queries.length === 1
      ? { rowCount: 1, rows: [{ id: 9, user_id: 14 }] }
      : { rowCount: 1, rows: [] };
  }};
  const result = await consumeOneTimeToken(client, {
    secret: generateOneTimeToken("invite").secret, purpose: "invite"
  });
  assert.deepEqual(result, { userId: 14 });
  assert.match(queries[1], /UPDATE auth_one_time_tokens SET used_at/);
});
