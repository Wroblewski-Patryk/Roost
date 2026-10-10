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
  summary: { recordCount: 1, contextualizedRecordCount: 1, unassignedRecordCount: 0, unrootedComponentCount: 0, relationshipCoverage: 100 },
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

test("rejects an untyped edge or missing coverage summary", () => {
  assert.equal(companyGraphPacketIssue({ ...packet, edges: [{ ...packet.edges[0], type: undefined }] })?.reason, "edge_shape");
  assert.equal(companyGraphPacketIssue({ ...packet, summary: undefined })?.reason, "summary_shape");
});

test("rejects an endpoint whose type conflicts with the referenced node", () => {
  const malformed = { ...packet, edges: [{ ...packet.edges[0], to: { entityType: "procedure", entityId: "record:one" } }] };
  assert.equal(companyGraphPacketIssue(malformed)?.reason, "edge_reference");
});

test("reports only field kinds for an incomplete packet", () => {
  const incomplete = { ...packet, organizationalMemberships: undefined };
  assert.deepEqual(companyGraphPacketIssue(incomplete), {
    reason: "packet_shape", schemaVersion: "company-graph-v2",
    keys: ["edges", "nodes", "organizationalMemberships", "rootNodeId", "schemaVersion", "summary"],
    shape: { rootNodeId: "string", nodes: "array", edges: "array", organizationalMemberships: "undefined" }
  });
});
