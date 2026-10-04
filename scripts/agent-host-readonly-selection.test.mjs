import test from 'node:test';
import assert from 'node:assert/strict';
import { executionContractSchema } from './lib/agent-host-execution-packet.mjs';
import { validPacketFixture } from './fixtures/execution-packet.mjs';
const boundary = () => ({ profile: 'inspect-readonly', readPaths: [], readFragments: [{ path: 'docs/accepted.md', startLine: 25, endLine: 30 }],
  runtime: { required: false, ports: [] }, inspectReadOnly: { kind: 'auditor' } });
const contract = value => ({ ...validPacketFixture().packet.contract, nativeBoundary: value });
test('pinned fragments qualify without expanding the legacy whole-file budget', () => {
  assert.equal(executionContractSchema.safeParse(contract(boundary())).success, true);
  const b = boundary(); delete b.readFragments; b.readPaths = ['docs/accepted.md'];
  assert.equal(executionContractSchema.safeParse(contract(b)).success, true);
});
test('contract rejects empty, overlapping, traversal, unbounded and ambiguous selections', () => {
  for (const mutate of [b => b.readFragments = [], b => b.readFragments[0].path = '../outside.md',
    b => b.readFragments[0].endLine = 225, b => b.readPaths = ['docs/accepted.md'],
    b => b.readFragments.push({ path: 'DOCS/accepted.md', startLine: 29, endLine: 40 }),
    b => b.readFragments[0].extra = 'expanded', b => b.readPaths = ['source.ts', 'SOURCE.ts']]) {
    const b = boundary(); mutate(b); assert.equal(executionContractSchema.safeParse(contract(b)).success, false);
  }
});
