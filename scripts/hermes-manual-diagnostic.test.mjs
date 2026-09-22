import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {failureSummary,retainLatestFailure} from './lib/hermes-manual-diagnostic.mjs';
const entry=(name='git')=>({stdout:Buffer.from(`The term '${name}' is not recognized as the name of a cmdlet.`),stderr:Buffer.alloc(0),stage:'repository',exitCode:1});
function fixture(fn){
 const dir=fs.mkdtempSync(path.join(fs.realpathSync.native(os.tmpdir()),'diagnostic-test-'));
 try{fn(dir);}finally{assert.equal(fs.realpathSync.native(dir),dir);assert.ok(path.basename(dir).startsWith('diagnostic-test-'));fs.rmSync(dir,{recursive:true});}
}
test('diagnosis returns exact simple missing command, bounded counts/hash, never raw paths',()=>{
 const row=entry();const result=failureSummary(row.stdout,row.stderr);assert.equal(result.missingCommand,'git');
 assert.throws(()=>failureSummary(Buffer.alloc(131073),Buffer.alloc(0)),/diagnostic_budget/);
 const unknown=failureSummary(Buffer.from("The term 'X:\\private\\file.exe' is not recognized as the name"),Buffer.alloc(0));
 assert.equal(unknown.missingCommand,null);assert.ok(!JSON.stringify(unknown).includes('private'));
});
test('rollback can remove runtime while retaining exactly one latest private failure pair',()=>fixture(root=>{
 const runtime=path.join(root,'runtime'),diag=path.join(root,'diagnostic');fs.mkdirSync(runtime);
 const first=retainLatestFailure(diag,entry(),[runtime]);assert.equal(first.retained,true);
 assert.equal(fs.realpathSync.native(runtime),runtime);fs.rmSync(runtime,{recursive:true});
 assert.ok(fs.existsSync(path.join(diag,'failure.log')));
 retainLatestFailure(diag,entry('uv'),[runtime]);assert.deepEqual(fs.readdirSync(diag).sort(),['failure.log','receipt.json']);
 assert.equal(JSON.parse(fs.readFileSync(path.join(diag,'receipt.json'))).missingCommand,'uv');
 assert.ok(!fs.readFileSync(path.join(diag,'failure.log'),'utf8').includes("'git'"));
}));
test('detected secret deletes older owned diagnostics and never retains new bytes',()=>fixture(root=>{
 const diag=path.join(root,'diagnostic');retainLatestFailure(diag,entry(),[]);
 const row={...entry(),stdout:Buffer.from('Authorization: Bearer synthetic-secret')};
 assert.throws(()=>retainLatestFailure(diag,row,[]),/diagnostic_secret_detected/);assert.equal(fs.existsSync(diag),false);
}));
test('diagnostic location, unknown files, modified receipt/log and links fail closed',()=>fixture(root=>{
 const diag=path.join(root,'diagnostic');assert.throws(()=>retainLatestFailure(diag,entry(),[root]),/diagnostic_location/);
 retainLatestFailure(diag,entry(),[]);fs.writeFileSync(path.join(diag,'extra'),'unrelated');
 assert.throws(()=>retainLatestFailure(diag,entry(),[]),/diagnostic_store_unknown/);fs.unlinkSync(path.join(diag,'extra'));
 fs.appendFileSync(path.join(diag,'failure.log'),'changed');assert.throws(()=>retainLatestFailure(diag,entry(),[]),/diagnostic_readback/);
 fs.linkSync(path.join(diag,'failure.log'),path.join(root,'linked.log'));
 assert.throws(()=>retainLatestFailure(diag,entry(),[]),/diagnostic_store_link/);
}));
