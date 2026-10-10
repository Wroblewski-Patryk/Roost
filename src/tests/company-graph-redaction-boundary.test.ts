import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import test from "node:test";
import express from "express";
import { runtimeRedactionBoundary } from "../modules/agent-runtime/runtime-redaction-http";

test("large native Company Graph response keeps every edge endpoint and membership array", async () => {
  const nodes = Array.from({ length: 6000 }, (_, index) => ({ id: `record:${index}`, entityType: "company_record", label: `Record ${index}`, state: "active" }));
  const edges = nodes.map((node, index) => ({
    id: `structural:${index}`, type: "contains", status: "active", source: "structural",
    from: { entityType: "workspace", entityId: "workspace:test" },
    to: { entityType: node.entityType, entityId: node.id }
  }));
  const packet = {
    schemaVersion: "company-graph-v2", generatedAt: "2026-10-10T00:00:00.000Z", rootNodeId: "workspace:test",
    nodes: [{ id: "workspace:test", entityType: "workspace", label: "Company", state: "active" }, ...nodes],
    edges,
    summary: { recordCount: nodes.length, contextualizedRecordCount: nodes.length, unassignedRecordCount: 0, unrootedComponentCount: 0, relationshipCoverage: 100 },
    organizationalMemberships: [{ entityType: "company_record", entityId: nodes[0]!.id, departmentKey: "04-operacje", role: "owner" }]
  };
  const app = express();
  app.use((req, _res, next) => { req.auth = { workspaceId: "00000000-0000-4000-8000-000000000001", authType: "user" }; next(); });
  app.use(runtimeRedactionBoundary);
  app.get("/v1/company-intelligence/graph", (_req, res) => res.json({ data: packet }));
  const server = createServer(app);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const response = await fetch(`http://127.0.0.1:${address.port}/v1/company-intelligence/graph`);
    assert.equal(response.status, 200);
    const body = await response.json() as { data: typeof packet };
    assert.equal(body.data.edges.length, edges.length);
    assert.ok(body.data.edges.every((edge) => edge.from?.entityId && edge.to?.entityId));
    assert.deepEqual(body.data.organizationalMemberships, packet.organizationalMemberships);
  } finally {
    server.close();
    await once(server, "close");
  }
});
