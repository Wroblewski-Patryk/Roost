import type { Prisma } from '@prisma/client';
import { applicationOperation, currentApprovedOutcome, type OperationFacts } from './application-operation';
import { applicationBaseline } from './application-takeover-contract';
import { validateApplicationTakeoverBaseline } from './application-takeover-validation';
import { nativeBoundaryResultBlocked, exactReviewCommit, object } from '../agent-runtime/task-review-contract';
import { effectiveCompletedResult, effectiveRejectedResultForDisposition } from '../agent-runtime/completed-result-basis';
import { effectiveOutcome, releaseManifestSchema, releaseIntentSchema, releaseOutcomeSchema, releaseIntentError, releaseOutcomeError } from '../agent-runtime/governed-release-contract';

type Db = Prisma.TransactionClient;
const iso = (value: Date | string) => new Date(value).toISOString();
const uuid = /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i;

function currentTaskContract(task: any) {
  const ready = object(object(task.executionReadiness).contract);
  return Object.keys(ready).length ? ready : object(object(task.agentExecutions[0]?.metadata).executionContract);
}

// Same completed/effective pin and executor binding as normal reviewState.
// The effective envelope comes from the runtime's database predicate, never a
// projection-created revalidation. Rejection disposition cannot approve work.
export async function applicationReviewCurrent(db: Db, workspaceId: string, task: any, execution: any, review: any, material: any) {
  if (!execution || !review || review.executionId !== execution.id || execution.status !== 'completed'
    || !execution.completedAt || execution.contextInvalidatedAt || review.materialVersion !== material?.version) return false;
  const result = object(material?.body), contract = object(result.contract), pin = object(task.executionReadiness);
  const effective = pin.pinId !== result.pin?.pinId ? await effectiveCompletedResult(db, workspaceId, execution) : execution;
  const matches = (candidate: any) => {
    const effectivePin = object(object(candidate?.metadata).readyContextPin);
    return Boolean(result.pin?.pinId && pin.pinId === effectivePin.pinId && pin.revision === effectivePin.revision
      && task.assignedWorkforceEntityId === contract.assignment?.agentId);
  };
  const current = matches(effective);
  if (review.decision === 'approve') {
    const commit = exactReviewCommit(result, execution);
    return Boolean(current && commit && object(review.evidence).reviewedCommit === commit);
  }
  if (review.decision !== 'reject') return false;
  if (current) return true;
  if (review.action) return false;
  const disposition = await effectiveRejectedResultForDisposition(db, workspaceId, execution);
  return disposition !== execution && matches(disposition);
}

// A cleanup also completes a recovered rollback. Only a complete native
// candidate journal proves a successful release, using the same typed intent
// and outcome validators as the release API.
export function applicationReleaseCertified(release: any, journal: any[], revoked: boolean, failed: boolean): boolean {
  try {
    if (revoked || failed || !Array.isArray(journal) || !journal.length || journal.length > 200
      || !releaseManifestSchema.safeParse(release.snapshot?.manifest).success
      || !/^[a-f0-9]{40}$/.test(release.snapshot?.commit ?? '')) return false;
    const previous: any[] = [];
    for (const operation of journal) {
      const outcome = operation.outcome;
      if (!outcome || !['succeeded', 'failed', 'absent'].includes(effectiveOutcome(outcome) ?? '')
        || operation.operation.startsWith('rollback') || operation.intent?.parameters?.mode === 'rollback') return false;
      const intent = releaseIntentSchema.safeParse(operation.intent);
      const result = releaseOutcomeSchema.safeParse({ requestId: outcome.request_id ?? outcome.requestId,
        status: outcome.status, reconciledStatus: outcome.reconciled_status ?? outcome.reconciledStatus,
        observationOnly: outcome.observation_only ?? outcome.observationOnly, evidence: outcome.evidence });
      if (!intent.success || intent.data.operation !== operation.operation || !result.success
        || releaseIntentError(release, intent.data, previous) || releaseOutcomeError(release, operation, result.data, previous)
        || ['deploy', 'observe'].includes(operation.operation) && effectiveOutcome(outcome) === 'failed') return false;
      previous.push(operation);
    }
    const last = journal.at(-1), observation = journal.filter(o => o.operation === 'observe').at(-1);
    return last.operation === 'cleanup' && effectiveOutcome(last.outcome) === 'succeeded'
      && observation?.intent.parameters.mode === 'candidate' && effectiveOutcome(observation.outcome) === 'succeeded';
  } catch { return false; }
}

