import assert from 'node:assert/strict';
import { test } from 'node:test';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { readBaulIndex } from '../app/lib/baul-index.mjs';

const root = path.resolve(import.meta.dirname, '..');
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
const execute = (file, args, options) => new Promise((resolve, reject) => {
  const child = spawn(file, args, options);
  let output='';
  child.stdout?.on('data', b => output+=b);
  child.stderr?.on('data', b => output+=b);
  child.on('error', reject);
  child.on('close', code => resolve({code,output}));
});

test('un index absent est distinct d’un index existant illisible', async () => {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'finca-index-test-'));
  const file=path.join(temp,'_INDEX_BAUL.json');
  try {
    assert.deepEqual(readBaulIndex(file),{version:3,documents:[]});
    for(const text of ['{truncated', 'null', '{}', '{"documents":{}}', '{"documents":[null]}']) {
      await fs.writeFile(file,text);
      assert.throws(()=>readBaulIndex(file),/Import bloqué/);
      assert.equal(await fs.readFile(file,'utf8'),text);
    }
    const valid={version:3,documents:[{id:'existing',storedName:'old.txt'}]};
    await fs.writeFile(file,JSON.stringify(valid));
    assert.deepEqual(readBaulIndex(file),valid);
  } finally { await fs.rm(temp,{recursive:true,force:true}); }
});

test('le vrai serveur refuse tout import si l’index est abîmé et préserve les originaux', async () => {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'finca-http-test-'));
  const indexFile=path.join(temp,'_INDEX_BAUL.json');
  const damaged='{"documents":[{"id":"old"';
  await fs.writeFile(indexFile,damaged);
  const legacy=path.join(temp,'01_CLASSES_VALIDES/02_COOPERATIVE_SAN_JUAN');
  await fs.mkdir(legacy,{recursive:true});
  await fs.writeFile(path.join(legacy,'old.txt'),'original');
  const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--config','vite.config.preview.js','--host','127.0.0.1','--port','5224','--strictPort'],{cwd:path.join(root,'app'),env:{...process.env,CORTIJO_BAUL_DIR:temp},stdio:['ignore','pipe','pipe']});
  let log='';
  server.stdout.on('data',b=>log+=b);
  server.stderr.on('data',b=>log+=b);
  const url='http://127.0.0.1:5224';
  try {
    let ready=false;
    for(let i=0;i<100;i++) { try { if((await fetch(url)).ok){ready=true;break;} }catch{} await wait(100); }
    assert.ok(ready,log);
    const identity=await (await fetch(url+'/api/finca/local-identity')).json();
    assert.equal(identity.application,'finca-maria');
    assert.equal(identity.checkout,await fs.realpath(path.join(root,'app')));
    const status=await fetch(url+'/api/baul/status');
    assert.equal(status.status,500);
    assert.match((await status.json()).error,/Index du BAÚL illisible/);
    const upload=()=>fetch(url+'/api/baul/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'fixture.txt',type:'text/plain',contentBase64:Buffer.from('fake document').toString('base64')})});
    const rejected=await upload();
    assert.equal(rejected.status,500);
    assert.match((await rejected.json()).error,/Import bloqué/);
    assert.equal(await fs.readFile(indexFile,'utf8'),damaged);
    assert.equal(await fs.readFile(path.join(legacy,'old.txt'),'utf8'),'original');
    assert.deepEqual(await fs.readdir(path.join(temp,'99_ORIGINAUX_PRIVES_NE_PAS_ENVOYER_GITHUB')),[]);
    await fs.writeFile(indexFile,JSON.stringify({version:3,documents:[]}));
    assert.equal((await upload()).status,200);
    const duplicate=await (await upload()).json();
    assert.equal(duplicate.duplicate,true);
    assert.equal(readBaulIndex(indexFile).documents.length,1);
  } finally {
    server.kill('SIGTERM');
    await new Promise(resolve=>server.exitCode!==null?resolve():server.once('close',resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});

test('le lanceur refuse une autre application et une autre copie de FINCA', async () => {
  const temp=await fs.mkdtemp(path.join(os.tmpdir(),'finca-launch-test-'));
  const bin=path.join(temp,'bin');await fs.mkdir(bin);
  const opened=path.join(temp,'opened');
  await fs.writeFile(path.join(bin,'xdg-open'),'#!/bin/sh\nprintf opened > "$FINCA_TEST_OPENED"\n',{mode:0o755});
  let payload='OTHER APPLICATION';
  const server=http.createServer((req,res)=>{res.writeHead(200);res.end(payload);});
  await new Promise(resolve=>server.listen(5173,'127.0.0.1',resolve));
  try {
    for(const content of ['OTHER APPLICATION',JSON.stringify({application:'finca-maria',checkout:'/another/checkout'})]) {
      payload=content;
      const result=await execute('bash',['scripts/ouvrir-cortijo-local.sh'],{cwd:root,env:{...process.env,PATH:bin+path.delimiter+process.env.PATH,FINCA_TEST_OPENED:opened,TMPDIR:temp}});
      assert.equal(result.code,1,result.output);
      assert.match(result.output,/port 5173 est occupé/);
      await assert.rejects(fs.access(opened));
    }
  } finally {
    await new Promise(resolve=>server.close(resolve));
    await fs.rm(temp,{recursive:true,force:true});
  }
});
