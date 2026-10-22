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
  assert.equal(await handler({ method: "GET" }, {}, new URL("http://localhost/api/trash")), true);
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

test("la purge d’un document sans contrôle des sauvegardes est refusée", async () => {
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => { throw Error("Aucun accès à la base attendu"); } },
    requireFamilyUser: async () => {},
    requireAdmin: async () => actor,
    readBody: async () => ({}), json, audit: async () => {}, baulRoot: "/tmp/baul"
  });
  await handler({ method: "POST" }, {}, new URL("http://localhost/api/trash/document/doc1/purge"));
  assert.equal(output[0].status, 400);
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

test("restauration BAUL refusée si le fichier manque, sans écriture en base", async () => {
  const { output, json } = response();
  const queries = [];
  const client = {
    query: async (sql) => {
      queries.push(sql);
      if (sql.startsWith("SELECT * FROM baul_documents")) return { rowCount: 1, rows: [{ id: "missing", deleted_at: new Date(), storage_path: "pending/not-here.bin", sha256: "0".repeat(64), size_bytes: 4 }] };
      return { rowCount: 0, rows: [] };
    },
    release() {}
  };
  const handler = createTrashRouter({
    pool: { connect: async () => client },
    requireFamilyUser: async () => {},
    requireAdmin: async () => actor,
    readBody: async () => ({}), json, audit: async () => { throw Error("Audit inattendu"); }, baulRoot: "/tmp/finca-trash-test-missing"
  });
  await handler({ method: "POST" }, {}, new URL("http://localhost/api/trash/document/missing/restore"));
  assert.equal(output[0].status, 409);
  assert.equal(queries.some(sql => sql.includes("SET deleted_at=NULL")), false);
});

test("un document fictif intact peut être restauré et journalisé", async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const crypto = await import("node:crypto");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "finca-trash-"));
  const content = Buffer.from("ARCHIVE FAMILIALE FICTIVE");
  await fs.mkdir(path.join(root, "pending"));
  await fs.writeFile(path.join(root, "pending", "test.txt"), content);
  let count = 0;
  const sql = [];
  const client = {
    query: async (query) => {
      sql.push(query);
      if (query.startsWith("SELECT * FROM baul_documents")) return {
        rowCount: 1, rows: [{ id: "test", deleted_at: new Date(), deleted_by: 2,
          storage_path: "pending/test.txt", sha256: crypto.createHash("sha256").update(content).digest("hex"),
          size_bytes: content.length }]
      };
      if (query.startsWith("UPDATE baul_documents")) { count++; return { rowCount: 1, rows: [{ id:"test",deleted_at:null }] }; }
      return { rowCount: 0, rows: [] };
    }, release() {}
  };
  const { output, json } = response();
  let audited = false;
  const handler = createTrashRouter({
    pool: { connect: async () => client }, requireFamilyUser: async () => {},
    requireAdmin: async () => actor, readBody: async () => ({}), json,
    audit: async () => { audited = true; }, baulRoot: root
  });
  try {
    await handler({ method:"POST" }, {}, new URL("http://localhost/api/trash/document/test/restore"));
    assert.equal(output[0].status, 200);
    assert.equal(count, 1);
    assert.equal(audited, true);
    assert.ok(sql.includes("COMMIT"));
  } finally { await fs.rm(root, { recursive: true, force: true }); }
});

test("un document fictif altéré ne peut pas être restauré", async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const crypto = await import("node:crypto");
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "finca-trash-"));
  await fs.mkdir(path.join(root, "pending"));
  await fs.writeFile(path.join(root, "pending", "test.txt"), "VERSION MODIFIEE");
  const original = Buffer.from("VERSION ORIGINALE");
  const sql = [];
  const client = {
    query: async (query) => {
      sql.push(query);
      if (query.startsWith("SELECT * FROM baul_documents")) return {
        rowCount: 1, rows: [{ id: "test", deleted_at: new Date(), storage_path:"pending/test.txt",
          sha256: crypto.createHash("sha256").update(original).digest("hex"), size_bytes:original.length }]
      };
      return { rowCount:0, rows:[] };
    }, release() {}
  };
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { connect:async () => client }, requireFamilyUser:async () => {},
    requireAdmin:async () => actor, readBody:async () => ({}), json,
    audit:async () => {throw Error("Ne doit pas journaliser une restauration");}, baulRoot:root
  });
  try {
    await handler({ method:"POST" }, {}, new URL("http://localhost/api/trash/document/test/restore"));
    assert.equal(output[0].status, 409);
    assert.equal(sql.some(q => q.startsWith("UPDATE baul_documents")),false);
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test("une purge sans contrôle administrateur coché est refusée", async () => {
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => { throw Error("La base ne doit pas être appelée"); } },
    requireFamilyUser: async () => {},
    requireAdmin: async () => actor,
    readBody: async () => ({ confirmation: "VIDER DEFINITIVEMENT", itemId: "res1", kind: "reservation", reviewed: false }),
    json, audit: async () => {}, baulRoot: "/tmp/baul"
  });
  await handler({ method: "POST" }, {}, new URL("http://localhost/api/trash/reservation/res1/purge"));
  assert.equal(output[0].status, 400);
});