export async function loadApplicationOperation(db: Db, workspaceId: string, applicationId: string) {
  const scopes = await db.taskRiskScope.findMany({ where: { workspaceId, applicationId },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 101, select: { taskId: true } });
  const taskIds = [...new Set(scopes.slice(0, 100).map(scope => scope.taskId))];
  const tasks = await db.task.findMany({ where: { workspaceId, id: { in: taskIds } }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], take: 101,
    include: { assignedWorkforceEntity: { select: { id: true, name: true, role: true } },
      agentExecutions: { where: { applicationId }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1,
        include: { reviewDecisions: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 1, include: { action: true } } } } } });
  const decisions = await db.$queryRaw<any[]>`SELECT d.id,d.title,r.body,decision_state(d.id) AS state,a.created_at AS accepted_at
    FROM decisions d JOIN decision_revisions r ON r.decision_id=d.id
    LEFT JOIN decision_acceptances a ON a.decision_id=d.id
    WHERE d.workspace_id=${workspaceId}::uuid AND NOT EXISTS(SELECT 1 FROM decisions s JOIN decision_acceptances sa ON sa.decision_id=s.id WHERE s.supersedes_id=d.id)
    AND (r.body->'applicationBaseline'->>'applicationId'=${applicationId}
      OR EXISTS(SELECT 1 FROM jsonb_array_elements(r.body->'scope') n WHERE
        n->>'type'='application' AND n->>'id'=${applicationId}
        OR n->>'type'='task' AND n->>'id'=ANY(${taskIds}::text[])))
    ORDER BY r.created_at DESC,d.id DESC LIMIT 101`;
  const ownerId = (await db.workspace.findUnique({ where: { id: workspaceId }, select: { ownerUserId: true } }))?.ownerUserId;
  let baseline: OperationFacts['baseline'] = null;
  for (const row of decisions) {
    if (row.state !== 'accepted' || !row.accepted_at || !row.body.applicationBaseline) continue;
    const parsed = applicationBaseline.safeParse(row.body.applicationBaseline);
    if (!parsed.success || parsed.data.applicationId !== applicationId) continue;
    const accepted = (await db.$queryRaw<any[]>`SELECT 1 FROM decision_acceptances WHERE decision_id=${row.id}::uuid
      AND actor_user_id=${ownerId ?? null}::uuid AND actor_agent_id IS NULL`)[0];
    if (!accepted) continue;
    baseline = { id: row.id, acceptedAt: iso(row.accepted_at), body: parsed.data,
      current: !('error' in await validateApplicationTakeoverBaseline(db, workspaceId, parsed.data)) };
    break;
  }
  const releases = await db.$queryRaw<any[]>`SELECT r.id,r.snapshot,r.manifest_digest,r.created_at,
    EXISTS(SELECT 1 FROM governed_release_revocations v WHERE v.release_id=r.id) AS revoked,
    EXISTS(SELECT 1 FROM governed_release_failed_closures f WHERE f.release_id=r.id) AS failed
    FROM governed_releases r
    WHERE r.workspace_id=${workspaceId}::uuid AND r.application_id=${applicationId}::uuid ORDER BY r.created_at DESC,r.id DESC LIMIT 51`;
  const releaseIds = releases.slice(0, 50).map(r => r.id);
  const journalRows = releaseIds.length ? await db.$queryRaw<any[]>`SELECT r.id AS release_id,
    COALESCE(jsonb_agg(to_jsonb(j) ORDER BY j.sequence) FILTER(WHERE j.id IS NOT NULL),'[]'::jsonb) AS journal
    FROM governed_releases r LEFT JOIN LATERAL(SELECT o.*,
      (SELECT to_jsonb(x) FROM governed_release_outcomes x WHERE x.operation_id=o.id ORDER BY x.sequence DESC LIMIT 1) AS outcome
      FROM governed_release_operations o WHERE o.release_id=r.id ORDER BY o.sequence LIMIT 201)j ON true
    WHERE r.workspace_id=${workspaceId}::uuid AND r.application_id=${applicationId}::uuid AND r.id=ANY(${releaseIds}::uuid[])
    GROUP BY r.id` : [];
  const journals = new Map(journalRows.map(row => [row.release_id, row.journal as any[]]));
  const executionIds = tasks.slice(0, 100).flatMap(task => task.agentExecutions[0] ? [task.agentExecutions[0].id] : []);
  const materials = executionIds.length ? await db.$queryRaw<any[]>`SELECT e.id,task_review_material(e) AS body,
    encode(sha256(convert_to(task_review_material(e)::text,'UTF8')),'hex') AS version FROM agent_executions e
    WHERE e.workspace_id=${workspaceId}::uuid AND e.application_id=${applicationId}::uuid AND e.id=ANY(${executionIds}::uuid[])` : [];
  const materialById = new Map(materials.map(m => [m.id, m]));
  const managerIds = [...new Set(tasks.slice(0, 100).map(task => currentTaskContract(task).taskRoles?.accountableManager?.id)
    .filter((id): id is string => typeof id === 'string' && uuid.test(id)))];
  const managers = managerIds.length ? await db.workforceEntity.findMany({ where: { id: { in: managerIds }, workspaceId },
    select: { id: true, role: true, name: true } }) : [];
  const managerById = new Map(managers.map(m => [m.id, m]));
  const taskFacts: OperationFacts['tasks'] = [];
  for (const task of tasks.slice(0, 100)) {
    const execution = task.agentExecutions[0], metadata = object(execution?.metadata), contract = object(metadata.executionContract), review = execution?.reviewDecisions[0];
    const roles = currentTaskContract(task).taskRoles, managerId = roles?.accountableManager?.id;
    const manager = managerId ? managerById.get(managerId) : null;
    const material = execution ? materialById.get(execution.id) : null;
    const reviewedCommit = exactReviewCommit(material?.body, execution);
    const reviewCurrent = await applicationReviewCurrent(db, workspaceId, task, execution, review, material);
    const accountable = manager ?? (roles ? null : task.assignedWorkforceEntity);
    taskFacts.push({ id: task.id, title: task.title, status: task.status, readiness: String(object(task.executionReadiness).status ?? 'draft'),
      readinessReason: typeof object(task.executionReadiness).reason === 'string' ? object(task.executionReadiness).reason : null,
      readinessInvalidatedAt: typeof object(task.executionReadiness).invalidatedAt === 'string' ? object(task.executionReadiness).invalidatedAt : null,
      accountable: accountable ? { id: accountable.id, role: accountable.role ?? 'unassigned', label: accountable.name } : null,
      latestExecution: execution ? { id: execution.id, status: execution.status, invalidated: Boolean(execution.contextInvalidatedAt),
        executorAgentId: contract.assignment?.agentId ?? null,
        nativeVerified: !nativeBoundaryResultBlocked(execution.verification, contract) && object(execution.verification).managedAdmission?.qualification === 'signed_native_v1' } : null,
      review: review ? { id: review.id, executionId: review.executionId, decision: review.decision, commit: reviewedCommit,
        at: iso(review.createdAt), current: reviewCurrent, reviewerAgentId: review.actorAgentId ?? null } : null });
  }
  for (const raw of tasks.slice(0, 100)) {
    const execution = raw.agentExecutions[0], fact = taskFacts.find(t => t.id === raw.id);
    const inspection = object(object(object(execution?.metadata).executionContract).nativeBoundary).inspectReadOnly;
    const target = taskFacts.find(t => t.id === inspection?.verifiedTaskId);
    if (fact && target && completedCodeReviewTarget(fact, execution, target,
      materialById.get(target.latestExecution?.id ?? '')?.version)) fact.completedReviewOfTaskId = target.id;
  }
  return applicationOperation({ applicationId, baseline, tasks: taskFacts,
    decisions: decisions.slice(0, 100).map(row => ({ id: row.id, title: row.title, state: row.state,
      taskIds: Array.isArray(row.body.scope) ? row.body.scope.filter((node: any) => node.type === 'task' && taskIds.includes(node.id)).map((node: any) => node.id) : [] })),
    releases: releases.slice(0, 50).filter(row => /^[a-f0-9]{40}$/.test(row.snapshot?.commit ?? '')).map(row => {
      const journal = journals.get(row.id) ?? [];
      return { id: row.id, commit: row.snapshot.commit, at: iso(journal.at(-1)?.outcome?.created_at ?? row.created_at),
        certified: applicationReleaseCertified(row, journal, row.revoked, row.failed), failed: row.failed };
    }),
    truncated: scopes.length > 100 || tasks.length > 100 || decisions.length > 100 || releases.length > 50
      || journalRows.some(row => !Array.isArray(row.journal) || row.journal.length > 200) });
}

