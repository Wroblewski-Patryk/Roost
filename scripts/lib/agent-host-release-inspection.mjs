// Worker-only qualification of normal completed release + immutable local custody.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import shared from './agent-host-release-inspection-contract.cjs';
import wire from './agent-host-release-contract.cjs';
import { qualifyCompatibleReleaseSnapshot } from './agent-host-release-broker.mjs';
import { releaseClientSchema } from './agent-host-release-client.mjs';
import { releaseRecoveryCandidate, qualifyReleaseWriterReclaim, releaseOwnerInstanceAbsent } from './agent-host-release-writer-recovery.mjs';
import {observeWindowsProcessIdentity} from './agent-host-process-identity.mjs';
import { guardHostContent } from './agent-host-redaction.mjs';
const handles = new WeakMap(), uuid = z.string().uuid(), hash = z.string().regex(/^[a-f0-9]{64}$/), sha = b => createHash('sha256').update(b).digest('hex'), same = (a, b) => wire.releaseDigest(a ?? null) === wire.releaseDigest(b ?? null), check = (v, c) => { if (!v)
    throw Error('release_inspection_' + c); };
const bindingSchema = z.object({ executionId: uuid, taskId: uuid, applicationId: uuid, hostId: uuid, releaseId: uuid, commit: z.string().regex(/^[a-f0-9]{40}$/), tree: z.string().regex(/^[a-f0-9]{40}$/), manifestDigest: hash, scopeDigest: hash, imageDigest: z.string().regex(/^sha256:[a-f0-9]{64}$/) }).strict();
const gitPhases=['push','pr','review','merge'],continuationPhases=['deploy_config','deploy','observe','smoke','fixture_cleanup','runtime_resume','cleanup'];
const summarySchema=z.object({operation:z.string(),evidenceDigest:hash,observedAt:z.string().datetime()}).strict();
export const inheritedReleasePublicationSchema=z.object({schemaVersion:z.literal('roost-governed-release-inherited-publication-v1'),
 releaseId:uuid,closureId:uuid,closureDigest:hash,nativeClosureDigest:hash,revocationId:uuid,closedAt:z.string().datetime(),
 parentManifestDigest:hash,journalDigest:hash,commit:z.string().regex(/^[a-f0-9]{40}$/),tree:z.string().regex(/^[a-f0-9]{40}$/),
 baseCommit:z.string().regex(/^[a-f0-9]{40}$/),baseTree:z.string().regex(/^[a-f0-9]{40}$/),pullRequestNumber:z.number().int().positive(),operationCount:z.literal(4),
 operationsSummary:z.array(z.object({operation:z.enum(gitPhases),operationId:uuid,outcomeId:uuid,intentDigest:hash,outcomeDigest:hash,evidenceDigest:hash,
  createdAt:z.string().datetime(),observedAt:z.string().datetime()}).strict()).length(4),
 claimBoundary:z.object({historicalOwnerClosure:z.literal(true),currentNativeCapability:z.literal(false),serverOsAttestation:z.literal(false)}).strict()
}).strict().superRefine((v,c)=>{const rows=v.operationsSummary;
 if(!same(rows.map(r=>r.operation),gitPhases)||new Set(rows.map(r=>r.operationId)).size!==4||new Set(rows.map(r=>r.outcomeId)).size!==4
  ||rows.some((r,i)=>Date.parse(r.observedAt)<Date.parse(r.createdAt)||Date.parse(r.observedAt)>Date.parse(v.closedAt)
   ||i>0&&Date.parse(r.createdAt)<Date.parse(rows[i-1].createdAt)))c.addIssue({code:z.ZodIssueCode.custom,message:'inherited_publication_order_or_clock'});
});
const legacyNormalSchema=z.object({contextObservedAt:z.string().datetime(),journalDigest:hash,operationCount:z.literal(11),operationsSummary:z.array(summarySchema).length(11)}).strict();
const continuationNormalSchema=z.object({contextObservedAt:z.string().datetime(),journalDigest:hash,operationCount:z.literal(7),
 operationsSummary:z.array(summarySchema).length(7),inheritedPublication:inheritedReleasePublicationSchema,effectiveOperationCount:z.literal(11),
 effectiveOperationsSummary:z.array(summarySchema.extend({provenance:z.enum(['inherited_publication','current_release']),releaseId:uuid}).strict()).length(11)
}).strict().superRefine((v,c)=>{const p=v.inheritedPublication,expected=[...p.operationsSummary.map(r=>({operation:r.operation,evidenceDigest:r.evidenceDigest,observedAt:r.observedAt,provenance:'inherited_publication',releaseId:p.releaseId})),
 ...v.operationsSummary.map(r=>({...r,provenance:'current_release',releaseId:v.effectiveOperationsSummary[4]?.releaseId}))];
 if(!same(v.operationsSummary.map(r=>r.operation),continuationPhases)||!same(v.effectiveOperationsSummary,expected)
  ||Date.parse(p.closedAt)>Date.parse(v.contextObservedAt))c.addIssue({code:z.ZodIssueCode.custom,message:'continuation_summary_provenance'});
});
// Canonical journal evidence, never a caller declaration or a Root summary.
// Optional only for existing v1 receipts: newly qualified delivery always has it.
const phaseEvidence = kind => wire.postObservationEvidenceSchema.refine(value => value.kind === kind);
export const releaseDeliveryDetailSchema = z.object({ smoke: phaseEvidence('smoke'),
    fixtureCleanup: phaseEvidence('fixture_cleanup'), runtimeResume: phaseEvidence('runtime_resume') }).strict().superRefine((details, context) => {
    const { smoke, fixtureCleanup: cleanup, runtimeResume: resume } = details;
    if (smoke.kind !== 'smoke' || cleanup.kind !== 'fixture_cleanup' || resume.kind !== 'runtime_resume') {
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'release_delivery_detail_kind' }); return;
    }
    const names = resume.cadences.map(c => c.name);
    if (new Set(names).size !== names.length || resume.cadenceEvidence.length !== names.length
        || resume.cadences.some(c => resume.cadenceEvidence.filter(e => e.name === c.name
            && e.behaviorDigest === c.behaviorDigest && e.behaviorVerified === true && e.completedTicks > 0).length !== 1)
        || ['postObservationDigest', 'fixtureDigest', 'controllerDigest', 'targetId', 'commit', 'tree'].some(k => smoke[k] !== cleanup[k] || smoke[k] !== resume[k])
        || smoke.schemaDigest !== cleanup.schemaDigest || smoke.schemaDigest !== resume.schemaDigest
        || smoke.nonOwnedDataDigest !== cleanup.dataDigest || smoke.sequenceDigest !== cleanup.sequenceDigest)
        context.addIssue({ code: z.ZodIssueCode.custom, message: 'release_delivery_details_changed' });
});
export const releaseDeliveryEvidenceSchema = z.object({ schemaVersion: z.literal('roost-governed-release-delivery-evidence-v1'), binding: bindingSchema,
    normal: z.union([legacyNormalSchema,continuationNormalSchema]),
    native: z.object({ archiveDigest: hash, checkpointDigest: hash, registeredChildCount: z.number().int().positive(), currentOsObservedAt: z.string().datetime(), closedChildren: z.literal(true) }).strict(),
    monitor: z.object({ digest: hash, samples: z.number().int().positive(), firstAt: z.string().datetime(), lastAt: z.string().datetime(), maxGapMilliseconds: z.number().int().min(0).max(30000) }).strict(),
    postObservation: z.object({ observationSeconds: z.number().int().min(1200), restoredActivitySeconds: z.number().int().min(300), fixtureAbsent: z.literal(true), nonOwnedDataDigest: hash, sequenceDigest: hash, databaseSettingsDigest: hash, ingressSettingsDigest: hash, details: releaseDeliveryDetailSchema.optional() }).strict(),
    claimBoundary: z.object({ rootSupervised: z.literal(true), autonomousDaemon: z.literal(false), serverOsAttestation: z.literal(false), modelAuthority: z.literal(false) }).strict() }).strict().superRefine((value, context) => {
        const p = value.postObservation, d = p.details;
        if(value.normal.operationCount===7&&(!d||value.normal.inheritedPublication.releaseId===value.binding.releaseId
         ||value.normal.inheritedPublication.commit!==value.binding.commit||value.normal.inheritedPublication.tree!==value.binding.tree
         ||value.normal.effectiveOperationsSummary.slice(4).some(r=>r.releaseId!==value.binding.releaseId)))
            context.addIssue({code:z.ZodIssueCode.custom,message:'continuation_binding_or_details_required'});
        if (d && (['smoke', 'fixtureCleanup', 'runtimeResume'].some(k => d[k].commit !== value.binding.commit || d[k].tree !== value.binding.tree)
            || d.smoke.backendCommit !== value.binding.commit || d.smoke.frontendCommit !== value.binding.commit
            || d.runtimeResume.backendCommit !== value.binding.commit || d.runtimeResume.frontendCommit !== value.binding.commit
            || d.fixtureCleanup.dataDigest !== p.nonOwnedDataDigest || d.fixtureCleanup.sequenceDigest !== p.sequenceDigest
            || d.runtimeResume.databaseSettingsDigest !== p.databaseSettingsDigest || d.runtimeResume.ingressSettingsDigest !== p.ingressSettingsDigest
            || d.runtimeResume.observationSeconds !== p.restoredActivitySeconds))
            context.addIssue({ code: z.ZodIssueCode.custom, path: ['postObservation', 'details'], message: 'release_delivery_details_binding_invalid' });
        if (Buffer.byteLength(JSON.stringify(value)) > 32768)
            context.addIssue({ code: z.ZodIssueCode.custom, message: 'release_delivery_evidence_size' });
    });
