import assert from "node:assert/strict";
import test from "node:test";
import { companyGraphPacketIssue } from "./company-graph-packet";

const packet = {
  schemaVersion: "company-graph-v2",
  rootNodeId: "workspace:one",
  nodes: [
    { id: "workspace:one", entityType: "workspace", label: "Company" },
    { id: "record:one", entityType: "company_record", label: "Record" }
  ],
  edges: [{
    id: "structural:one", type: "contains", source: "structural", status: "active",
    from: { entityType: "workspace", entityId: "workspace:one" },
    to: { entityType: "company_record", entityId: "record:one" }
  }],
  organizationalMemberships: []
};

test("accepts the native Company Graph wire edge", () => {
  assert.equal(companyGraphPacketIssue(packet), null);
});

test("rejects an edge with a missing endpoint before rendering any graph", () => {
  const malformed = { ...packet, edges: [{ ...packet.edges[0], to: undefined }] };
  assert.deepEqual(companyGraphPacketIssue(malformed), {
    reason: "edge_endpoint", schemaVersion: "company-graph-v2", index: 0,
    keys: ["from", "id", "source", "status", "to", "type"]
  });
});

test("rejects a relationship to an absent node instead of silently dropping it", () => {
  const malformed = { ...packet, edges: [{ ...packet.edges[0], to: { entityType: "company_record", entityId: "record:missing" } }] };
  assert.equal(companyGraphPacketIssue(malformed)?.reason, "edge_reference");
});
