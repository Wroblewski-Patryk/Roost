// Supporting unit/mock transport checks. No VPS/API/model/app effects.
import test from 'node:test';import assert from 'node:assert/strict';
import {createHash,randomUUID} from 'node:crypto';
import {mkdtempSync,mkdirSync,readFileSync,writeFileSync,rmSync} from 'node:fs';
import os from 'node:os';import path from 'node:path';import {fileURLToPath} from 'node:url';
import fixtureModule from './fixtures/release-compose-contract.cjs';
import contract from './lib/agent-host-release-contract.cjs';
import {createInstalledComposeRelease,installedComposeReleaseSchema,qualifyComposeImageRetentionPolicy,composeImageRetentionJournalFile,qualifyComposeRetentionObservation,createComposeImageRetention} from './lib/agent-host-release-compose-worker.mjs';
import {composeConfigurationDigest} from './lib/agent-host-release-compose-state.mjs';
import {composeControllerPolicyRecord,composeMountDigest,renderComposePhaseCommands} from './lib/agent-host-release-compose-controller.mjs';
import {retainedImageAnchor} from './lib/agent-host-image-retention.mjs';
import {coolifyGitSetDeploymentId} from './lib/agent-host-release-coolify-git-set-gateway.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),rendererFile=fileURLToPath(new URL('./lib/agent-host-release-compose-controller.mjs',import.meta.url));
function fixture(){const f=fixtureModule.fixture(),{m,s,target:t}=f;s.releaseId=randomUUID();s.applicationId=randomUUID();
 const oldCadence=t.configuration.services.find(r=>r.role==='cadence');for(const c of [t.configuration,t.rollbackConfiguration,t.baseline.configuration]){c.services.push({...oldCadence,name:'proactive_cadence'});}
 t.baseline.images.find(r=>r.name==='migrate').imageDigest=t.baseline.images.find(r=>r.name==='app').imageDigest;
 t.baseline.images.find(r=>r.name==='maintenance').imageDigest=fixtureModule.image('2');
 t.baseline.images.push({name:'proactive_cadence',imageDigest:fixtureModule.image('3')});
 for(const c of [t.rollbackConfiguration,t.baseline.configuration])for(const r of c.services){const i=t.baseline.images.find(x=>x.name===r.name);if(r.imageDigest&&i)r.imageDigest=i.imageDigest;}
 t.configDigest=composeConfigurationDigest(t.configuration);t.rollbackConfigDigest=composeConfigurationDigest(t.rollbackConfiguration);t.baseline.configDigest=composeConfigurationDigest(t.baseline.configuration);
 for(const [part,d]of [['deployment',t.configDigest],['rollback',t.rollbackConfigDigest],['baseline',t.baseline.configDigest]])m[part].configDigest=contract.releaseDigest([{targetId:t.targetId,configDigest:d}]);
 m.cleanup.protectedResourceIds=[...new Set([...m.cleanup.protectedResourceIds,...t.baseline.images.map(r=>r.imageDigest)])];
 for(const[part,mode]of [['deployment',false],['rollback',true],['baseline','baseline']])m[part].artifactSetDigest=contract.sourceArtifactDigest(m,s,mode);
 const policy={schemaVersion:'roost-retained-image-policy-v1',installationId:randomUUID(),scopeDigest:contract.releaseDigest(m),images:[...new Set(t.baseline.images.map(r=>r.imageDigest))].sort()};return{f,m,s,t,policy};}
