import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCompanyGraphConnectivity } from "../modules/company-intelligence/company-graph-connectivity";

test("detects a connected but unrooted project execution island", () => {
  const nodes = [
    { id: "workspace:1", entityType: "workspace" },
    { id: "department:innovation", entityType: "department" },
    { id: "project:soar", entityType: "project" },
    { id: "list:delivery", entityType: "task_list" },
    { id: "task:ship", entityType: "task" }
  ];
  const edges = [
    { from: { entityId: "workspace:1" }, to: { entityId: "department:innovation" } },
    { from: { entityId: "project:soar" }, to: { entityId: "list:delivery" } },
    { from: { entityId: "list:delivery" }, to: { entityId: "task:ship" } }
  ];

  const result = analyzeCompanyGraphConnectivity(nodes, edges, "workspace:1");

  assert.deepEqual([...result.reachableNodeIds].sort(), ["department:innovation", "workspace:1"]);
  assert.deepEqual(result.unrootedComponents, [{
    anchorNodeId: "project:soar",
    nodeIds: ["list:delivery", "project:soar", "task:ship"]
  }]);
});

test("treats relationship direction as irrelevant for company context reachability", () => {
  const result = analyzeCompanyGraphConnectivity(
    [{ id: "workspace:1", entityType: "workspace" }, { id: "goal:1", entityType: "goal" }],
    [{ from: { entityId: "goal:1" }, to: { entityId: "workspace:1" } }],
    "workspace:1"
  );

  assert.equal(result.unrootedComponents.length, 0);
  assert.equal(result.reachableNodeIds.has("goal:1"), true);
});
