import type { ApplicationBaseline, ApplicationBaselineStage } from './application-takeover-contract';

export type ApplicationOperation = {
  schemaVersion: 'roost-application-operation-v1';
  stage: { key: ApplicationBaselineStage | 'unverified'; claim: 'unverified' | 'owner_accepted_baseline' | 'bounded_release_proof';
    scope: string | null; decisionId: string | null; asOf: string | null };
  gateState: 'unmet' | 'in_progress' | 'met' | 'blocked' | 'explicitly_deferred';
  nearestOutcome: { taskId: string; title: string; status: string } | null;
  accountable: { id: string | null; role: string; label: string } | null;
  blockers: Array<{ code: string; reference: string | null }>;
  decisions: Array<{ id: string; title: string; state: string; href: string }>;
  evidence: Array<{ kind: 'audit' | 'independent_review' | 'release'; id: string; commit: string | null; at: string; href: string }>;
  productReadiness: 'unverified'; saleReadiness: 'unverified'; limitations: string[];
};
export type OperationFacts = {
  applicationId: string;
  baseline: { id: string; acceptedAt: string; body: ApplicationBaseline; current: boolean } | null;
  tasks: Array<{ id: string; title: string; status: string; readiness: string; accountable: ApplicationOperation['accountable'];
    readinessReason?: string | null; readinessInvalidatedAt?: string | null;
    completedReviewOfTaskId?: string | null;
    latestExecution: { id: string; status: string; invalidated: boolean; nativeVerified: boolean; executorAgentId?: string | null } | null;
    review: { id: string; executionId: string; decision: string; commit: string | null; at: string; current: boolean; reviewerAgentId?: string | null } | null }>;
  decisions: Array<{ id: string; title: string; state: string; taskIds: string[] }>;
  releases: Array<{ id: string; commit: string; at: string; certified: boolean; failed: boolean }>;
  truncated: boolean;
};