function image(i){return{Id:i,Created:'2026-01-01T00:00:00.000Z',RepoTags:['example:owned'],Config:{Env:['PATH=/usr/bin','APP_BUILD_REVISION=fixture'],Volumes:null}};}
function anchor(p,im){const plan=retainedImageAnchor(p,im);return{Id:hash(plan.name),Name:'/'+plan.name,Image:im,Created:'2026-01-01T00:00:00.000Z',State:{Status:'created',Running:false,Pid:0},Config:{Image:im,Env:image(im).Config.Env,Entrypoint:['/bin/true'],Labels:plan.labels,Volumes:null},Mounts:[],HostConfig:{NetworkMode:'none',ReadonlyRootfs:true,Memory:16777216,PidsLimit:4,Privileged:false,CapDrop:['ALL'],SecurityOpt:['no-new-privileges'],PortBindings:{},Binds:null}};}
function harness({preexisting=false,createThrows=false,createAbsent=false}={}){const f=fixture(),commands=[],images=new Map(f.policy.images.map(i=>[i,image(i)])),anchors=new Map(),effects=[],writes=[];let journal=null;
 if(preexisting)for(const i of f.policy.images){const a=anchor(f.policy,i);anchors.set(a.Name.slice(1),a);}
 const ssh=async({command})=>{commands.push(command);if(command.startsWith('docker image inspect')){const id=command.match(/sha256:[a-f0-9]{64}/)[0];if(!images.has(id))throw Error('missing');return JSON.stringify(images.get(id));}
  if(command.startsWith('docker container ls')){const name=command.match(/name=\^\/([^$]+)\$/)[1],a=anchors.get(name);return a?a.Id+'\n':'';}
  if(command.startsWith('docker container inspect')){const id=command.match(/[a-f0-9]{64}/)[0],a=[...anchors.values()].find(x=>x.Id===id);assert(a);return JSON.stringify(a);}
  const args=[...command.matchAll(/'([^']*)'/g)].map(x=>x[1]);assert.equal(command.startsWith('docker '),true);assert.equal(args[0],'create');assert(journal?.pending,'intent must precede native create');assert(args.includes('--pull')&&args[args.indexOf('--pull')+1]==='never');
  const im=args.at(-1),p={...f.policy,images:[...images.keys()]},a=anchor(p,im);if(!createAbsent)anchors.set(a.Name.slice(1),a);if(createThrows)throw Error('uncertain timeout');return a.Id+'\n';};
 const controller=createComposeImageRetention({policy:f.policy,snapshot:f.s,ssh,readJournal:async()=>journal,writeJournal:async j=>{journal=structuredClone(j);writes.push(journal);},assertEffect:async e=>effects.push(e),now:()=>Date.parse('2026-01-01T00:00:00Z')});return{...f,controller,ssh,commands,images,anchors,effects,writes,get journal(){return journal;}};}