test("un membre du conseil ne peut pas lister les éléments actifs destinés à la suppression", async () => {
  const { output, json } = response();
  const handler = createTrashRouter({
    pool: { query: async () => { throw Error("Aucune consultation SQL"); } },
    requireAdmin: async () => ({ id:2, roles:["admin-secretariat"] }),
    requireFamilyUser: async () => {}, readBody: async () => ({}), json, audit: async () => {}, baulRoot:"/tmp/baul"
  });
  await handler({ method:"GET" }, {}, new URL("http://localhost/api/trash/manage"));
  assert.equal(output[0].status, 403);
});

test("mise en corbeille et audit restent dans une transaction unique", async () => {
  const { output, json } = response();
  const queries=[];
  const client = {query:async(sql)=>{
    queries.push(sql);
    if (sql.startsWith("SELECT * FROM meetings")) return {rowCount:1,rows:[{id:"m1",title:"Réunion fictive",deleted_at:null}]};
    if (sql.startsWith("UPDATE meetings")) return {rowCount:1,rows:[{id:"m1",title:"Réunion fictive",deleted_at:new Date()}]};
    return {rowCount:0,rows:[]};
  },release(){}};
  const handler=createTrashRouter({
    pool:{connect:async()=>client},requireAdmin:async()=>actor,requireFamilyUser:async()=>{},
    readBody:async()=>({}),json,
    audit:async()=>{queries.push("AUDIT");},baulRoot:"/tmp/baul"
  });
  await handler({method:"POST"},{},new URL("http://localhost/api/trash/meeting/m1/delete"));
  assert.equal(output[0].status,200);
  assert.ok(queries.indexOf("BEGIN") < queries.indexOf("AUDIT"));
  assert.ok(queries.indexOf("AUDIT") < queries.indexOf("COMMIT"));
});

test("restauration BAUL bloque un lien symbolique pointant hors du stockage", async () => {
  const fs = await import("node:fs/promises");
  const os = await import("node:os");
  const path = await import("node:path");
  const crypto = await import("node:crypto");
  const root = await fs.mkdtemp(path.join(os.tmpdir(),"finca-root-"));
  const outside = await fs.mkdtemp(path.join(os.tmpdir(),"finca-outside-"));
  const payload = Buffer.from("DOCUMENT FICTIF");
  await fs.writeFile(path.join(outside,"doc.txt"),payload);
  await fs.symlink(path.join(outside,"doc.txt"),path.join(root,"doc.txt"));
  const { output, json } = response();
  let updates = 0;
  const client = { query: async (sql) => {
    if(sql.startsWith("SELECT * FROM baul_documents")) return {rowCount:1,rows:[{
      id:"doc", deleted_at:new Date(), storage_path:"doc.txt",
      size_bytes:payload.length, sha256:crypto.createHash("sha256").update(payload).digest("hex")
    }]};
    if(sql.startsWith("UPDATE baul_documents")) updates++;
    return {rowCount:0,rows:[]};
  }, release() {} };
  const handler=createTrashRouter({
    pool:{connect:async()=>client},requireAdmin:async()=>actor,
    requireFamilyUser:async()=>{},readBody:async()=>({}),json,baulRoot:root,
    audit:async()=>{throw Error("Audit impossible");}
  });
  try {
    await handler({method:"POST"},{},new URL("http://localhost/api/trash/document/doc/restore"));
    assert.equal(output[0].status,409);
    assert.equal(updates,0);
  } finally {
    await fs.rm(root,{recursive:true,force:true});
    await fs.rm(outside,{recursive:true,force:true});
  }
});
