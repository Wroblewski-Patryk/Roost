import test from 'node:test';import assert from 'node:assert/strict';import {releaseWorkerDiagnostic,persistReleaseWorkerDiagnostic} from './lib/agent-host-release-worker.mjs';

test('controller schema capacity refusals expose only fixed classifications',()=>{
 for(const suffix of ['unproven','unsupported','mixed','capacity_insufficient']){
  const reason='release_compose_configuration_schema_'+suffix;
  assert.equal(releaseWorkerDiagnostic(Error('outer',{cause:Error(reason)})),reason);
  assert.equal(releaseWorkerDiagnostic(Error(reason+' private-value')),'release_preflight_unproven');
 }
});
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
test('retained baseline inspection refusals remain attributable before the first intent',()=>{
 for(const reason of ['release_compose_inspector_transport_unproven','release_compose_inspector_response_invalid',
  'release_compose_inspector_configuration_unproven','release_compose_inspector_source_unproven',
  'release_compose_installation_baseline_runtime_changed']){
  assert.equal(releaseWorkerDiagnostic(Error('outer',{cause:Error(reason)})),reason);
  assert.equal(releaseWorkerDiagnostic(Error(reason+' private-value')),'release_preflight_unproven');
 }
 assert.equal(releaseWorkerDiagnostic(Error('release_compose_inspector_password_private')),'release_preflight_unproven');
});


test('deployment diagnostic enum persists only exact fixed reasons and keeps the five-node cause bound',()=>{
 const reasons=['release_compose_gateway_transport_unproven','release_compose_gateway_queue_unproven',
  'release_compose_gateway_dispatch_result_uncertain','release_compose_gateway_phase_capability_invalid',
  'release_coolify_compose_dispatch_uncertain','release_compose_installation_phase_configuration_changed',
  'release_compose_controller_service_set_changed'];
 const dir=mkdtempSync(path.join(os.tmpdir(),'release-deploy-diagnostic-'));
 try{for(const reason of reasons){
  assert.equal(releaseEffectDiagnostic(Error(reason)),reason);
  assert.equal(persistReleaseWorkerDiagnostic(path.join(dir,'config.json'),'uncertainty',reason),true);
  const bytes=readFileSync(path.join(dir,'release-worker-diagnostic.json'),'utf8');
  assert.deepEqual(Object.keys(JSON.parse(bytes)).sort(),['observedAt','phase','reason']);assert.equal(JSON.parse(bytes).reason,reason);
  for(const spoof of [Error(reason+'\nBearer fictional-private-value'),Object.assign(Error('fictional-private-value'),{transportDiagnostic:reason})])
   assert.equal(releaseEffectDiagnostic(spoof),'release_effect_unproven');
 }
 let chain=Error('release_child_ssh_timeout');for(let i=0;i<4;i++)chain=Error('private outer',{cause:chain});
 assert.equal(releaseEffectDiagnostic(chain),'release_child_ssh_timeout');chain=Error('private outer',{cause:chain});
 assert.equal(releaseEffectDiagnostic(chain),'release_effect_unproven');
 const cycle=Error('fictional-private-value');cycle.cause=cycle;assert.equal(releaseEffectDiagnostic(cycle),'release_effect_unproven');
 }finally{rmSync(dir,{recursive:true,force:true});}
});
test('partial rollout refusals retain only fixed public codes',()=>{for(const suffix of ['partial_exact_failed_queue','partial_complete_service_set','partial_owned_service_identity','partial_protected_database','partial_candidate_revision','partial_candidate_image','partial_exact_failure_states','partial_retained_images_present','partial_database_safety_unproven','partial_release_changed','partial_saved_failure_unproven','partial_data_fence_health_unproven','partial_changed_during_read','partial_observation_unproven']){const reason='release_compose_installation_'+suffix;assert.equal(releaseWorkerDiagnostic(Error(reason)),reason);assert.equal(releaseWorkerDiagnostic(Error(reason+' private-value')),'release_preflight_unproven');}});
