import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { processTrashFileCleanup } from "../src/trash-file-cleanup.js";

test("purge physique d'un document fictif puis reprise idempotente", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "finca-gc-"));
  const file = path.join(root, "pending", "test.txt");
  await fs.mkdir(path.dirname(file));
  await fs.writeFile(file, "CONTENU FICTIF");
  let completed = false;
  const pool = {query:async(sql)=>{
    if (sql.startsWith("SELECT")) return {rows:completed?[]:[{id:1,relative_path:"pending/test.txt",file_kind:"file"}]};
    if (sql.startsWith("UPDATE trash_file_cleanup SET processed")) completed = true;
    return {rows:[]};
  }};
  try {
    const first=await processTrashFileCleanup(pool,root);
    assert.deepEqual(first,{processed:1,failed:0});
    await assert.rejects(fs.stat(file),{code:"ENOENT"});
    assert.deepEqual(await processTrashFileCleanup(pool,root),{processed:0,failed:0});
  } finally { await fs.rm(root,{recursive:true,force:true}); }
});

test("purge d'une réunion supprime son seul répertoire avec les blocs audio", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "finca-gc-"));
  const dir=path.join(root,"meetings","11111111-1111-4111-8111-111111111111");
  await fs.mkdir(path.join(dir,"chunks"),{recursive:true});
  await fs.writeFile(path.join(dir,"chunks","00000000.part"),"BLOC FICTIF");
  let completed=false;
  const pool={query:async(sql)=>{
    if(sql.startsWith("SELECT"))return {rows:completed?[]:[{id:1,relative_path:path.relative(root,dir),file_kind:"directory"}]};
    if(sql.startsWith("UPDATE trash_file_cleanup SET processed"))completed=true;
    return {rows:[]};
  }};
  try {
    assert.deepEqual(await processTrashFileCleanup(pool,root),{processed:1,failed:0});
    await assert.rejects(fs.stat(dir),{code:"ENOENT"});
  } finally {await fs.rm(root,{recursive:true,force:true});}
});

test("un chemin extérieur au stockage est bloqué et marqué en erreur", async () => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),"finca-gc-"));
  const outside=await fs.mkdtemp(path.join(os.tmpdir(),"finca-out-"));
  const file=path.join(outside,"secret.txt");
  await fs.writeFile(file,"NE PAS EFFACER");
  let failed=false;
  const pool={query:async(sql)=>{
    if(sql.startsWith("SELECT"))return {rows:[{id:1,relative_path:"../"+path.basename(outside)+"/secret.txt",file_kind:"file"}]};
    if(sql.startsWith("UPDATE trash_file_cleanup SET last_error"))failed=true;
    return {rows:[]};
  }};
  try {
    assert.deepEqual(await processTrashFileCleanup(pool,root),{processed:0,failed:1});
    assert.equal(failed,true);
    assert.equal(await fs.readFile(file,"utf8"),"NE PAS EFFACER");
  } finally {await fs.rm(root,{recursive:true,force:true});await fs.rm(outside,{recursive:true,force:true});}
});
