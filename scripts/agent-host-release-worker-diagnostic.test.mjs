import test from 'node:test';import assert from 'node:assert/strict';import {releaseWorkerDiagnostic,persistReleaseWorkerDiagnostic} from './lib/agent-host-release-worker.mjs';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import path from 'node:path';import os from 'node:os';
test('release diagnostics retain only fixed admission reasons and discard arbitrary exception content',()=>{
 assert.equal(releaseWorkerDiagnostic(Error('release_readiness_changed')),'release_readiness_changed');
 assert.equal(releaseWorkerDiagnostic(Error('release_api_uncertain')),'release_api_uncertain');
 assert.equal(releaseWorkerDiagnostic(Error('release_git_repository_changed')),'release_git_repository_changed');
 for(const message of ['Bearer private-value','release_password_value','release_api_uncertain\nprivate-value','https://example.test/private','C:\\private\\credential'])assert.equal(releaseWorkerDiagnostic(Error(message)),'release_preflight_unproven');
});
test('hidden launcher diagnostic file keeps only the classified reason and never an exception body',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'release-diagnostic-'));
 try{for(const [phase,reason,expected] of [['uncertainty','response_unproven_http_400','response_unproven_http_400'],['uncertainty','Bearer private-value','release_effect_unproven'],['blocked','release_review_stale','release_review_stale'],['blocked','credential private-value','release_preflight_unproven']]){
  assert.equal(persistReleaseWorkerDiagnostic(path.join(dir,'config.json'),phase,reason),true);
  const bytes=readFileSync(path.join(dir,'release-worker-diagnostic.json'),'utf8'),v=JSON.parse(bytes);
  assert.equal(v.reason,expected);assert.equal(v.phase,phase);assert.equal(bytes.includes('private-value'),false);
 }}finally{rmSync(dir,{recursive:true,force:true});}
});
