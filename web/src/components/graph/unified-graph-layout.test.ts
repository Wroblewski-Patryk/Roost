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
  assert.notDeepEqual(positions.get("task"), positions.get("department-a"));
});

test("keeps deep descendants inside the semantic cloud of their top-level branch", () => {
  const nodes = [
    { id: "company" },
    { id: "department-a", parentId: "company" },
    { id: "department-b", parentId: "company" },
    { id: "project-a", parentId: "department-a" },
    { id: "task-a", parentId: "project-a" }
  ];
  const edges = [
    { source: "company", target: "department-a" },
    { source: "company", target: "department-b" },
    { source: "department-a", target: "project-a" },
    { source: "project-a", target: "task-a" }
  ];
  const positions = layoutUnifiedGraph3D(nodes, edges, "company");
  const task = positions.get("task-a")!;
  const ownBranch = positions.get("department-a")!;
  const otherBranch = positions.get("department-b")!;
  const distance = (left: typeof task, right: typeof task) => Math.hypot(left.x - right.x, left.y - right.y, left.z - right.z);
  assert.ok(distance(task, ownBranch) < distance(task, otherBranch));
});

test("layout is deterministic regardless of repeated calculation", () => {
  const nodes = Array.from({ length: 30 }, (_, index) => ({ id: `node-${index}` }));
  const edges = nodes.slice(1).map((node) => ({ source: "node-0", target: node.id }));
  assert.deepEqual([...layoutUnifiedGraph3D(nodes, edges, "node-0")], [...layoutUnifiedGraph3D(nodes, edges, "node-0")]);
});

test("keeps a production-scale high-degree company graph inside the camera frustum", () => {
  const root = { id: "company" };
  const departments = Array.from({ length: 13 }, (_, index) => ({ id: `department-${index}`, parentId: root.id }));
  const records = Array.from({ length: 3970 }, (_, index) => ({
    id: `record-${index}`,
    parentId: departments[index % departments.length]!.id
  }));
  const nodes = [root, ...departments, ...records];
  const edges = [
    ...departments.map((department) => ({ source: root.id, target: department.id })),
    ...records.map((record, index) => ({ source: departments[index % departments.length]!.id, target: record.id })),
    ...records.map((record, index) => ({ source: record.id, target: records[(index * 37 + 101) % records.length]!.id }))
  ];

  const positions = layoutUnifiedGraph3D(nodes, edges, root.id);
  const radii = [...positions.values()].map((position) => Math.hypot(position.x, position.y, position.z));
  assert.ok(radii.every(Number.isFinite));
  assert.ok(Math.max(...radii) < 120, "the full graph must remain visible with the shared camera bounds");
});
