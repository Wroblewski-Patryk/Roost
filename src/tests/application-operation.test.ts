import test from 'node:test';
import assert from 'node:assert/strict';
import { applicationOperation, type OperationFacts } from '../modules/product-engineering/application-operation';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const facts = (): OperationFacts => ({ applicationId: id(1), baseline: null, tasks: [], decisions: [], releases: [], truncated: false });
test('empty, unaudited application exposes unmet evidence and no product readiness', () => {
  const value = applicationOperation(facts());
  assert.equal(value.stage.claim, 'unverified'); assert.equal(value.gateState, 'unmet');
  assert.equal(value.productReadiness, 'unverified'); assert.equal(value.saleReadiness, 'unverified');
  assert.equal(value.nearestOutcome, null); assert.equal(value.evidence.length, 0);
  assert.deepEqual(value.taskHistory, []);
});
const task = () => ({ id: id(2), title: 'Bounded outcome', status: 'in_progress', readiness: 'ready',
  accountable: { id: id(3), role: 'manager', label: 'Accountable manager' },
  latestExecution: { id: id(4), status: 'completed', invalidated: false, nativeVerified: true },
  review: { id: id(5), executionId: id(4), decision: 'approve', commit: 'a'.repeat(40), at: '2026-10-04T00:00:00Z', current: true } });
test('owner pending decision blocks an independently reviewed outcome and links exact records', () => {
  const f = facts(); f.tasks = [task()]; f.decisions = [{ id: id(6), title: 'Actual owner decision', state: 'proposed', taskIds: [id(2)] }];
  const value = applicationOperation(f); assert.equal(value.gateState, 'blocked');
  assert.equal(value.nearestOutcome?.taskId, id(2)); assert.equal(value.accountable?.id, id(3));
  assert.equal(value.nearestOutcome?.reason, 'owner_decision_pending');
  assert.equal(value.decisions[0].href, `/areas?area=01-strategia&view=decisions&decisionId=${id(6)}`);
  assert.deepEqual(value.blockers.find(blocker => blocker.code === 'owner_decision_pending')?.target,
    { kind: 'decision', title: 'Actual owner decision', href: value.decisions[0].href });
  assert.equal(value.evidence[0].commit, 'a'.repeat(40));
});
test('terminal Tasks stay in linked history and cannot become current through a pending Decision', () => {
  const f = facts(), archived = { ...task(), id: id(30), title: 'Archived delivery', status: 'archived' };
  const done = { ...task(), id: id(31), title: 'Completed delivery', status: 'done', review: null };
  const cancelled = { ...task(), id: id(32), title: 'Cancelled delivery', status: 'cancelled', latestExecution: null, review: null };
  f.tasks = [archived, done, cancelled];
  f.decisions = [{ id: id(40), title: 'Recorded pending decision', state: 'pending', taskIds: [archived.id] }];
  const value = applicationOperation(f);
  assert.equal(value.nearestOutcome, null);
  assert.equal(value.accountable, null);
  assert.equal(value.gateState, 'blocked');
  assert.equal(value.decisions[0].relatedTask?.id, archived.id);
  assert.deepEqual(value.taskHistory.map(row => [row.taskId, row.status, row.executionStatus, row.reviewDecision]), [
    [archived.id, 'archived', 'completed', 'approve'],
    [done.id, 'done', 'completed', null],
    [cancelled.id, 'cancelled', null, null]
  ]);
});
test('a pending Decision on terminal history never displaces a real open Task', () => {
  const f = facts(), archived = { ...task(), id: id(30), status: 'archived' }, open = { ...task(), id: id(31), status: 'todo', review: null, latestExecution: null };
  f.tasks = [archived, open];
  f.decisions = [{ id: id(40), title: 'Still recorded pending', state: 'pending', taskIds: [archived.id] }];
  const value = applicationOperation(f);
  assert.equal(value.nearestOutcome?.taskId, open.id);
  assert.equal(value.nearestOutcome?.reason, 'task_to_do');
  assert.equal(value.decisions[0].relatedTask?.id, archived.id);
});
test('a decision links its own scoped application task even when another task is the nearest outcome', () => {
  const f = facts();
  f.tasks = [task(), { ...task(), id: id(8), title: 'Task scoped by decision', status: 'done' }];
  f.decisions = [
    { id: id(6), title: 'Decision for nearest task', state: 'pending', taskIds: [id(2)] },
    { id: id(7), title: 'Decision for second task', state: 'pending', taskIds: [id(8)] }
  ];
  const value = applicationOperation(f);
  assert.deepEqual(value.decisions[1].relatedTask, { id: id(8), title: 'Task scoped by decision' });
  assert.equal(value.nearestOutcome?.taskId, id(2));
});
test('an accepted takeover Decision retains its exact audit Task even when a later Decision targets another Task', () => {
  const f = facts();
  f.tasks = [task(), { ...task(), id: id(8), title: 'Later outcome', status: 'in_progress' }];
  f.baseline = { id: id(6), acceptedAt: '2026-10-04T00:00:00Z', current: true,
    body: { stage: 'implementation', scopeDescription: 'Audited scope', auditTaskId: id(2),
      verifierExecutionId: id(9), baselineCommit: 'a'.repeat(40), limitations: [] } as any };
  f.decisions = [{ id: id(6), title: 'Accepted baseline', state: 'accepted', taskIds: [id(2)] },
    { id: id(7), title: 'Later decision', state: 'proposed', taskIds: [id(8)] }];
  const value = applicationOperation(f);
  assert.equal(value.stage.decisionId, id(6));
  assert.deepEqual(value.stage.relatedTask, { id: id(2), title: 'Bounded outcome' });
  assert.equal(value.nearestOutcome?.taskId, id(8));
  assert.deepEqual(value.decisions.map(decision => decision.id), [id(7)]);
});
test('invalidated native result and stale review never establish a met gate', () => {
  const f = facts(); f.tasks = [task()]; f.tasks[0].latestExecution!.invalidated = true;
  assert.notEqual(applicationOperation(f).gateState, 'met'); assert.equal(applicationOperation(f).evidence.length, 0);
  f.tasks[0].latestExecution!.invalidated = false; f.tasks[0].review!.current = false;
  assert.notEqual(applicationOperation(f).gateState, 'met'); assert.equal(applicationOperation(f).evidence.length, 0);
});
test('failed release is retained without turning rollback cleanup into certified release', () => {
  const f = facts(); f.releases = [{ id: id(7), commit: 'a'.repeat(40), at: '2026-10-04T00:00:00Z', certified: false, failed: true }];
  assert.equal(applicationOperation(f).stage.claim, 'unverified'); assert.equal(applicationOperation(f).evidence.length, 0);
  f.releases[0].certified = true; assert.equal(applicationOperation(f).stage.claim, 'unverified');
  f.releases[0].failed = false; assert.equal(applicationOperation(f).stage.claim, 'bounded_release_proof');
  assert.equal(applicationOperation(f).gateState, 'met');
});
test('partial history and rejected independent review prevent completion', () => {
  const f = facts(); f.tasks = [task()]; f.tasks[0].review!.decision = 'reject';
  assert.equal(applicationOperation(f).gateState, 'blocked'); assert.equal(applicationOperation(f).evidence.length, 0);
  f.tasks[0].review!.decision = 'approve'; f.truncated = true;
  assert.equal(applicationOperation(f).gateState, 'blocked');
});
test('waiting_for_approval is an actual ongoing execution state and does not claim completion', () => {
  const f = facts(); f.tasks = [task()]; f.tasks[0].latestExecution!.status = 'waiting_for_approval'; f.tasks[0].review = null;
  const value = applicationOperation(f);
  assert.equal(value.gateState, 'in_progress'); assert.equal(value.evidence.length, 0);
  assert.equal(value.productReadiness, 'unverified');
});
test('an approval belonging to a different execution cannot establish a met gate or current review evidence', () => {
  const f = facts(); f.tasks = [task()]; f.tasks[0].review!.executionId = id(99);
  assert.notEqual(applicationOperation(f).gateState, 'met'); assert.equal(applicationOperation(f).evidence.length, 0);
});

