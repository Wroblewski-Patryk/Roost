type PacketIssue = {
  reason: "packet_shape" | "summary_shape" | "root_reference" | "node_shape" | "edge_shape" | "edge_endpoint" | "edge_reference";
  schemaVersion: string;
  index?: number;
  keys?: string[];
  shape?: { rootNodeId: string; nodes: string; edges: string; organizationalMemberships: string };
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function reference(value: unknown): value is { entityType: string; entityId: string } {
  return object(value) && typeof value.entityType === "string" && value.entityType.length > 0
    && typeof value.entityId === "string" && value.entityId.length > 0;
}

function kind(value: unknown) {
  return Array.isArray(value) ? "array" : value === null ? "null" : typeof value;
}

/** Check the wire contract before the graph renderer reads any edge endpoint. */
export function companyGraphPacketIssue(value: unknown): PacketIssue | null {
  const schemaVersion = object(value) && typeof value.schemaVersion === "string" ? value.schemaVersion : "unknown";
  if (!object(value) || schemaVersion !== "company-graph-v2" || !Array.isArray(value.nodes)
    || !Array.isArray(value.edges) || typeof value.rootNodeId !== "string"
    || !Array.isArray(value.organizationalMemberships)) return {
      reason: "packet_shape", schemaVersion,
      keys: object(value) ? Object.keys(value).sort() : [],
      shape: {
        rootNodeId: kind(object(value) ? value.rootNodeId : undefined),
        nodes: kind(object(value) ? value.nodes : undefined),
        edges: kind(object(value) ? value.edges : undefined),
        organizationalMemberships: kind(object(value) ? value.organizationalMemberships : undefined)
      }
    };
  const summary = value.summary;
  if (!object(summary) || !["recordCount", "contextualizedRecordCount", "unassignedRecordCount", "unrootedComponentCount", "relationshipCoverage"]
    .every((field) => typeof summary[field] === "number" && Number.isFinite(summary[field]))) {
    return { reason: "summary_shape", schemaVersion, keys: object(summary) ? Object.keys(summary).sort() : [] };
  }
  const nodeTypes = new Map<string, string>();
  for (let index = 0; index < value.nodes.length; index += 1) {
    const node = value.nodes[index];
    if (!object(node) || typeof node.id !== "string" || !node.id
      || typeof node.entityType !== "string" || !node.entityType || typeof node.label !== "string" || nodeTypes.has(node.id)) {
      return { reason: "node_shape", schemaVersion, index, keys: object(node) ? Object.keys(node).sort() : [] };
    }
    nodeTypes.set(node.id, node.entityType);
  }
  if (!nodeTypes.has(value.rootNodeId)) return { reason: "root_reference", schemaVersion };
  for (let index = 0; index < value.edges.length; index += 1) {
    const edge = value.edges[index];
    if (!object(edge) || !reference(edge.from) || !reference(edge.to)) {
      return { reason: "edge_endpoint", schemaVersion, index, keys: object(edge) ? Object.keys(edge).sort() : [] };
    }
    if (!nodeTypes.has(edge.from.entityId) || !nodeTypes.has(edge.to.entityId)
      || nodeTypes.get(edge.from.entityId) !== edge.from.entityType || nodeTypes.get(edge.to.entityId) !== edge.to.entityType) {
      return { reason: "edge_reference", schemaVersion, index, keys: Object.keys(edge).sort() };
    }
    if (typeof edge.id !== "string" || !edge.id || typeof edge.type !== "string" || !edge.type
      || typeof edge.status !== "string" || !edge.status
      || !["explicit", "structural", "derived", "fallback"].includes(String(edge.source))) {
      return { reason: "edge_shape", schemaVersion, index, keys: Object.keys(edge).sort() };
    }
  }
  return null;
}