const effect={operationId:'00000000-0000-4000-8000-000000000001',operation:'deploy_config',since:'2026-01-01T00:00:00Z'};
test('four built declarations deduplicate shared app/migration image and exclude database before transport',()=>{const f=fixture(),p=qualifyComposeImageRetentionPolicy(f.policy,f.s);assert.equal(f.t.baseline.images.length,4);assert.equal(p.images.length,3);assert(!p.images.includes(f.t.baseline.configuration.services.find(r=>r.role==='database').imageDigest));for(const change of [p=>p.images.push(fixtureModule.image('e')),p=>p.images.pop(),p=>p.scopeDigest=fixtureModule.hash('a'),p=>p.images.push(p.images[0])]){const p=structuredClone(f.policy);change(p);assert.throws(()=>qualifyComposeImageRetentionPolicy(p,f.s));}});
test('journal filename is per immutable manifest AND release, cannot collide with policy',()=>{const f=fixture(),file=path.join(os.tmpdir(),'retention-policy.json');assert.notEqual(composeImageRetentionJournalFile(file,f.policy,f.s.releaseId),composeImageRetentionJournalFile(file,f.policy,randomUUID()));assert.throws(()=>composeImageRetentionJournalFile(file,f.policy,'unsafe'));});
test('readonly baseline validates existing qualifying anchors without Docker create or invented deployment health',async()=>{const h=harness({preexisting:true}),r=await h.controller.inspect();assert.equal(r.anchors.length,3);assert.equal(r.runtimeStarted,false);assert.equal(r.deploymentOrHealthProof,false);assert.equal(r.observationOnly,true);assert.equal(h.commands.some(s=>s.startsWith("docker 'create'")),false);assert.equal(h.writes.length,0);});
test('baseline inspection never bootstraps missing anchors or invents missing old images',async()=>{const h=harness();await assert.rejects(()=>h.controller.inspect(),/retention_anchor_required/);assert.equal(h.commands.some(s=>s.startsWith("docker 'create'")),false);h.images.clear();await assert.rejects(()=>h.controller.ensure({effect}),/retention_image_missing/);assert.equal(h.writes.length,0);});
test('authorized create uses exact immutable ID, no pull/env/mount/network/start, with actual label/readback journal',async()=>{const h=harness(),r=await h.controller.ensure({effect});assert.equal(r.createdAnchors,3);assert.equal(r.anchors.length,3);assert.equal(h.journal.pending,null);assert(Object.values(h.journal.anchors).every(a=>a.readbackVerified));const commands=h.commands.filter(s=>s.startsWith("docker 'create'"));assert.equal(commands.length,3);for(const c of commands){assert(c.includes("'--network' 'none'"));assert(c.includes("'--pull' 'never'"));assert(c.includes("'coolify.managed=false'"));assert(!/--env|--env-file|--mount|--volume|docker (?:run|start|rm|prune)/.test(c));}assert(h.effects.length>=6);});
test('candidate immutable images can be additionally retained without changing baseline policy or touching DB',async()=>{const h=harness({preexisting:true}),id=fixtureModule.image('a');h.images.set(id,image(id));const r=await h.controller.ensure({additionalImages:[id,id],effect:{...effect,operation:'deploy'}});assert.equal(r.anchors.length,4);assert.equal(r.createdAnchors,1);assert.equal(r.baselineImages.length,3);assert.deepEqual(r.additionalImages,[id]);assert.equal(h.policy.images.length,3);await assert.rejects(()=>h.controller.ensure({additionalImages:[h.t.baseline.configuration.services.find(r=>r.role==='database').imageDigest],effect}),/retention_database_anchor_forbidden/);});
test('unknown create with exact actual existing readback is reconciled once; transport failure is not absence',async()=>{const h=harness({createThrows:true}),r=await h.controller.ensure({effect});assert.equal(r.anchors.length,3);assert.equal(h.commands.filter(s=>s.startsWith("docker 'create'")).length,3);assert.equal(h.journal.pending,null);assert.equal(r.runtimeStarted,false);});
test('unknown create with verified absence preserves durable intent and never retries',async()=>{const h=harness({createThrows:true,createAbsent:true});await assert.rejects(()=>h.controller.ensure({effect}),e=>e.uncertain===true);assert(h.journal.pending);await assert.rejects(()=>h.controller.ensure({effect}),/retention_uncertain_create_no_retry/);assert.equal(h.commands.filter(s=>s.startsWith("docker 'create'")).length,1);});
test('readonly requery clears pending only after exact owned anchor appears, without repeating create',async()=>{const h=harness({createAbsent:true});await assert.rejects(()=>h.controller.ensure({effect}));for(const im of h.policy.images){const a=anchor(h.policy,im);h.anchors.set(a.Name.slice(1),a);}const r=await h.controller.inspect();assert.equal(r.pendingCreate,null);assert.equal(h.commands.filter(s=>s.startsWith("docker 'create'")).length,1);assert(Object.values(h.journal.anchors).some(a=>a.reconciledByActualInspection));});
for(const[name,change]of Object.entries({running:a=>a.State.Running=true,started:a=>a.State.Status='exited',pid:a=>a.State.Pid=123,managed:a=>a.Config.Labels['coolify.managed']='true',owner:a=>a.Config.Labels['roost.retention.installation']=randomUUID(),mount:a=>a.Mounts=[{}],network:a=>a.HostConfig.NetworkMode='host',runtimeEnv:a=>a.Config.Env.push('DATABASE_URL=not-allowed'),entrypoint:a=>a.Config.Entrypoint=['/bin/sh'],volume:a=>a.Config.Volumes={'/data':{}},privileged:a=>a.HostConfig.Privileged=true,image:a=>a.Image=fixtureModule.image('f')}))test('actual anchor observation refuses '+name,()=>{const f=fixture(),im=f.policy.images[0],a=anchor(f.policy,im);change(a);assert.throws(()=>qualifyComposeRetentionObservation(image(im),a,retainedImageAnchor(f.policy,im)));});
test('image declaring anonymous volumes is refused BEFORE Docker create',async()=>{const h=harness();h.images.get(h.policy.images[0]).Config.Volumes={'/data':{}};await assert.rejects(()=>h.controller.ensure({effect}));assert.equal(h.commands.some(s=>s.startsWith("docker 'create'")),false);});
test('sensitive build-image ENV is forbidden before anchoring, and extra runtime ENV is independently forbidden',async()=>{const h=harness();h.images.get(h.policy.images[0]).Config.Env.push('AUTH_SESSION_SECRET=fictional-placeholder');await assert.rejects(()=>h.controller.ensure({effect}),/retention_sensitive_image_environment_forbidden/);assert.equal(h.commands.some(c=>c.startsWith("docker 'create'")),false);assert.equal(h.writes.length,0);});

