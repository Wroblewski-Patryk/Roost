type PacketIssue = {
  reason: "packet_shape" | "node_shape" | "edge_endpoint" | "edge_reference";
  schemaVersion: string;
  index?: number;
  keys?: string[];
};

function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function reference(value: unknown): value is { entityType: string; entityId: string } {
  return object(value) && typeof value.entityType === "string" && value.entityType.length > 0
    && typeof value.entityId === "string" && value.entityId.length > 0;
}

/** Check the wire contract before the graph renderer reads any edge endpoint. */
export function companyGraphPacketIssue(value: unknown): PacketIssue | null {
  const schemaVersion = object(value) && typeof value.schemaVersion === "string" ? value.schemaVersion : "unknown";
  if (!object(value) || schemaVersion !== "company-graph-v2" || !Array.isArray(value.nodes)
    || !Array.isArray(value.edges) || typeof value.rootNodeId !== "string"
    || !Array.isArray(value.organizationalMemberships)) return { reason: "packet_shape", schemaVersion };
  const ids = new Set<string>();
  for (let index = 0; index < value.nodes.length; index += 1) {
    const node = value.nodes[index];
    if (!object(node) || typeof node.id !== "string" || !node.id
      || typeof node.entityType !== "string" || typeof node.label !== "string" || ids.has(node.id)) {
      return { reason: "node_shape", schemaVersion, index, keys: object(node) ? Object.keys(node).sort() : [] };
    }
    ids.add(node.id);
  }
  if (!ids.has(value.rootNodeId)) return { reason: "packet_shape", schemaVersion };
  for (let index = 0; index < value.edges.length; index += 1) {
    const edge = value.edges[index];
    if (!object(edge) || !reference(edge.from) || !reference(edge.to)) {
      return { reason: "edge_endpoint", schemaVersion, index, keys: object(edge) ? Object.keys(edge).sort() : [] };
    }
    if (!ids.has(edge.from.entityId) || !ids.has(edge.to.entityId)) {
      return { reason: "edge_reference", schemaVersion, index, keys: Object.keys(edge).sort() };
    }
  }
  return null;
}
