import test from 'node:test';import assert from 'node:assert/strict';import {releaseWorkerDiagnostic,persistReleaseWorkerDiagnostic} from './lib/agent-host-release-worker.mjs';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';import path from 'node:path';import os from 'node:os';
import {releaseEffectDiagnostic} from './lib/agent-host-release-broker.mjs';
test('fixed SSH child reasons survive nested effect and preflight diagnostics',()=>{
 for(const reason of ['ssh_timeout','ssh_connection_closed','ssh_host_identity_unproven']){
  const expected='release_child_'+reason;
  const error=Error('private outer content',{cause:Error('release_git_set_installation_ssh_unavailable',{cause:Error(expected)})});
  assert.equal(releaseEffectDiagnostic(error),expected);assert.equal(releaseWorkerDiagnostic(error),expected);
  assert.equal(releaseEffectDiagnostic(Error(expected+'\nBearer private-value')),'release_effect_unproven');
  assert.equal(releaseWorkerDiagnostic(Error(expected+'\nBearer private-value')),'release_preflight_unproven');
 }
});
test('uncertain effect diagnostics preserve fixed native causes without error text or journal changes',()=>{
 assert.equal(releaseEffectDiagnostic(Error('outer private message',{cause:Error('release_git_set_gateway_safety_unproven',
  {cause:Error('release_git_set_installation_ssh_unavailable',{cause:Error('release_child_native_exit_failed')})})})),
  'release_child_native_exit_failed');
 for(const message of ['release_child_password_private','release_child_native_exit_failed\nprivate','private-value'])
  assert.equal(releaseEffectDiagnostic(Error(message)),'release_effect_unproven');
});
test('release diagnostics retain only fixed admission reasons and discard arbitrary exception content',()=>{
 assert.equal(releaseWorkerDiagnostic(Error('release_coolify_git_set_runtime_identity_changed')),'release_coolify_git_set_runtime_identity_changed');
 assert.equal(releaseWorkerDiagnostic(Error('release_coolify_git_set_runtime_identity_changed\nprivate-value')),'release_preflight_unproven');
 assert.equal(releaseWorkerDiagnostic(Error('release_readiness_changed')),'release_readiness_changed');
 assert.equal(releaseWorkerDiagnostic(Error('release_api_uncertain')),'release_api_uncertain');
 assert.equal(releaseWorkerDiagnostic(Error('release_git_repository_changed')),'release_git_repository_changed');
 assert.equal(releaseWorkerDiagnostic(Error('private outer content',{cause:Error('release_dockerfile_state_transport_unproven',{cause:Error('release_git_set_installation_ssh_unavailable',{cause:Error('release_child_native_assignment_unobserved')})})})),'release_child_native_assignment_unobserved');
 for(const message of ['Bearer private-value','release_password_value','release_api_uncertain\nprivate-value','https://example.test/private','C:\\private\\credential'])assert.equal(releaseWorkerDiagnostic(Error(message)),'release_preflight_unproven');
});
test('Compose diagnostics identify fixed safety refusals without accepting a prefix or attached private content',()=>{
 assert.equal(releaseWorkerDiagnostic(Error('release_compose_no_effect_diagnosis_required')),'release_compose_no_effect_diagnosis_required');
 assert.equal(releaseWorkerDiagnostic(Error('release_compose_no_effect_diagnosis_required private-value')),'release_preflight_unproven');
 for(const reason of ['release_compose_installation_database_recreation_unproven','release_compose_installation_phase_intent_unproven',
  'release_compose_installation_configuration_absence_observation_unproven','release_coolify_compose_configuration_absence_unproven',
  'release_compose_installation_version_health_unproven','release_coolify_compose_runtime_identity_unproven']){
  assert.equal(releaseWorkerDiagnostic(Error('outer',{cause:Error(reason)})),reason);
  assert.equal(releaseWorkerDiagnostic(Error(reason+' private-value')),'release_preflight_unproven');
 }
 assert.equal(releaseWorkerDiagnostic(Error('release_compose_installation_credential_private')),'release_preflight_unproven');
});
test('hidden launcher diagnostic file keeps only the classified reason and never an exception body',()=>{
 const dir=mkdtempSync(path.join(os.tmpdir(),'release-diagnostic-'));
 try{for(const [phase,reason,expected] of [['uncertainty','response_unproven_http_400','response_unproven_http_400'],['uncertainty','release_child_native_exit_failed','release_child_native_exit_failed'],
  ...['uncertainty','blocked'].flatMap(phase=>['ssh_timeout','ssh_connection_closed','ssh_host_identity_unproven'].map(reason=>[phase,'release_child_'+reason,'release_child_'+reason])),
  ['uncertainty','Bearer private-value','release_effect_unproven'],['blocked','release_review_stale','release_review_stale'],['blocked','credential private-value','release_preflight_unproven']]){
  assert.equal(persistReleaseWorkerDiagnostic(path.join(dir,'config.json'),phase,reason),true);
  const bytes=readFileSync(path.join(dir,'release-worker-diagnostic.json'),'utf8'),v=JSON.parse(bytes);
  assert.equal(v.reason,expected);assert.equal(v.phase,phase);assert.equal(bytes.includes('private-value'),false);
 }}finally{rmSync(dir,{recursive:true,force:true});}
});
