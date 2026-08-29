import assert from "node:assert/strict";
import test from "node:test";
import {
  findApplicationGraphLayoutCollisions,
  layoutApplicationGraphNodes
} from "./application-graph-layout";
import type { ApplicationGraphNode, ApplicationGraphNodeType } from "./application-graph-types";

function graphNode(input: {
  id: string;
  type: ApplicationGraphNodeType;
  parentNodeId: string | null;
  path: string[];
  label?: string;
}): ApplicationGraphNode {
  return {
    id: input.id,
    entityId: input.id,
    type: input.type,
    label: input.label ?? input.id,
    shortLabel: input.label ?? input.id,
    category: input.type,
    status: "active",
    completeness: 50,
    isRequired: true,
    isBlocked: false,
    hasEvidence: false,
    tags: [],
    parentNodeId: input.parentNodeId,
    childCount: 0,
    path: input.path,
    details: {}
  };
}

function assertCollisionFree(nodes: ApplicationGraphNode[], focus: ApplicationGraphNode) {
  const positions = layoutApplicationGraphNodes(nodes, focus);
  assert.deepEqual(findApplicationGraphLayoutCollisions(nodes, focus, positions), []);
}

test("application focus keeps a Featherly-sized domain set collision free", () => {
  const company = graphNode({ id: "company", type: "company", parentNodeId: null, path: ["company"] });
  const application = graphNode({ id: "featherly", type: "application", parentNodeId: "company", path: ["company", "featherly"] });
  const domains = ["AI / MCP / Agents", "API / Integrations", "Backend", "Data", "Frontend", "Infrastructure", "Quality"].map((label, index) =>
    graphNode({ id: `domain-${index}`, type: "domain", parentNodeId: application.id, path: [...application.path, `domain-${index}`], label })
  );
  assertCollisionFree([company, application, ...domains], application);
  const positions = layoutApplicationGraphNodes([company, application, ...domains], application);
  const domainPositions = domains.map((domain) => positions.get(domain.id)!);
  assert.ok(Math.max(...domainPositions.map((position) => position.y)) - Math.min(...domainPositions.map((position) => position.y)) <= 480, "seven domains should remain compact enough to read without excessive zoom-out");
});

test("two-level project focus keeps thirty task nodes collision free", () => {
  const company = graphNode({ id: "company", type: "company", parentNodeId: null, path: ["company"] });
  const application = graphNode({ id: "soar", type: "application", parentNodeId: company.id, path: [company.id, "soar"] });
  const delivery = graphNode({ id: "delivery", type: "domain", parentNodeId: application.id, path: [...application.path, "delivery"] });
  const project = graphNode({ id: "project", type: "project", parentNodeId: delivery.id, path: [...delivery.path, "project"] });
  const taskList = graphNode({ id: "task-list", type: "task_list", parentNodeId: project.id, path: [...project.path, "task-list"] });
  const tasks = Array.from({ length: 30 }, (_, index) => graphNode({
    id: `task-${index}`,
    type: "task",
    parentNodeId: taskList.id,
    path: [...taskList.path, `task-${index}`],
    label: `Verification task ${index + 1} with a deliberately long label`
  }));
  assertCollisionFree([company, application, delivery, project, taskList, ...tasks], project);
});

test("portfolio orbit remains collision free at eight applications", () => {
  const company = graphNode({ id: "company", type: "company", parentNodeId: null, path: ["company"] });
  const applications = Array.from({ length: 8 }, (_, index) => graphNode({
    id: `application-${index}`,
    type: "application",
    parentNodeId: company.id,
    path: [company.id, `application-${index}`]
  }));
  assertCollisionFree([company, ...applications], company);
});
