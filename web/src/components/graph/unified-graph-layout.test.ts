import assert from "node:assert/strict";
import test from "node:test";
import { layoutUnifiedGraph3D } from "./unified-graph-layout";

test("places the focus at the origin and every related node in 3D space", () => {
  const nodes = [{ id: "company" }, { id: "department-a" }, { id: "department-b" }, { id: "task", parentId: "department-a" }];
  const edges = [{ source: "company", target: "department-a" }, { source: "company", target: "department-b" }, { source: "department-a", target: "task" }];
  const positions = layoutUnifiedGraph3D(nodes, edges, "company");
  assert.deepEqual(positions.get("company"), { x: 0, y: 0, z: 0 });
  assert.equal(positions.size, nodes.length);
  assert.notDeepEqual(positions.get("department-a"), positions.get("department-b"));
  assert.ok(Math.hypot(...Object.values(positions.get("task")!)) > Math.hypot(...Object.values(positions.get("department-a")!)));
});

test("layout is deterministic regardless of repeated calculation", () => {
  const nodes = Array.from({ length: 30 }, (_, index) => ({ id: `node-${index}` }));
  const edges = nodes.slice(1).map((node) => ({ source: "node-0", target: node.id }));
  assert.deepEqual([...layoutUnifiedGraph3D(nodes, edges, "node-0")], [...layoutUnifiedGraph3D(nodes, edges, "node-0")]);
});
