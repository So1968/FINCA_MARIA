import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {mkdtemp,readFile,readdir,mkdir,writeFile,symlink,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
const root=process.cwd();const require=createRequire(path.join(root,'server/package.json'));const {Client}=require('pg');
const code=execFileSync('python3',['-c','import runpy; print(runpy.run_path("scripts/recover-finca-account.py")["NODE_CODE"])'],{encoding:'utf8'});
const name=`finca-recovery-test-${process.pid}`;const temporary=await mkdtemp(path.join(tmpdir(),'finca-recovery-test-'));let client;
const oldPassword='Old_fictitious_password_123';const newPassword='New_fictitious_password_456';
const salt='0123456789abcdef0123456789abcdef';const hash=`scrypt$${salt}$${crypto.scryptSync(oldPassword,salt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}).toString('hex')}`;
let url;
function recover(email,password=newPassword,cwd=path.join(root,'server')){
 const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd,env:{...process.env,DATABASE_URL:url},input:JSON.stringify({email,password}),encoding:'utf8'});
 assert.equal(result.stdout.includes(password),false);assert.equal(result.stderr.includes(password),false);assert.equal(result.stdout.includes(hash),false);
 return JSON.parse(result.stdout);
}
try{
 execFileSync('docker',['run','--rm','-d','--name',name,'--tmpfs','/var/lib/postgresql/data','-p','127.0.0.1::5432','-e','POSTGRES_PASSWORD=fictitious_recovery_only','postgres:16-alpine'],{stdio:'pipe'});
 const port=execFileSync('docker',['port',name,'5432/tcp'],{encoding:'utf8'}).trim().split(':').at(-1);url=`postgres://postgres:fictitious_recovery_only@127.0.0.1:${port}/postgres`;
 for(let attempt=0;attempt<100;attempt++){
  const candidate=new Client({connectionString:url,connectionTimeoutMillis:1000});
  try{await candidate.connect();client=candidate;break;}catch{await candidate.end().catch(()=>{});await new Promise((r)=>setTimeout(r,200));}
 }
 assert.ok(client,'PostgreSQL de test indisponible');
 for(const file of (await readdir('server/sql')).filter((f)=>/^\d+_.+\.sql$/.test(f)).sort())await client.query(await readFile(path.join('server/sql',file),'utf8'));
 const a=(await client.query("INSERT INTO users(email,display_name,password_hash) VALUES('a@example.test','Compte fictif A',$1) RETURNING id",[hash])).rows[0].id;
 const b=(await client.query("INSERT INTO users(email,display_name,password_hash) VALUES('b@example.test','Compte fictif B',$1) RETURNING id",[hash])).rows[0].id;
 await client.query("INSERT INTO user_roles(user_id,role_id) VALUES($1,'admin-projet'),($2,'heritier')",[a,b]);
 await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('session-a1',$1,NOW()+INTERVAL '1 day'),('session-a2',$1,NOW()+INTERVAL '1 day'),('session-b',$2,NOW()+INTERVAL '1 day')",[a,b]);
 await client.query("INSERT INTO meetings(id,title,meeting_date,report_draft) VALUES('fixture-recovery','Archive fictive','2022-01-28',$1::jsonb)",[JSON.stringify({historicOriginal:'Texte original fictif à préserver'})]);
 const roles=(await client.query('SELECT * FROM user_roles ORDER BY user_id,role_id')).rows;
 const meetings=(await client.query('SELECT * FROM meetings ORDER BY id')).rows;
 assert.equal(recover('missing@example.test').code,'ACCOUNT_NOT_FOUND');
 assert.equal(recover('a@example.test','short').code,'INVALID_INPUT');
 await client.query('UPDATE users SET active=FALSE WHERE id=$1',[b]);assert.equal(recover('b@example.test').code,'ACCOUNT_INACTIVE');
 assert.equal((await client.query('SELECT active FROM users WHERE id=$1',[b])).rows[0].active,false);await client.query('UPDATE users SET active=TRUE WHERE id=$1',[b]);
 await mkdir(path.join(temporary,'src'));await writeFile(path.join(temporary,'src/server.js'),'// Authentification non reconnue');await symlink(path.join(root,'server/node_modules'),path.join(temporary,'node_modules'));
 assert.equal(recover('a@example.test',newPassword,temporary).code,'SOURCE_UNSUPPORTED');
 assert.deepEqual(recover('a@example.test'),{ok:true});
 const encoded=(await client.query('SELECT password_hash FROM users WHERE id=$1',[a])).rows[0].password_hash;const [kind,newSalt,newHex]=encoded.split('$');assert.equal(kind,'scrypt');assert.notEqual(encoded,hash);
 assert.equal(crypto.scryptSync(newPassword,newSalt,64,{N:16384,r:8,p:1,maxmem:64*1024*1024}).toString('hex'),newHex);
 assert.equal((await client.query('SELECT password_hash FROM users WHERE id=$1',[b])).rows[0].password_hash,hash);
 assert.deepEqual((await client.query('SELECT user_id FROM sessions')).rows,[{user_id:b}]);
 assert.deepEqual((await client.query('SELECT * FROM user_roles ORDER BY user_id,role_id')).rows,roles);
 assert.deepEqual((await client.query('SELECT * FROM meetings ORDER BY id')).rows,meetings);
 assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM audit_log WHERE action='account_local_password_recovery'")).rows[0].n,1);
 // En cas d'échec d'audit, le mot de passe ET les sessions doivent être restaurés.
 await client.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES('session-a-restored',$1,NOW()+INTERVAL '1 day')",[a]);
 await client.query("CREATE FUNCTION recovery_test_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'fixture'; END; $$; CREATE TRIGGER recovery_test_failure BEFORE INSERT ON audit_log FOR EACH ROW EXECUTE FUNCTION recovery_test_failure();");
 assert.equal(recover('a@example.test','Second_fictitious_password_789').code,'DATABASE_ERROR');
 assert.equal((await client.query('SELECT password_hash FROM users WHERE id=$1',[a])).rows[0].password_hash,encoded);
 assert.equal((await client.query("SELECT COUNT(*)::int AS n FROM sessions WHERE token_hash='session-a-restored'")).rows[0].n,1);
 console.log('✓ Récupération PostgreSQL : compte ciblé uniquement, hachage compatible, sessions ciblées révoquées, rôles/archives préservés, refus des comptes inconnus/inactifs et du code incompatible, rollback après erreur, aucun secret affiché.');
}finally{if(client)await client.end().catch(()=>{});try{execFileSync('docker',['rm','-f',name],{stdio:'pipe'});}catch{}await rm(temporary,{recursive:true,force:true});}