// Physical installed lifecycle fixture appended below. Only transport facts are
// substituted; actual sealed settings/identity/private files remain material.
function installedFixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'roost-compose-installed-'));
  t.after(() => { assert(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep + 'roost-compose-installed-')); rmSync(root, { recursive: true, force: true }); });
  const workspace = path.join(root, 'workspace'), checkout = path.join(workspace, 'app'), privateDir = path.join(root, 'private');
  mkdirSync(path.join(checkout, '.git'), { recursive: true }); mkdirSync(privateDir);
  const f = fixtureModule.fixture(), { m, s, target } = f;
  m.repository.canonicalDir = checkout; m.cleanup.canonicalDir = checkout;
  s.applicationId = randomUUID(); s.releaseId = randomUUID();
  const renderer = hash(readFileSync(rendererFile)), pins = {
    queueHelper: fixtureModule.hash('1'), deploymentJob: fixtureModule.hash('2'), applicationModel: fixtureModule.hash('3'),
    composeParser: fixtureModule.hash('4'), dockerHelper: fixtureModule.hash('5'), applicationsController: fixtureModule.hash('6'), controllerRenderer: renderer
  };
  const mountDigest = composeMountDigest([]);
  const policies = {}, phaseFiles = {};
  for (const config of [target.configuration, target.rollbackConfiguration, target.baseline.configuration]) {
    config.sourcePins.controllerRenderer = renderer;
    for (const service of config.services) service.mountDigest = mountDigest;
  }
  target.baseline.controllerInvariants.rendererDigest = renderer;
  target.baseline.configDigest = composeConfigurationDigest(target.baseline.configuration);
  for (const phase of ['candidate', 'rollback']) {
    const config = phase === 'candidate' ? target.configuration : target.rollbackConfiguration;
    const artifact = Buffer.from(JSON.stringify({ services: Object.fromEntries(config.services.map(service => [service.name,
      service.source === 'image' ? { image: 'postgres:15' } : phase === 'candidate' ? { build: { context: '.' } }
        : { image: target.baseline.images.find(r => r.name === service.name).imageDigest }])) }));
    const policy = {
      schemaVersion: 'roost-compose-phase-policy-v1', releaseId: s.releaseId, policyId: randomUUID(), targetId: target.targetId, phase,
      commit: phase === 'candidate' ? s.commit : s.baseCommit, tree: phase === 'candidate' ? s.candidateTree : s.baseTree,
      composePath: target.composePath, baseDirectory: '/', rawCompose: false, preserveRepository: false, useBuildServer: false,
      originalConfigDigest: target.baseline.configDigest, phaseConfigDigest: fixtureModule.hash('0'), artifactDigest: hash(artifact),
      ...target.baseline.controllerInvariants, sourcePins: pins,
      services: config.services.map(service => ({ name: service.name, role: service.role, source: service.source, mountDigest,
        imageDigest: service.source === 'image' ? service.imageDigest : target.baseline.images.find(r => r.name === service.name).imageDigest,
        imageRef: service.source === 'image' ? 'postgres:15' : target.baseline.images.find(r => r.name === service.name).imageDigest }))
    };
    config.controllerPolicy = composeControllerPolicyRecord(policy);
    const digest = composeConfigurationDigest(config);
    policy.phaseConfigDigest = digest; target[phase === 'candidate' ? 'configDigest' : 'rollbackConfigDigest'] = digest;
    policies[phase] = policy;
    const artifactFile = path.join(privateDir, `${phase}-artifact.json`), policyFile = path.join(privateDir, `${phase}-policy.json`);
    writeFileSync(artifactFile, artifact); writeFileSync(policyFile, JSON.stringify(policy));
    phaseFiles[phase] = { policy: { file: policyFile, sha256: hash(readFileSync(policyFile)) }, artifact: { file: artifactFile, sha256: hash(artifact) } };
  }
  m.deployment.configDigest = contract.releaseDigest([{ targetId: target.targetId, configDigest: target.configDigest }]);
  m.baseline.configDigest = contract.releaseDigest([{ targetId: target.targetId, configDigest: target.baseline.configDigest }]);
  m.rollback.configDigest = contract.releaseDigest([{ targetId: target.targetId, configDigest: target.rollbackConfigDigest }]);
  m.cleanup.protectedResourceIds = [target.targetId, ...target.baseline.images.map(r => r.imageDigest), mountDigest, fixtureModule.image('e')];
  m.deployment.artifactSetDigest = contract.sourceArtifactDigest(m, s);
  m.baseline.artifactSetDigest = contract.sourceArtifactDigest(m, s, 'baseline');
  m.rollback.artifactSetDigest = contract.sourceArtifactDigest(m, s, true);
  m.baseline.healthDigest = contract.releaseDigest(m.services.map(service => ({ ...service, healthy: true })));
  const baseline = { observed: true, migrationSchemaVerified: true, commit: s.baseCommit, tree: s.baseTree,
    configDigest: target.baseline.configDigest, schemaDigest: m.baseline.schemaDigest, healthDigest: m.baseline.healthDigest,
    dataDigest: m.baseline.dataDigest, healthy: true, images: target.baseline.images,
    services: f.evidence('baseline').composeTargets[0].runtime.services };
  const ownership = { schemaVersion: 'roost-application-release-ownership-v1', applicationId: s.applicationId,
    canonicalDir: checkout, repositoryUrl: m.repository.url, targetIds: [target.targetId], protectedResourceIds: m.cleanup.protectedResourceIds, ownedResourceIds: [] };
  const ownerFile = path.join(privateDir, 'ownership.json'), baselineFile = path.join(privateDir, 'baseline.json');
  writeFileSync(ownerFile, JSON.stringify(ownership)); writeFileSync(baselineFile, JSON.stringify(baseline));
  const settings = { sshHost: 'fixture-host', sshAddressFamily: 'ipv4', workspaceRoot: workspace, ownershipFile: ownerFile,
    baselineObservation: { file: baselineFile, sha256: hash(readFileSync(baselineFile)) }, phases: phaseFiles, sourcePins: pins,
    source: { sshHost: 'fixture-host', container: baseline.services.find(r => r.role === 'database').containerId, user: 'appuser', database: 'appdb' }, fingerprintTimeoutMs: 30000,
    capacity: { minDiskBytes: 1000, minMemoryBytes: 1000, maxLoad1: 2 }, coolify: { origin: 'https://controller.example.test' },
    health: { frontendMetaName: 'application-revision', requireReleaseReadiness: true, requireReflectionReadiness: true } };
  const state = { release: { id: s.releaseId, snapshot: s }, status: 'active', journal: [] };
  const calls = [], clock = { now: Date.now() }, live = { phase: 'baseline', queue: null, capacity: { diskBytes: 10000, memoryBytes: 10000, load1: 0.5 },
    cadenceState: 'paused', cadenceExit: 0, cadenceHealth: null, fence: true, otherSessions: 0, healthy: true, versionVerified: true, remote: s.commit, mounts: [],
    databaseContainer: settings.source.container, databaseImage: fixtureModule.image('e'), databaseMount: mountDigest, databaseHealth: 'healthy', appHealth: 'healthy', migrationExit: 0,
    controllerObserved: { settingsInvariantDigest: target.baseline.controllerInvariants.settingsInvariantDigest,
      runtimeInvariantDigest: target.baseline.controllerInvariants.runtimeInvariantDigest } };
  let inspectorOptions;
  const phaseConfig = () => live.phase === 'baseline' ? target.baseline.configuration : live.phase === 'rollback' ? target.rollbackConfiguration : target.configuration;
  const runtimeEvidence = queue => {
    const row = f.evidence(queue.commit === s.baseCommit).composeTargets[0];
    row.runtime.deploymentId = queue.deploymentId; row.binding.deploymentId = queue.deploymentId; row.binding.queue = queue;
    Object.assign(row.runtime.services.find(r => r.role === 'database'), { containerId: live.databaseContainer, imageDigest: live.databaseImage, mountDigest: live.databaseMount, health: live.databaseHealth });
    row.runtime.services.find(r => r.role === 'app').health = live.appHealth;
    row.runtime.services.find(r => r.role === 'migration').exitCode = live.migrationExit;
    for (const service of row.runtime.services) if (service.role !== 'database') {
      service.deploymentId = queue.deploymentId; service.createdAt = new Date(Date.parse(queue.createdAt) + 500).toISOString();
    }
    for (const image of row.binding.images) image.deploymentId = queue.deploymentId;
    return row;
  };
  const deps = {
    now: () => clock.now, sleep: async ms => { clock.now += ms; calls.push({ kind: 'wait', ms }); live.afterSleep?.(); },
    readReleaseState: async () => state,
    createHealthProbe: ({ publicUrl, health }) => async args => {
      calls.push({ kind: 'health', publicUrl, health, ...args });
      return { healthy: live.healthy, versionVerified: live.versionVerified, healthDigest: m.baseline.healthDigest,
        observations: ['backend', 'frontend'].map(surface => ({ surface, healthy: live.healthy, versionVerified: live.versionVerified, reason: 'verified' })) };
    },
    coolifyJson: async args => {
      calls.push({ kind: 'https', ...args });
      if (args.method === 'PATCH') live.phase = args.body.git_commit_sha === s.commit ? 'candidate' : 'rollback';
      const commands=live.phase==='baseline'?{build:'',start:''}:renderComposePhaseCommands(policies[live.phase]);
      return { uuid: target.targetId, git_commit_sha: phaseConfig().gitCommit,
        docker_compose_custom_build_command:commands.build,docker_compose_custom_start_command:commands.start };
    },
    createInspector: options => { inspectorOptions = options; return {
      inspectConfiguration: async () => structuredClone(phaseConfig()),
      inspectLegacyBaseline: async () => ({ configuration: structuredClone(phaseConfig()), controllerObserved: live.controllerObserved,
        services: baseline.services.filter(r=>!live.missingMigration||r.role!=='migration').map(r => ({ ...r, ...(r.role === 'app' ? {imageDigest:live.appImage??r.imageDigest,health:live.appHealth}
          : r.role === 'cadence' ? { state: live.cadenceState, exitCode: live.cadenceExit, health: live.cadenceHealth }
          : r.role === 'database' ? { containerId: live.databaseContainer, imageDigest: live.databaseImage, mountDigest: live.databaseMount, health: live.databaseHealth } : {}) })) }),
      readEvidence: async queue => runtimeEvidence(queue), readRuntime: async queue => runtimeEvidence(queue).runtime,
      readBuildImages: async queue => runtimeEvidence(queue).binding.images
    }; },
    nativeProcess: async (binary, options) => {
      calls.push({ kind: 'native', binary, ...options });
      if (binary === 'git') return options.argv.includes('show') ? Buffer.from('fixed-compose-source') : Buffer.from(`${s.candidateTree}\n`);
      const command = options.argv.at(-1);
      if (command.includes('psql')) return JSON.stringify({ readOnlyFence: live.fence, activeOtherSessions: live.otherSessions });
      if (command === 'bash -s') { live.afterFingerprint?.(); return `${m.baseline.schemaDigest}  -\n${m.baseline.dataDigest}  -\n`; }
      if (command.startsWith('docker image inspect')) return command.endsWith("'postgres:15'") ? fixtureModule.image('e') : command.match(/sha256:[a-f0-9]{64}/)?.[0];
      if (command.startsWith('docker container inspect')) return JSON.stringify(live.mounts);
      if (command !== 'docker exec -i coolify php') return JSON.stringify(live.capacity);
      const encoded = options.input.match(/base64_decode\('([^']+)'/)[1], payload = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
      if (payload.operation) {
        calls.push({ kind: 'queue', payload });
        if (payload.operation === 'dispatch') live.queue = { targetId: payload.targetId, deploymentId: payload.deploymentId, commit: payload.commit,
          status: 'finished', createdAt: state.journal.at(-1).createdAt, finishedAt: new Date().toISOString() };
        return JSON.stringify({ ok: true, queue: live.queue });
      }
      if (payload.name) return '{"staged":true}';
      if(options.input.includes('roost_compose_configuration_schema'))return JSON.stringify({schema:live.configurationSchema??[
        {name:'docker_compose_custom_build_command',type:'text',maxLength:null},
        {name:'docker_compose_custom_start_command',type:'text',maxLength:null}]});
      if(options.input.includes('targetDeploymentsSinceIntent'))return JSON.stringify({activeDeployments:live.activeDeployments??0,targetDeploymentsSinceIntent:live.targetDeploymentsSinceIntent??0});
      return JSON.stringify({activeDeployments:live.activeDeployments??0});
    }
  };
  const input = { settings, state, backup: structuredClone(m.backup), github: { inspect: async () => ({ remoteBase: live.remote }) }, coolifyCredential: 'fixture-access' };
  const install = overrides => createInstalledComposeRelease(input, { ...deps, ...overrides });
  const operation = rollback => ({ operationId: randomUUID(), since: new Date(Date.now() - 5000).toISOString(), targetId: target.targetId, rollback });
  const queueFor = options => ({ targetId: target.targetId, deploymentId: coolifyGitSetDeploymentId({ releaseId: s.releaseId, operationId: options.operationId,
    targetId: target.targetId, rollback: options.rollback }), commit: options.rollback ? s.baseCommit : s.commit,
    status: 'finished', createdAt: options.since, finishedAt: new Date(Date.now() - 1000).toISOString() });
  const intentFor = options => { state.journal = [{ id: options.operationId, createdAt: options.since, operation: options.rollback ? 'rollback' : 'deploy',
    intent: { parameters: { targetId: target.targetId } } }]; };
  const configIntent = rollback => { const basis = rollback ? m.rollback : m.deployment; state.journal = [{ id: randomUUID(), createdAt: new Date().toISOString(),
    operation: rollback ? 'rollback_config' : 'deploy_config', intent: { parameters: { commit: rollback ? s.baseCommit : s.commit,
      artifactSetDigest: basis.artifactSetDigest, configDigest: basis.configDigest, schemaDigest: basis.schemaDigest } } }]; };
  configIntent(false);
  const rewritePolicy = (phase, mutate) => { mutate(policies[phase]); writeFileSync(phaseFiles[phase].policy.file, JSON.stringify(policies[phase])); phaseFiles[phase].policy.sha256 = hash(readFileSync(phaseFiles[phase].policy.file)); };
  const sealBaseline = () => { writeFileSync(baselineFile, JSON.stringify(baseline)); settings.baselineObservation.sha256 = hash(readFileSync(baselineFile)); };
  return { ...f, root, workspace, checkout, privateDir, settings, state, input, deps, live, calls, clock, baseline, ownership, policies,
    install, operation, queueFor, intentFor, configIntent, rewritePolicy, sealBaseline, inspectorOptions: () => inspectorOptions };
}

