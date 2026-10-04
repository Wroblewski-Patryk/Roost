'use strict';
const contract=require('../lib/agent-host-release-contract.cjs');
const compose=require('../lib/agent-host-release-compose-state.cjs');
const hash=c=>c.repeat(64),git=c=>c.repeat(40),image=c=>`sha256:${hash(c)}`;
function fixture(){
 const s={commit:git('a'),candidateTree:git('b'),baseCommit:git('c'),baseTree:git('d')};
 const configuration={targetId:'composeapp',buildPack:'dockercompose',composePath:'/docker-compose.coolify.yml',
  repositoryUrl:'https://github.com/example/private-app',branch:'main',gitCommit:s.commit,autoDeploy:false,
  sourcePins:{queueHelper:hash('1'),deploymentJob:hash('2'),controllerRenderer:hash('f')},sourceDigest:hash('3'),composeDigest:hash('4'),
  environmentDigest:hash('5'),storageDigest:hash('6'),settingsDigest:hash('7'),runtimePolicyDigest:hash('8'),
  topology:{applicationId:'4',projectId:'1',environmentId:'2',destinationId:'3',destinationType:'StandaloneDocker',serverId:'0'},
  services:[{name:'app',role:'app',source:'built',expectedState:'running',mountDigest:hash('1')},
   {name:'migrate',role:'migration',source:'built',expectedState:'completed',mountDigest:hash('2')},
   {name:'maintenance',role:'cadence',source:'built',expectedState:'paused',mountDigest:hash('3')},
   {name:'db',role:'database',source:'image',expectedState:'running',mountDigest:hash('4'),imageDigest:image('e')}]};
 const invariants={rendererDigest:hash('f'),settingsInvariantDigest:hash('5'),runtimeInvariantDigest:hash('6')};
 const baselineConfig={...structuredClone(configuration),gitCommit:s.baseCommit};
 configuration.controllerPolicy={schemaVersion:'roost-compose-controller-policy-v1',phase:'candidate',...invariants,artifactDigest:hash('7'),buildCommandDigest:hash('8'),startCommandDigest:hash('9')};
 const rollbackConfiguration={...structuredClone(baselineConfig),sourceDigest:hash('9'),composeDigest:hash('a'),settingsDigest:hash('b'),runtimePolicyDigest:hash('c'),
  controllerPolicy:{...configuration.controllerPolicy,phase:'rollback',artifactDigest:hash('a'),buildCommandDigest:hash('b'),startCommandDigest:hash('c')}};
 const target={targetId:configuration.targetId,name:'app',composePath:configuration.composePath,sourceDigest:configuration.sourceDigest,
  configDigest:compose.composeConfigurationDigest(configuration),configuration,
  rollbackConfigDigest:compose.composeConfigurationDigest(rollbackConfiguration),rollbackConfiguration,
  baseline:{commit:s.baseCommit,tree:s.baseTree,sourceDigest:baselineConfig.sourceDigest,controllerInvariants:invariants,
   configDigest:compose.composeConfigurationDigest(baselineConfig),configuration:baselineConfig,
   images:configuration.services.filter(r=>r.source==='built').map((r,i)=>({name:r.name,imageDigest:image(String(i+1))}))}};
 const m={schemaVersion:'roost-release-manifest-v2',purpose:'application_release',
  repository:{url:configuration.repositoryUrl,defaultBranch:'main',canonicalDir:'C:\\Example\\App',candidateBranch:'codex/repair'},
  deployment:{provider:'coolify_compose',targetId:target.targetId,url:'https://app.example.test',controllerUrl:'https://controller.example.test',
   publicOrigins:['https://app.example.test'],targets:[target],artifactSetDigest:'',configDigest:contract.releaseDigest([{targetId:target.targetId,configDigest:target.configDigest}]),schemaDigest:hash('b')},
  baseline:{commit:s.baseCommit,artifactSetDigest:'',configDigest:contract.releaseDigest([{targetId:target.targetId,configDigest:target.baseline.configDigest}]),
   schemaDigest:hash('b'),healthDigest:hash('c'),dataDigest:hash('d'),observedAt:'2026-10-04T12:00:00.000Z'},
  rollback:{commit:s.baseCommit,artifactSetDigest:'',configDigest:contract.releaseDigest([{targetId:target.targetId,configDigest:target.rollbackConfigDigest}]),schemaDigest:hash('b'),compatibleSchemaDigests:[hash('b')]},
  services:[{name:'app',healthUrl:'https://app.example.test/health',expectedStatus:200}],
  observation:{seconds:120,intervalSeconds:10,maxFailures:0},
  backup:{digest:hash('f'),restoreDigest:hash('f'),bytes:10,capturedAt:'2026-10-04T12:00:00.000Z',restoreVerifiedAt:'2026-10-04T12:00:00.000Z'},
  cleanup:{repositoryUrl:configuration.repositoryUrl,canonicalDir:'C:\\Example\\App',coolifyTargetId:target.targetId,ownedResourceIds:[],archiveRepository:false,
   protectedResourceIds:[...new Set([target.targetId,...target.baseline.images.map(r=>r.imageDigest),...configuration.services.map(r=>r.mountDigest),image('e')])]}};
 s.manifest=m;
 m.deployment.artifactSetDigest=contract.sourceArtifactDigest(m,s);
 m.baseline.artifactSetDigest=contract.sourceArtifactDigest(m,s,'baseline');
 m.rollback.artifactSetDigest=contract.sourceArtifactDigest(m,s,true);
 function evidence(mode=false){
  const config=structuredClone(mode==='baseline'?target.baseline.configuration:mode?target.rollbackConfiguration:target.configuration);
  const commit=mode?s.baseCommit:s.commit,tree=mode?s.baseTree:s.candidateTree,deploymentId=mode?'baselinequeue':'candidatequeue';
  const runtime={targetId:target.targetId,deploymentId,services:config.services.map((r,i)=>({name:r.name,role:r.role,containerId:hash(String(i+1)),
   imageDigest:r.source==='image'?r.imageDigest:mode?target.baseline.images.find(img=>img.name===r.name).imageDigest:image('f'),mountDigest:r.mountDigest,
   state:r.role==='migration'?'exited':r.expectedState==='paused'?'paused':'running',health:['app','database'].includes(r.role)?'healthy':null,exitCode:0,
   createdAt:r.source==='built'?'2026-10-04T12:00:01.000Z':'2026-10-01T12:00:00.000Z',...(r.source==='built'?{commit,tree,deploymentId}:{})}))};
  const binding={commit,tree,deploymentId,queue:{targetId:target.targetId,deploymentId,commit,status:'finished',createdAt:'2026-10-04T12:00:00.000Z',finishedAt:'2026-10-04T12:00:02.000Z'},
   images:runtime.services.filter(r=>r.role!=='database').map(r=>({name:r.name,imageDigest:r.imageDigest,commit,tree,deploymentId}))};
  const expected=mode==='baseline'?m.baseline:mode?m.rollback:m.deployment;
  return {observedAt:'2026-10-04T12:02:05.000Z',deployedCommit:commit,deployedTree:tree,artifactSetDigest:expected.artifactSetDigest,
   configDigest:expected.configDigest,schemaDigest:expected.schemaDigest,healthDigest:hash('c'),dataDigest:hash('d'),healthy:true,observationSeconds:120,
   composeTargets:[{targetId:target.targetId,configuration:config,runtime,binding}],deploymentIds:[{targetId:target.targetId,deploymentId}],
   deployedSetDigest:contract.releaseDigest([{targetId:target.targetId,runtimeSetDigest:compose.composeRuntimeSetDigest(runtime.services)}])};
 }
 function recoveryEvidence(binding,options,kind='queue_failed'){
  const rollback=options.rollback===true,rows=evidence('baseline').composeTargets[0].runtime.services.map(row=>
   Object.fromEntries(['name','role','containerId','imageDigest','mountDigest','state','health','exitCode','createdAt'].map(k=>[k,row[k]])));
  const deploymentId=`r${contract.releaseDigest([binding.releaseId,options.operationId,target.targetId,rollback?'rollback':'candidate']).slice(0,23)}`;
  const composeRecovery={schemaVersion:'roost-compose-recovery-observation-v1',kind,releaseId:binding.releaseId,operationId:options.operationId,since:options.since,
   targetId:target.targetId,phase:rollback?'rollback':'candidate',requestedCommit:rollback?binding.baseCommit:binding.commit,requestedTree:rollback?binding.baseTree:binding.candidateTree,
   deploymentId,queue:kind==='queue_absent'?null:{targetId:target.targetId,deploymentId,commit:rollback?binding.baseCommit:binding.commit,status:'failed',createdAt:options.since,finishedAt:options.since},
   controlPlaneQuiescent:true,configuration:structuredClone(rollback?target.rollbackConfiguration:target.configuration),baselineCommit:binding.baseCommit,baselineTree:binding.baseTree,
   migrationSchemaVerified:true,baselineServices:structuredClone(rows),services:rows};
  return {composeRecovery,deploymentIds:kind==='queue_absent'?[]:[{targetId:target.targetId,deploymentId}],deployedCommit:binding.baseCommit,deployedTree:binding.baseTree,artifactSetDigest:m.baseline.artifactSetDigest,
   configDigest:rollback?m.rollback.configDigest:m.deployment.configDigest,schemaDigest:m.baseline.schemaDigest,dataDigest:m.baseline.dataDigest,healthDigest:m.baseline.healthDigest,
   healthy:true,observedAt:options.since,deployedSetDigest:contract.releaseDigest([{targetId:target.targetId,runtimeSetDigest:compose.composeRuntimeSetDigest(rows)}]),
   ...(kind==='queue_absent'?{absenceVerified:true}:{})};
 }
 return {s,m,target,release:{snapshot:s,manifest_digest:contract.releaseDigest(m)},evidence,recoveryEvidence};
}
module.exports={fixture,hash,git,image};
