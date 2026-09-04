import type { ApplicationGraphPacket } from "../product-engineering/application-graph";

type ProjectionNode = { id: string; entityType: string; recordType: string; label: string; state: string };
type ProjectionEdge = { id: string; type: string; from: { entityType: string; entityId: string }; to: { entityType: string; entityId: string }; status: string; source: "derived" };

const nativeCompanyEntityTypes = new Set(["application", "requirement", "procedure", "project", "task_list", "task"]);

function companyEntityType(type: string) {
  return type === "requirement" ? "company_record" : type;
}

function companyNodeId(node: ApplicationGraphPacket["nodes"][number]) {
  return nativeCompanyEntityTypes.has(node.type) ? node.entityId : node.id;
}

export function projectApplicationPacketsIntoCompanyGraph(input: {
  workspaceId: string;
  workspaceName: string;
  innovationDepartmentNodeId?: string;
  existingNodeIds: Set<string>;
  packets: ApplicationGraphPacket[];
}) {
  const portfolioId = `portfolio:${input.workspaceId}`;
  const nodes: ProjectionNode[] = input.existingNodeIds.has(portfolioId) ? [] : [{
    id: portfolioId,
    entityType: "portfolio",
    recordType: "applications",
    label: "Applications",
    state: "active"
  }];
  const edges: ProjectionEdge[] = [];
  const knownNodeIds = new Set([...input.existingNodeIds, portfolioId]);

  if (input.innovationDepartmentNodeId) {
    edges.push({
      id: `derived:innovation-application-portfolio:${input.workspaceId}`,
      type: "contains",
      from: { entityType: "department", entityId: input.innovationDepartmentNodeId },
      to: { entityType: "portfolio", entityId: portfolioId },
      status: "active",
      source: "derived"
    });
  }

  for (const packet of input.packets) {
    const packetNodeById = new Map(packet.nodes.map((node) => [node.id, node]));
    for (const node of packet.nodes) {
      const id = companyNodeId(node);
      if (knownNodeIds.has(id)) continue;
      const entityType = companyEntityType(node.type);
      nodes.push({ id, entityType, recordType: node.type === "requirement" ? node.category : node.type, label: node.label, state: node.status });
      knownNodeIds.add(id);
    }
    for (const edge of packet.edges) {
      const source = packetNodeById.get(edge.source);
      const target = packetNodeById.get(edge.target);
      if (!source || !target) continue;
      const sourceId = companyNodeId(source);
      const targetId = companyNodeId(target);
      edges.push({
        id: `derived:application-graph:${edge.id}`,
        type: edge.type === "hierarchy" ? "contains" : edge.type,
        from: { entityType: companyEntityType(source.type), entityId: sourceId },
        to: { entityType: companyEntityType(target.type), entityId: targetId },
        status: edge.type === "blocks" ? "blocked" : "active",
        source: "derived"
      });
    }
  }

  return { nodes, edges };
}
