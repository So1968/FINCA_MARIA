import test from 'node:test';
import {execFileSync} from 'node:child_process';
test('récupération locale : saisie interactive masquée, confirmation, secret uniquement sur stdin et ouverture du bon port',()=>{
 execFileSync('python3',['-B','tests/python/test_account_recovery.py'],{stdio:'pipe'});
});
