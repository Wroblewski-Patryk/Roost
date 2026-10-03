import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import path from 'node:path';import os from 'node:os';
import {testReplayConfigSchema,prepareTestReplayConfiguration} from './lib/agent-host-test-replay-config.mjs';
import {verifyExistingLocalCommit} from './lib/agent-host-local-commit.mjs';
const candidate='a'.repeat(40),baseline='b'.repeat(40),branch='codex/task-example';
const configuration=()=>({schemaVersion:'roost-coding-test-replay-config-v1',candidateCommit:candidate,baselineCommit:baseline,branch,projectionPaths:['apps/web/src/app/manifest.ts'],assetPaths:['apps/web/public/logo.png'],temporaryParent:os.tmpdir(),expectedFailure:{fullName:'dimension assertion',messageIncludes:['512','1000']}});
test('private replay configuration rejects unknown or malformed authority fields',()=>{
 for(const change of [c=>c.release=true,c=>c.candidateCommit='main',c=>c.baselineCommit='../HEAD',c=>c.expectedFailure.messageIncludes=['512']]){const c=configuration();change(c);assert.equal(testReplayConfigSchema.safeParse(c).success,false);}
});
test('configuration is bound to physical private bytes and exact retained candidate',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'roost-replay-config-test-')),repo=path.join(root,'repo'),filename=path.join(root,'config.json');mkdirSync(repo);
 try{const c=configuration();writeFileSync(filename,JSON.stringify(c));const p=prepareTestReplayConfiguration({filename,repositoryPath:repo,candidateCommit:candidate,branch});p.assertUnchanged();assert.throws(()=>prepareTestReplayConfiguration({filename,repositoryPath:repo,candidateCommit:baseline,branch}),/unproven/);writeFileSync(filename,JSON.stringify({...c,branch:'codex/changed'}));assert.throws(()=>p.assertUnchanged(),/unproven/);const inner=path.join(repo,'config.json');writeFileSync(inner,JSON.stringify(c));assert.throws(()=>prepareTestReplayConfiguration({filename:inner,repositoryPath:repo,candidateCommit:candidate,branch}),/unproven/);}finally{rmSync(root,{recursive:true,force:true});}
});

test('a dot-prefixed child is inside the repository, not private configuration',()=>{
 const root=mkdtempSync(path.join(os.tmpdir(),'roost-replay-config-test-')),filename=path.join(root,'..private.json');
 try{writeFileSync(filename,JSON.stringify(configuration()));assert.throws(()=>prepareTestReplayConfiguration({filename,repositoryPath:root,candidateCommit:candidate,branch}),/unproven/);}finally{rmSync(root,{recursive:true,force:true});}
});
test('same-commit finalization refuses serialized success and unauthenticated continuation before Git',()=>{
 let observed=0;const args={repositoryPath:path.join(os.tmpdir(),'never-touch-app'),executionId:'c'.repeat(36),taskId:'d'.repeat(36),baselineCommit:candidate,branch,writePaths:['apps/web/src/app/manifest.ts'],firstWrite:{operations:{localCommit:true},baselineCommit:candidate,branch,decisionId:'e'.repeat(36),expiresAt:new Date(Date.now()+60000).toISOString(),continuation:{previousCommit:candidate,previousExecutionId:'f'.repeat(36),reviewId:'1'.repeat(36)}},nativeReviewReceipt:{verdict:'verified_candidate'},nativeReviewReceiptDigest:'a'.repeat(64),candidateTests:{passed:true,digest:'a'.repeat(64),regressionReplay:{candidateCommit:candidate,baselineCommit:baseline}},workspaceEvidence:{head:candidate,branch,status:[],manifest:[]},assertAuthority:()=>observed++};
 assert.throws(()=>verifyExistingLocalCommit(args),/local_commit_unproven/);assert.equal(observed,0);delete args.firstWrite.continuation;assert.throws(()=>verifyExistingLocalCommit(args),/local_commit_unproven/);assert.equal(observed,0);
});