// This relationship is display-only; it never closes tasks or grants authority.
export function completedCodeReviewTarget(helper: OperationFacts['tasks'][number], execution: any,
  target: OperationFacts['tasks'][number], materialVersion: string | undefined): boolean {
  const boundary = object(object(execution?.metadata).executionContract).nativeBoundary;
  const reviewerId = object(object(execution?.metadata).executionContract).assignment?.agentId;
  const inspection = boundary?.inspectReadOnly, verification = object(execution?.verification);
  const receipt = verification.codeReviewDecision, audit = verification.readOnlyAudit, job = verification.ownedTreeReceipt;
  return Boolean(helper.id !== target.id && helper.latestExecution && helper.latestExecution.id === execution?.id
    && execution.status === 'completed' && execution.completedAt && !execution.contextInvalidatedAt
    && Array.isArray(execution.changedFiles) && execution.changedFiles.length === 0
    && helper.status !== 'blocked' && helper.readiness === 'ready'
    && helper.latestExecution.status === 'completed' && helper.latestExecution.nativeVerified && !helper.latestExecution.invalidated
    && boundary?.profile === 'inspect-readonly' && inspection?.kind === 'code-reviewer' && currentApprovedOutcome(target)
    && inspection.verifiedTaskId === target.id && inspection.verifiedExecutionId === target.latestExecution?.id
    && inspection.reviewedCommit === target.review?.commit && receipt?.id === target.review?.id
    && receipt?.decision === 'approve' && receipt.executionId === target.latestExecution?.id
    && receipt.reviewedCommit === target.review?.commit && materialVersion && receipt.materialVersion === materialVersion
    && reviewerId && receipt.reviewerAgentId === reviewerId && target.review?.reviewerAgentId === reviewerId
    && target.latestExecution?.executorAgentId && reviewerId !== target.latestExecution.executorAgentId
    && audit?.verdict === 'verified' && audit.verifiedTaskId === target.id && audit.verifiedExecutionId === target.latestExecution?.id
    && audit.reviewedCommit === target.review?.commit && /^[a-f0-9]{64}$/.test(audit.preTree) && audit.preTree === audit.postTree
    && /^[a-f0-9]{64}$/.test(materialVersion) && audit.verifiedEvidenceDigest === materialVersion
    && job?.jobClosed === true && job.cleanup === true && job.attempt === execution.id && job.rootExit === 0 && job.activeProcesses === 0);
}