function optIn(x,{preexisting=false}={}){
 const policy={schemaVersion:'roost-retained-image-policy-v1',installationId:randomUUID(),scopeDigest:contract.releaseDigest(x.m),images:[...new Set(x.target.baseline.images.map(i=>i.imageDigest))].sort()},file=path.join(x.privateDir,'image-retention-policy.json');
 writeFileSync(file,JSON.stringify(policy));x.settings.imageRetention={policy:{file,sha256:hash(readFileSync(file))}};
 const images=new Map(policy.images.map(i=>[i,image(i)])),anchors=new Map();if(preexisting)for(const i of policy.images){const a=anchor(policy,i);anchors.set(a.Name.slice(1),a);}
 const original=x.deps.nativeProcess;const nativeProcess=async(binary,options)=>{const c=options.argv.at(-1);
  if(binary==='ssh'&&c.startsWith('docker image inspect')&&c.includes('{{json .}}')){x.calls.push({kind:'retention-read',command:c});const id=c.match(/sha256:[a-f0-9]{64}/)[0];if(!images.has(id))throw Error('missing immutable image');return JSON.stringify(images.get(id));}
  if(binary==='ssh'&&c.startsWith('docker container ls')){x.calls.push({kind:'retention-read',command:c});const n=c.match(/name=\^\/([^$]+)\$/)[1];return anchors.get(n)?.Id??'';}
  if(binary==='ssh'&&c.startsWith('docker container inspect')&&c.includes('{{json .}}')){x.calls.push({kind:'retention-read',command:c});const id=c.match(/[a-f0-9]{64}/)[0];return JSON.stringify([...anchors.values()].find(a=>a.Id===id));}
  if(binary==='ssh'&&c.startsWith("docker 'create'")){x.calls.push({kind:'retention-create',command:c});const args=[...c.matchAll(/'([^']*)'/g)].map(m=>m[1]),id=args.at(-1),a=anchor({...policy,images:[...images.keys()]},id);anchors.set(a.Name.slice(1),a);return a.Id;}
  return original(binary,options);};
 return{policy,file,images,anchors,nativeProcess,install:()=>x.install({nativeProcess})};
}
test('real installed opt-in requires existing baseline anchors READONLY before any artifact/queue/native mutation',async t=>{
 const x=installedFixture(t),o=optIn(x),installed=o.install();await assert.rejects(()=>installed.coolify.inspect(x.m,x.s),/retention_anchor_required/);
 assert.equal(x.calls.some(c=>c.kind==='retention-create'||c.kind==='queue'&&c.payload.operation==='dispatch'),false);
});
test('real configuration lifecycle retains exact baseline images only AFTER durable intent and BEFORE artifact stage/CAS',async t=>{
 const x=installedFixture(t),o=optIn(x),installed=o.install();x.live.phase='candidate';x.configIntent(true);await installed.coolify.configureRollback(x.m,x.s);
 const create=x.calls.findIndex(c=>c.kind==='retention-create'),stage=x.calls.findIndex(c=>c.kind==='native'&&c.input?.includes("$p['name']")),patch=x.calls.findIndex(c=>c.kind==='https'&&c.method==='PATCH');
 assert(create>=0&&stage>create&&patch>create);assert.equal(x.calls.filter(c=>c.kind==='retention-create').length,3);
 const record=JSON.parse(readFileSync(installed.imageRetention.journalFile));assert.equal(record.pending,null);assert.equal(Object.keys(record.anchors).length,3);assert(Object.values(record.anchors).every(a=>a.readbackVerified&&a.effect.operationId===x.state.journal.at(-1).id));
 const actual=await installed.resources.inspectImageRetention();assert.equal(actual.allStopped,true);assert.equal(actual.runtimeStarted,false);assert.equal(actual.deploymentOrHealthProof,false);
});
test('installed configuration rejects missing durable intent and never creates/starts anchors from a changed scope',async t=>{
 const x=installedFixture(t),o=optIn(x,{preexisting:true}),installed=o.install();x.state.journal=[];await assert.rejects(()=>installed.coolify.configureCandidate(x.m,x.s),e=>/phase_intent_unproven/.test(e.message)||/phase_intent_unproven/.test(e.cause?.message));assert.equal(x.calls.some(c=>c.kind==='retention-create'),false);
});
test('installed prequeue rechecks protection; successful config does not grandfather deleted anchors',async t=>{
 const x=installedFixture(t),o=optIn(x,{preexisting:true}),installed=o.install();await installed.coolify.configureCandidate(x.m,x.s);const options=x.operation(false);x.intentFor(options);o.anchors.clear();
 await assert.rejects(()=>installed.coolify.deploy(x.m,x.s,options),e=>/retention_anchor_required/.test(e.message)||/retention_anchor_required/.test(e.cause?.message));assert.equal(x.calls.some(c=>c.kind==='queue'&&c.payload.operation==='dispatch'),false);
});
test('installed finished candidate retains actual complete built-image set before returning deployment outcome',async t=>{
 const x=installedFixture(t),o=optIn(x,{preexisting:true}),installed=o.install();x.live.phase='candidate';const options=x.operation(false);x.intentFor(options);x.live.queue=x.queueFor(options);o.images.set(fixtureModule.image('f'),image(fixtureModule.image('f')));
 await assert.rejects(()=>installed.coolify.reconcileDeployment(x.m,x.s,options),/retention_anchor_required/);assert.equal(x.calls.filter(c=>c.kind==='retention-create').length,0);
 const actual=await installed.coolify.deploy(x.m,x.s,options);assert.equal(actual.state,'finished');assert.equal(x.calls.filter(c=>c.kind==='retention-create').length,1);const retained=installed.imageRetention.lastEvidence();assert.deepEqual(retained.additionalImages,[fixtureModule.image('f')]);assert.equal(retained.anchors.length,4);assert.equal(retained.runtimeStarted,false);
});
test('installed runtime reconciliation may query pending retention but cannot create anchors after deploy outcome',async t=>{
 const x=installedFixture(t),o=optIn(x,{preexisting:true}),installed=o.install();x.live.phase='candidate';const options=x.operation(false);x.intentFor(options);x.state.journal[0].outcome={status:'uncertain'};x.live.queue=x.queueFor(options);o.images.set(fixtureModule.image('f'),image(fixtureModule.image('f')));
 await assert.rejects(()=>installed.coolify.reconcileDeployment(x.m,x.s,options),/retention_anchor_required/);assert.equal(x.calls.some(c=>c.kind==='retention-create'),false);
});
test('installed legacy settings leave old behavior/wire intact without claiming anchor protection',async t=>{
 const x=installedFixture(t),installed=x.install();assert.equal(installed.imageRetention,undefined);const baseline=await installed.coolify.inspect(x.m,x.s);assert.equal(baseline.imageRetention,undefined);assert.equal(x.calls.some(c=>c.kind==='retention-create'),false);
});
test('returned installation inspector cannot forward an injected effect or unqualified extra image into anchor creation',async t=>{
 const x=installedFixture(t),o=optIn(x,{preexisting:true}),installed=o.install();const result=await installed.imageRetention.inspect({effect:{operationId:x.state.journal[0].id,operation:'deploy_config',since:x.state.journal[0].createdAt},additionalImages:[fixtureModule.image('f')]});
 assert.deepEqual(result.additionalImages,[]);assert.equal(x.calls.some(c=>c.kind==='retention-create'),false);assert.equal(x.calls.some(c=>c.kind==='retention-read'&&c.command.includes(fixtureModule.image('f'))),false);
});