test('completed exact review helper exposes its accepted outcome but actual owner waiting retains priority', () => {
  const f = facts(), target = task();
  const helper = { ...task(), id: id(20), title: 'Independent review', review: null, completedReviewOfTaskId: target.id };
  f.tasks = [helper, target];
  const accepted = applicationOperation(f);
  assert.equal(accepted.nearestOutcome?.taskId, target.id);
  assert.equal(accepted.nearestOutcome?.status, 'accepted');
  assert.equal(accepted.gateState, 'met');
  f.decisions = [{ id: id(21), title: 'Actual helper decision', state: 'proposed', taskIds: [helper.id] }];
  const waiting = applicationOperation(f);
  assert.equal(waiting.nearestOutcome?.taskId, helper.id);
  assert.equal(waiting.gateState, 'blocked');
  assert.equal(waiting.decisions[0].id, id(21));
  f.decisions = []; target.review.current = false;
  assert.equal(applicationOperation(f).nearestOutcome?.taskId, helper.id);
  assert.notEqual(applicationOperation(f).gateState, 'met');
  target.review.current = true; target.status = 'archived';
  const terminalTarget = applicationOperation(f);
  assert.equal(terminalTarget.nearestOutcome?.taskId, helper.id);
  assert.equal(terminalTarget.taskHistory[0].taskId, target.id);
});

test('a newly incomplete submission preserves a visible context blocker over its older completed result', () => {
  const f = facts(); f.tasks = [task()]; f.tasks[0].readiness = 'needs_context';
  const value = applicationOperation(f);
  assert.equal(value.gateState, 'blocked');
  assert.ok(value.blockers.some(blocker => blocker.code === 'task_needs_context'));
  assert.equal(value.blockers.find(blocker => blocker.code === 'task_needs_context')?.target?.href,
    `/areas?area=04-operacje&view=tasks&taskId=${id(2)}`);
});

test('current exact acceptance after a group-risk invalidation resolves only the result, never later risk or owner waiting', () => {
  const f = facts(), t = { ...task(), readiness: 'needs_revalidation', readinessReason: 'risk_context_changed',
    readinessInvalidatedAt: '2026-10-03T23:59:00Z' };
  f.tasks = [t];
  const accepted = applicationOperation(f);
  assert.equal(accepted.gateState, 'met');
  assert.ok(accepted.limitations.some(text => text.includes('another execution still requires fresh Ready')));
  for (const value of ['', 'invalid', '2026-10-04T00:01:00Z']) {
    t.readinessInvalidatedAt = value; assert.equal(applicationOperation(f).gateState, 'blocked');
  }
  t.readinessInvalidatedAt = '2026-10-03T23:59:00Z'; t.readinessReason = 'context_changed';
  assert.equal(applicationOperation(f).gateState, 'blocked');
  t.readinessReason = 'risk_context_changed'; t.review.current = false;
  assert.equal(applicationOperation(f).gateState, 'blocked');
  t.review.current = true; f.decisions = [{ id: id(21), title: 'Actual owner decision', state: 'proposed', taskIds: [t.id] }];
  assert.equal(applicationOperation(f).gateState, 'blocked');
});
