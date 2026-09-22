// Close the explicitly authorized manual atom after its owned server has stopped.
import fs from 'node:fs';
import path from 'node:path';
import {validateManualState} from './lib/hermes-manual-profile.mjs';
import {assertOwned,inventory,sha256} from './lib/hermes-manual-install.mjs';

const [stateArg,oldHash]=process.argv.slice(2),statePath=path.resolve(stateArg);
const {state}=validateManualState(statePath,oldHash);
const control=path.join(state.root.path,'point3-control');
const ownership=JSON.parse(fs.readFileSync(path.join(control,'ownership.json')));
assertOwned(control,ownership.identity);
if(ownership.profileIdentity!==state.root.identity)throw Error('control_owner');
inventory(control); // No link or special-file cleanup targets.
const operation=JSON.parse(fs.readFileSync(path.join(control,'operation-receipt.json')));
if(!operation.serverCleanup?.cleanup||operation.serverCleanup.activeProcesses!==0||!operation.protectedUnchanged)throw Error('cleanup_unproven');
const smokePath=path.join(state.root.path,'MANUAL_MODEL_SMOKE_RECEIPT.json');
const smoke=fs.existsSync(smokePath)?JSON.parse(fs.readFileSync(smokePath)):null;
const free=fs.statfsSync(state.root.path).bavail*fs.statfsSync(state.root.path).bsize;
const passed=operation.result==='PULL_AND_HANDOFF_COMPLETE'&&smoke?.result==='PASS'
  &&smoke.native.cleanup&&smoke.native.activeProcesses===0&&smoke.protectedUnchanged&&smoke.profileContentUnchanged&&free>=6*1024**3;
const result={schema:'hermes-manual-model-resume-v1',recordedAt:new Date().toISOString(),result:passed?'DONE':'BLOCKED',
  resumeAttempts:operation.pullAttempts,partialAdmission:operation.partialAdmission,
  model:operation.model??null,pull:operation.pull??null,serverCleanup:operation.serverCleanup,
  protectedUnchanged:operation.protectedUnchanged,runtimeUnchanged:true,
  freeBytes:free,minimumReserveBytes:6*1024**3,
  smoke:smoke?{result:smoke.result,inferenceRequests:smoke.inferenceRequests,expectedResponse:smoke.expectedResponse,
    responseSha256:smoke.responseSha256,durationSeconds:smoke.durationSeconds,backend:smoke.backend,
    receiptSha256:sha256(fs.readFileSync(smokePath))}:null,
  serverEngineFacts:operation.serverEngineFacts??[],storeAfter:operation.storeAfter,
  modelAdmissionScope:'one-manual-no-tools-smoke',interactiveAdmission:false,roostAuthority:false};
const receiptPath=path.join(state.root.path,'MANUAL_MODEL_RESUME_RECEIPT.json');
if(fs.existsSync(receiptPath))throw Error('closure_already_exists');
const batchPath=path.join(state.root.path,'Launch Hermes Manual.cmd'),batch=fs.readFileSync(batchPath,'utf8');
if(batch.split(oldHash).length!==2)throw Error('launcher_state_binding');
state.status=passed?'manual-smoke-passed':'manual-smoke-blocked';
state.model.smokeCompleted=passed;
state.model.smokeReceiptSha256=result.smoke?.receiptSha256??null;
const bytes=JSON.stringify(state,null,2)+'\n',hash=sha256(bytes);
fs.writeFileSync(statePath,bytes);fs.writeFileSync(batchPath,batch.replace(oldHash,hash));
fs.writeFileSync(receiptPath,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
assertOwned(control,ownership.identity);fs.rmSync(control,{recursive:true});
validateManualState(statePath,hash);
console.log(JSON.stringify({...result,stateSha256:hash,receiptSha256:sha256(fs.readFileSync(receiptPath)),temporaryControlRemoved:true}));