function fresh(at, now, max = 300000) { const age = now - Date.parse(at); check(Number.isFinite(age) && age >= 0 && age <= max, 'context_stale'); }
function safeRelativeRoot(root, file) { const rel = path.relative(path.resolve(root), path.resolve(file)); return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel); }
export function readReleaseInspectionSource(file, max = 4194304) { const before = fs.lstatSync(file), resolved = fs.realpathSync.native(file); check(before.isFile() && !before.isSymbolicLink() && before.nlink === 1 && before.size > 0 && before.size <= max && path.resolve(resolved).toLowerCase() === path.resolve(file).toLowerCase(), 'physical_source'); const bytes = fs.readFileSync(file), after = fs.lstatSync(file); check(bytes.length === before.size && before.dev === after.dev && before.ino === after.ino && before.size === after.size && before.mtimeMs === after.mtimeMs && before.ctimeMs === after.ctimeMs, 'source_changed'); return { bytes, reference: { file, sha256: sha(bytes), bytes: bytes.length, regularFile: true, nlink: 1, physicalIdentityDigest: wire.releaseDigest({ resolved, device: before.dev, inode: before.ino }) } }; }
function sealed(ref) { const source = readReleaseInspectionSource(ref.file); check(same(source.reference, ref), 'source_cas'); return source; }
function json(source) { return JSON.parse(source.bytes); }
export function qualifyReleaseInspectionIdentity({ claimed, contract, normalContext }) { const inspection = shared.releaseInspectionSchema.parse(contract?.nativeBoundary?.releaseInspection), selection = shared.releaseVerificationSelectionSchema.parse(claimed?.metadata?.releaseVerification); check(contract.nativeBoundary.profile === 'inspect-readonly' && contract.nativeBoundary.inspectReadOnly?.kind === 'auditor' && contract.access.externalWrites === false && same(contract.access.tools, ['repository_read']) && same(contract.access.permissions, ['repository_read']) && contract.access.sandbox === 'read-only', 'readonly_auditor_required'); check(normalContext?.schemaVersion === 'roost-governed-release-inspection-context-v1' && normalContext.executionId === claimed.id && normalContext.taskId === claimed.taskId && normalContext.applicationId === claimed.applicationId && normalContext.agentHostId === claimed.agentHostId && contract.singleTask.applicationId === claimed.applicationId && normalContext.release?.release?.id === selection.releaseId, 'claim_context_identity'); return { inspection, selection }; }
export function qualifyRootMonitor(bytes, state, now = Date.now()) { check(Buffer.isBuffer(bytes) && bytes.length > 0 && bytes.length <= 4194304, 'monitor_bound'); const lines = bytes.toString('utf8').trim().split(/\r?\n/); check(lines.length >= 3 && lines.length <= 5000, 'monitor_rows'); const rows = lines.map(line => JSON.parse(line)), observe = state.journal.find(x => x.operation === 'observe'), resume = state.journal.find(x => x.operation === 'runtime_resume'), begin = Date.parse(observe.createdAt), end = Date.parse(resume.outcome.evidence.observedAt), selected = rows.filter(x => Date.parse(x.observedAt ?? x.at) >= begin - 30000); let previous = null, maxGap = 0; check(selected.length >= 3, 'monitor_coverage'); for (const row of selected) {
    const at = Date.parse(row.observedAt ?? row.at), declared = row.rootSupervisionSeconds ?? row.rootSupervisedMonitoringSeconds ?? (row.rootSupervisedPollMilliseconds / 1000);
    check(row.schemaVersion === 'roost-private-new-candidate-worker-status-v1' && row.releaseId === state.release.id && row.manifestDigest === state.release.manifestDigest && declared === 30 && row.autonomousDaemonClaimed === false && row.externalNotificationProven === false && Number.isFinite(at) && at <= now && hash.safeParse(row.journalDigest).success && Array.isArray(row.operations), 'monitor_identity');
    if (previous !== null) {
        const gap = at - previous;
        check(gap > 0 && gap <= 30000, 'monitor_gap');
        maxGap = Math.max(maxGap, gap);
    }
    previous = at;
} const first = Date.parse(selected[0].observedAt ?? selected[0].at), last = selected.at(-1); check(first <= begin + 30000 && Date.parse(last.observedAt ?? last.at) >= end && last.status === 'completed' && last.journalDigest === wire.releaseDigest(state.journal), 'monitor_incomplete'); return { digest: sha(bytes), samples: rows.length, firstAt: new Date(first).toISOString(), lastAt: new Date(Date.parse(last.observedAt ?? last.at)).toISOString(), maxGapMilliseconds: maxGap }; }
export function qualifyDetailedReleaseOutcomes(state, inspection) { const body = state.release.snapshot, m = body.manifest, row = op => state.journal.find(x => x.operation === op), ev = op => row(op).outcome.evidence, smoke = ev('smoke').postObservation, cleanup = ev('fixture_cleanup').postObservation, resume = ev('runtime_resume').postObservation; check(smoke.kind === 'smoke' && smoke.emptyActivityCount === 0 && smoke.populatedActivityCount === 1 && smoke.negativePathStatus === 401 && smoke.backendCommit === inspection.commit && smoke.frontendCommit === inspection.commit && smoke.memoryId === m.postObservation.fixture.memoryId && smoke.renderedEventId === m.postObservation.fixture.eventId && smoke.renderedSummaryDigest === m.postObservation.fixture.summaryDigest && same(smoke.fixtureRows, { authUsers: 1, authSessions: 1, recentMemory: 1 }) && smoke.providerRequests === 0 && smoke.externalActions === 0 && smoke.noUnownedChanges === true, 'actual_fixture_smoke'); check(cleanup.kind === 'fixture_cleanup' && cleanup.fixtureAbsent === true && cleanup.authAbsent === true && cleanup.eventAbsent === true && cleanup.databaseReadOnly === true && cleanup.activeOtherSessions === 0 && cleanup.dataDigest === m.baseline.dataDigest && cleanup.schemaDigest === m.baseline.schemaDigest && cleanup.sequenceDigest === m.postObservation.baselineSequenceDigest && cleanup.providerRequests === 0 && cleanup.externalActions === 0, 'actual_fixture_parity'); check(resume.kind === 'runtime_resume' && resume.backendCommit === inspection.commit && resume.frontendCommit === inspection.commit && resume.observationSeconds >= inspection.minimumRestoredActivitySeconds && resume.fixtureAbsent === true && resume.healthy === true && resume.databaseSettingsDigest === m.postObservation.runtimeResume.databaseSettingsDigest && resume.ingressSettingsDigest === m.postObservation.runtimeResume.ingressSettingsDigest && same(resume.cadences, m.postObservation.runtimeResume.cadences) && resume.cadenceEvidence.length === resume.cadences.length && resume.cadences.every(c => resume.cadenceEvidence.filter(e => e.name === c.name && e.behaviorDigest === c.behaviorDigest && e.behaviorVerified === true && e.completedTicks > 0).length === 1), 'actual_restored_cadences'); const details = releaseDeliveryDetailSchema.parse({ smoke, fixtureCleanup: cleanup, runtimeResume: resume }); check([smoke, cleanup, resume].every(e => e.postObservationDigest === wire.releaseDigest(m.postObservation) && e.fixtureDigest === wire.releaseDigest(m.postObservation.fixture) && e.controllerDigest === m.postObservation.controllerDigest && e.commit === inspection.commit && e.tree === inspection.tree && e.targetId === m.deployment.targetId), 'actual_detail_manifest_binding'); return { observationSeconds: ev('observe').observationSeconds, restoredActivitySeconds: resume.observationSeconds, fixtureAbsent: true, nonOwnedDataDigest: cleanup.dataDigest, sequenceDigest: cleanup.sequenceDigest, databaseSettingsDigest: resume.databaseSettingsDigest, ingressSettingsDigest: resume.ingressSettingsDigest, details }; }
function qualifyCustodyDescriptor(source, { selection, installation, state }) { const expected = path.resolve(installation.stateDirectory, 'release-inspection-' + selection.custodyEvidenceId + '.json'); check(path.resolve(source.reference.file).toLowerCase() === expected.toLowerCase() && same(readReleaseInspectionSource(expected).reference, source.reference), 'owned_custody_selection'); const descriptor = json(source); check(descriptor.schemaVersion === 'roost-release-inspection-custody-v1' && descriptor.custodyEvidenceId === selection.custodyEvidenceId && descriptor.installationId === installation.installationId && descriptor.releaseId === selection.releaseId && descriptor.journalDigest === wire.releaseDigest(state.journal) && same(Object.keys(descriptor.sources).sort(), ['closedWriter', 'monitor', 'releaseClient', 'rootQualification', 'run'].sort()), 'custody_binding'); return descriptor; }
export function closedReleaseControllerIdentity({runSource,closureSource,archiveReference,state,now=Date.now()}) {
    const run=json(runSource),root=json(closureSource);
    check(root.schemaVersion==='roost-private-new-candidate-worker-closure-v1'&&root.status==='completed'
      &&root.releaseId===state.release.id&&same(root.archiveReference,archiveReference)&&same(root.runReference,runSource.reference)
      &&root.journalDigest===wire.releaseDigest(state.journal),'root_qualification_original_refs');
    check(run.schemaVersion==='roost-private-new-candidate-worker-run-v1'&&run.phase==='official_worker_closed'&&run.code===0
      &&run.releaseId===state.release.id&&run.controllerIdentity?.pid===run.controllerPid
      &&Number.isFinite(Date.parse(run.closedAt))&&Date.parse(run.closedAt)<=Date.parse(root.observedAt)
      &&Date.parse(root.observedAt)<=now,'official_controller_closed_record');
    return run.controllerIdentity;
}
function actualNativeQualification(state,sources,installation) {
    const writerDirectory=path.resolve(process.env.ProgramData??'C:/ProgramData','Roost'),archive=json(sources.closedWriter),cp=archive.releaseCheckpoint,client=json(sources.releaseClient);
    releaseClientSchema.parse(client);
    check(path.resolve(sources.closedWriter.reference.file).toLowerCase()===path.resolve(writerDirectory,'release-writer-closed-'+cp.contextNonce+'.json').toLowerCase()
      &&cp.phase==='all_local_children_closed'&&cp.registeredChildCount>0&&cp.binding.journalCount===state.journal.length,'complete_closed_writer_archive');
    const result=qualifyReleaseWriterReclaim(archive,releaseRecoveryCandidate(state,client),writerDirectory);
    check(!result.preflightQuiescence&&result.journalCount===state.journal.length,'normal_closed_writer_qualification');
    const controller=closedReleaseControllerIdentity({runSource:sources.run,closureSource:sources.rootQualification,archiveReference:sources.closedWriter.reference,state});
    check(releaseOwnerInstanceAbsent(controller,observeWindowsProcessIdentity(controller.pid)),'official_controller_instance_present');
    return {archiveDigest:sources.closedWriter.reference.sha256,checkpointDigest:wire.releaseDigest(cp),registeredChildCount:cp.registeredChildCount,currentOsObservedAt:new Date().toISOString(),closedChildren:true};
}
export function loadReleaseInspectionCustody(custodyEvidenceId, { stateDirectory }) { uuid.parse(custodyEvidenceId); check(typeof stateDirectory === 'string' && stateDirectory.length > 0, 'state_directory_required'); return readReleaseInspectionSource(path.join(path.resolve(stateDirectory), 'release-inspection-' + custodyEvidenceId + '.json')); }
export function projectQualifiedReleaseNormal(state,observedAt,facts){const summary=state.journal.map(r=>({operation:r.operation,evidenceDigest:wire.releaseDigest(r.outcome.evidence),observedAt:r.outcome.evidence.observedAt}));
 const normal={contextObservedAt:observedAt,journalDigest:facts.journalDigest,operationCount:facts.ownPhaseCount,operationsSummary:summary};
 if(facts.inheritedPublication){normal.inheritedPublication=facts.inheritedPublication;normal.effectiveOperationCount=11;
  normal.effectiveOperationsSummary=[...facts.inheritedPublication.operationsSummary.map(r=>({operation:r.operation,evidenceDigest:r.evidenceDigest,observedAt:r.observedAt,
   provenance:'inherited_publication',releaseId:facts.inheritedPublication.releaseId})),...summary.map(r=>({...r,provenance:'current_release',releaseId:state.release.id}))];}
 return z.union([legacyNormalSchema,continuationNormalSchema]).parse(normal);
}
export async function prepareVerifiedReleaseDelivery({ claimed, contract, normalContext, custodyLookup, installation }) { const backend=(await import('../../dist/modules/agent-runtime/governed-release-contract.js')).default; const { inspection, selection } = qualifyReleaseInspectionIdentity({ claimed, contract, normalContext }), clock = Date.now(); fresh(normalContext.observedAt, clock); check(uuid.safeParse(installation?.installationId).success && typeof installation.stateDirectory === 'string' && typeof custodyLookup === 'function', 'installation_required'); const facts = shared.assertCompletedReleaseInspection(normalContext.release, { inspection, applicationId: claimed.applicationId, hostId: claimed.agentHostId, agentId: contract.assignment.agentId, now: clock, validateOutcome: backend.releaseOutcomeError, qualifyStoredSnapshot: qualifyCompatibleReleaseSnapshot,publicationState:normalContext.historicalPublication }); const source = await custodyLookup(selection.custodyEvidenceId, { stateDirectory: installation.stateDirectory }), descriptor = qualifyCustodyDescriptor(source, { selection, installation, state: normalContext.release }), sources = Object.fromEntries(Object.entries(descriptor.sources).map(([k, r]) => [k, sealed(r)])); for (const [name, s] of Object.entries(sources))
    check(name === 'closedWriter' || safeRelativeRoot(installation.stateDirectory, s.reference.file), 'owned_root_proof_source'); const monitor = qualifyRootMonitor(sources.monitor.bytes, normalContext.release, clock), postObservation = qualifyDetailedReleaseOutcomes(normalContext.release, inspection), native = actualNativeQualification(normalContext.release, sources, installation), value = releaseDeliveryEvidenceSchema.parse({ schemaVersion: 'roost-governed-release-delivery-evidence-v1', binding: { executionId: claimed.id, taskId: claimed.taskId, applicationId: claimed.applicationId, hostId: claimed.agentHostId, releaseId: selection.releaseId, commit: inspection.commit, tree: inspection.tree, manifestDigest: inspection.manifestDigest, scopeDigest: inspection.scopeDigest, imageDigest: inspection.imageDigest }, normal:projectQualifiedReleaseNormal(normalContext.release,normalContext.observedAt,facts), native, monitor, postObservation, claimBoundary: { rootSupervised: true, autonomousDaemon: false, serverOsAttestation: false, modelAuthority: false } }); guardHostContent(value, 'required'); check(Buffer.byteLength(JSON.stringify(value)) <= 32768, 'evidence_size'); const handle = Object.freeze({ schemaVersion: 'roost-worker-release-delivery-handle-v1', digest: wire.releaseDigest(value) }); handles.set(handle, { value, claimedIdentity: { executionId: claimed.id, taskId: claimed.taskId, applicationId: claimed.applicationId, hostId: claimed.agentHostId }, contractDigest: wire.releaseDigest(contract), normalContext: structuredClone(normalContext), installation: structuredClone(installation), source: { bytes: Buffer.from(source.bytes), reference: structuredClone(source.reference) }, sources, observedAt: Date.now() }); return handle; }
export function assertVerifiedReleaseDelivery(handle, { claimed, contract }) { const q = handles.get(handle); check(q && same(q.claimedIdentity, { executionId: claimed.id, taskId: claimed.taskId, applicationId: claimed.applicationId, hostId: claimed.agentHostId }) && q.contractDigest === wire.releaseDigest(contract) && wire.releaseDigest(q.value) === handle.digest, 'genuine_bound_handle'); fresh(q.normalContext.observedAt, Date.now()); for (const s of [q.source, ...Object.values(q.sources)])
    sealed(s.reference); actualNativeQualification(q.normalContext.release, q.sources, q.installation); return true; }
export function projectVerifiedReleaseDelivery(handle, { claimed, contract }) { assertVerifiedReleaseDelivery(handle, { claimed, contract }); return structuredClone(handles.get(handle).value); }
