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
});
const task = () => ({ id: id(2), title: 'Bounded outcome', status: 'in_progress', readiness: 'ready',
  accountable: { id: id(3), role: 'manager', label: 'Accountable manager' },
  latestExecution: { id: id(4), status: 'completed', invalidated: false, nativeVerified: true },
  review: { id: id(5), executionId: id(4), decision: 'approve', commit: 'a'.repeat(40), at: '2026-10-04T00:00:00Z', current: true } });
test('owner pending decision blocks an independently reviewed outcome and links exact records', () => {
  const f = facts(); f.tasks = [task()]; f.decisions = [{ id: id(6), title: 'Actual owner decision', state: 'proposed', taskIds: [id(2)] }];
  const value = applicationOperation(f); assert.equal(value.gateState, 'blocked');
  assert.equal(value.nearestOutcome?.taskId, id(2)); assert.equal(value.accountable?.id, id(3));
  assert.equal(value.decisions[0].href, `/areas?area=01-strategia&view=decisions&decisionId=${id(6)}`);
  assert.equal(value.evidence[0].commit, 'a'.repeat(40));
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
