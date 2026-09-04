import assert from "node:assert/strict";
import test from "node:test";
import type { ApplicationGraphPacket } from "../modules/product-engineering/application-graph";
import { projectApplicationPacketsIntoCompanyGraph } from "../modules/company-intelligence/company-graph-application-projection";

test("projects the application slice under Innovation while reusing native company nodes", () => {
  const packet: ApplicationGraphPacket = {
    schemaVersion: "application-graph-v2",
    generatedAt: "2026-09-04T00:00:00.000Z",
    scope: "application",
    rootNodeId: "portfolio:workspace-1",
    applicationId: "app-1",
    projection: { sourceOfTruth: "product-engineering", initialDepth: 2, completeApplicationProjection: true, domainMappingVersion: "application-graph-domains-v1" },
    nodes: [
      { id: "portfolio:workspace-1", entityId: "workspace-1", type: "portfolio", label: "Applications", shortLabel: "Applications", category: "Product Engineering", status: "active", completeness: 50, isRequired: true, isBlocked: false, hasEvidence: true, tags: [], parentNodeId: null, childCount: 1, path: ["portfolio:workspace-1"], details: {} },
      { id: "application:app-1", entityId: "app-1", type: "application", label: "Soar", shortLabel: "Soar", category: "Application", status: "active", completeness: 50, isRequired: true, isBlocked: false, hasEvidence: true, tags: [], parentNodeId: "portfolio:workspace-1", childCount: 1, path: ["portfolio:workspace-1", "application:app-1"], details: {} },
      { id: "capability:cap-1", entityId: "cap-1", type: "capability", label: "Trading", shortLabel: "Trading", category: "Capability", status: "partial", completeness: 50, isRequired: true, isBlocked: false, hasEvidence: true, tags: [], parentNodeId: "application:app-1", childCount: 0, path: ["portfolio:workspace-1", "application:app-1", "capability:cap-1"], details: {} }
    ],
    edges: [
      { id: "hierarchy:portfolio:app", source: "portfolio:workspace-1", target: "application:app-1", type: "hierarchy", required: true },
      { id: "hierarchy:app:cap", source: "application:app-1", target: "capability:cap-1", type: "hierarchy", required: true }
    ]
  };

  const result = projectApplicationPacketsIntoCompanyGraph({ workspaceId: "workspace-1", workspaceName: "LuckySparrow", innovationDepartmentNodeId: "department:innovation", existingNodeIds: new Set(["app-1"]), packets: [packet] });

  assert.equal(result.nodes.some((node) => node.id === "app-1"), false);
  assert.equal(result.nodes.some((node) => node.id === "portfolio:workspace-1" && node.label === "Applications"), true);
  assert.equal(result.nodes.some((node) => node.id === "capability:cap-1"), true);
  assert.equal(result.edges.some((edge) => edge.from.entityId === "department:innovation" && edge.to.entityId === "portfolio:workspace-1"), true);
  assert.equal(result.edges.some((edge) => edge.from.entityId === "portfolio:workspace-1" && edge.to.entityId === "app-1"), true);
});