// This is an evidence projection, never an execution grant or a product-ready gate.
// Mutable profile stages and capability percentages are deliberately not inputs.
export function applicationOperation(facts: OperationFacts): ApplicationOperation {
  const evidenceHref = `/areas?area=11-innowacje&view=overview&applicationId=${facts.applicationId}&cockpit=evidence`;
  const baseline = facts.baseline?.current ? facts.baseline : null;
  const certified = facts.releases.find(release => release.certified && !release.failed);
  const decisions = facts.decisions.filter(decision => ['pending', 'proposed', 'deferred'].includes(decision.state));
  const pendingTasks = new Set(decisions.flatMap(decision => decision.taskIds));
  // A completed helper review must not obscure the exact outcome it accepted.
  // The service qualifies this link against the persisted current decision.
  const outcomes = facts.tasks.filter(helper => !helper.completedReviewOfTaskId
    || !facts.tasks.some(target => target.id === helper.completedReviewOfTaskId && currentApprovedOutcome(target)));
  const task = facts.tasks.find(task => pendingTasks.has(task.id))
    ?? outcomes.find(task => !['done', 'cancelled', 'archived'].includes(task.status)) ?? outcomes[0];
  const approved = task && currentApprovedOutcome(task);
  const invalidatedAt = Date.parse(task?.readinessInvalidatedAt ?? ''), reviewedAt = Date.parse(task?.review?.at ?? '');
  // A current acceptance after the group-risk change resolves the result, not
  // the launch gate. A later or unknown risk invalidation still blocks.
  const reviewedRiskChange = approved && task?.readiness === 'needs_revalidation' && task.readinessReason === 'risk_context_changed'
    && Number.isFinite(invalidatedAt) && Number.isFinite(reviewedAt) && invalidatedAt <= reviewedAt;
  const blockers: ApplicationOperation['blockers'] = [];
  if (!baseline && !certified) blockers.push({ code: facts.baseline ? 'takeover_baseline_stale' : 'takeover_baseline_missing', reference: facts.baseline?.id ?? null });
  for (const decision of decisions) blockers.push({ code: decision.state === 'deferred' ? 'owner_decision_deferred' : 'owner_decision_pending', reference: decision.id });
  if (!task && !certified) blockers.push({ code: 'outcome_not_defined', reference: null });
  if (task?.status === 'blocked') blockers.push({ code: 'task_blocked', reference: task.id });
  if (task && ['needs_revalidation', 'needs_decision'].includes(task.readiness) && !reviewedRiskChange) blockers.push({ code: 'task_needs_revalidation', reference: task.id });
  if (task?.readiness === 'needs_context') blockers.push({ code: 'task_needs_context', reference: task.id });
  if (task?.latestExecution?.status === 'failed') blockers.push({ code: 'native_execution_failed', reference: task.latestExecution.id });
  if (task?.review?.current && task.review.decision === 'reject') blockers.push({ code: 'independent_review_rejected', reference: task.review.id });
  if (facts.truncated) blockers.push({ code: 'evidence_unavailable', reference: null });
  const deferredOnly = decisions.length > 0 && decisions.every(decision => decision.state === 'deferred')
    && blockers.every(blocker => blocker.code === 'owner_decision_deferred');
  const historicalOnly = new Set(['takeover_baseline_missing', 'outcome_not_defined']);
  const blocked = blockers.some(blocker => !historicalOnly.has(blocker.code));
  const active = task?.latestExecution && ['queued', 'claimed', 'running', 'waiting_for_approval'].includes(task.latestExecution.status);
  const gateState: ApplicationOperation['gateState'] = deferredOnly ? 'explicitly_deferred' : blocked ? 'blocked'
    : approved || certified && !task ? 'met' : active ? 'in_progress' : 'unmet';
  return {
    schemaVersion: 'roost-application-operation-v1',
    stage: baseline ? { key: baseline.body.stage, claim: 'owner_accepted_baseline', scope: baseline.body.scopeDescription, decisionId: baseline.id, asOf: baseline.acceptedAt }
      : certified ? { key: 'operation_improvement', claim: 'bounded_release_proof', scope: 'Exact bounded release only; whole application readiness remains unverified.', decisionId: null, asOf: certified.at }
      : { key: 'unverified', claim: 'unverified', scope: null, decisionId: null, asOf: null },
    gateState, nearestOutcome: task ? { taskId: task.id, title: task.title, status: approved ? 'accepted' : task.status } : null,
    accountable: task?.accountable ?? null, blockers,
    decisions: decisions.map(({ id, title, state }) => ({ id, title, state, href: `/areas?area=01-strategia&view=decisions&decisionId=${id}` })),
    evidence: [
      ...(baseline ? [{ kind: 'audit' as const, id: baseline.body.verifierExecutionId, commit: baseline.body.baselineCommit, at: baseline.acceptedAt, href: evidenceHref }] : []),
      ...facts.tasks.filter(task => task.review?.current && task.review.decision === 'approve' && task.review.commit
        && task.review.executionId === task.latestExecution?.id && task.latestExecution.status === 'completed'
        && task.latestExecution.nativeVerified && !task.latestExecution.invalidated).slice(0, 10).map(task => ({ kind: 'independent_review' as const,
          id: task.review!.id, commit: task.review!.commit, at: task.review!.at, href: evidenceHref })),
      ...facts.releases.filter(release => release.certified && !release.failed).slice(0, 5).map(release => ({ kind: 'release' as const,
        id: release.id, commit: release.commit, at: release.at, href: evidenceHref }))
    ], productReadiness: 'unverified', saleReadiness: 'unverified',
    limitations: [...(baseline?.body.limitations ?? []).map(text => `Baseline audit (${baseline!.acceptedAt}): ${text}`), 'Stage and gate evidence apply to the stated bounded scope; no product-ready or sale-ready acceptance is inferred.',
      ...(reviewedRiskChange ? ['The exact result was independently accepted after its group-risk change; another execution still requires fresh Ready admission.'] : []),
      ...(facts.truncated ? ['History limit reached; inspect the canonical ledger before declaring completion.'] : [])]
  };
}

export function currentApprovedOutcome(task: OperationFacts['tasks'][number]): boolean {
  return Boolean(task.review?.current && task.review.decision === 'approve' && task.review.commit
    && task.review.executionId === task.latestExecution?.id
    && task.latestExecution?.status === 'completed' && task.latestExecution.nativeVerified && !task.latestExecution.invalidated);
}
