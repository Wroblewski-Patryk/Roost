import assert from "node:assert/strict";
import test from "node:test";
import { findCompanyGraphLayoutCollisions, layoutCompanyGraphNodes } from "./company-graph-layout";

const nodes = Array.from({ length: 36 }, (_, index) => ({ id: `node-${index}`, entityType: index % 3 ? "project" : "resource", label: `Record ${index}` }));
const edges = nodes.slice(1, 24).map((node, index) => ({ from: { entityId: nodes[Math.floor(index / 3)]!.id }, to: { entityId: node.id } }));

test("company graph layout follows relationships without collisions", () => {
  const positions = layoutCompanyGraphNodes(nodes, edges);
  assert.equal(positions.size, nodes.length);
  assert.deepEqual(findCompanyGraphLayoutCollisions(nodes, positions), []);
});

test("company graph layout does not collapse a mixed catalog into one vertical chain", () => {
  const positions = layoutCompanyGraphNodes(nodes, edges);
  const distinctColumns = new Set([...positions.values()].map((position) => Math.round(position.x / 80))).size;
  const distinctRows = new Set([...positions.values()].map((position) => Math.round(position.y / 80))).size;
  assert.ok(distinctColumns >= 5, "related records should use the available horizontal space");
  assert.ok(distinctRows >= 5, "the topology should remain spatially distinguishable");
});

test("company graph layout is deterministic", () => {
  assert.deepEqual([...layoutCompanyGraphNodes(nodes, edges)], [...layoutCompanyGraphNodes(nodes, edges)]);
});
