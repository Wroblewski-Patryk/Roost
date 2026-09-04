export type ConnectivityNode = { id: string; entityType: string };
export type ConnectivityEdge = { from: { entityId: string }; to: { entityId: string } };

const anchorPriority: Record<string, number> = {
  application: 0,
  project: 1,
  goal: 2,
  procedure: 3,
  client: 4,
  workforce: 5,
  company_record: 6,
  task_list: 7,
  task: 8,
  file: 9
};

function adjacencyFor(nodeIds: Set<string>, edges: ConnectivityEdge[]) {
  const adjacency = new Map<string, Set<string>>([...nodeIds].map((id) => [id, new Set<string>()]));
  for (const edge of edges) {
    if (!nodeIds.has(edge.from.entityId) || !nodeIds.has(edge.to.entityId)) continue;
    adjacency.get(edge.from.entityId)!.add(edge.to.entityId);
    adjacency.get(edge.to.entityId)!.add(edge.from.entityId);
  }
  return adjacency;
}

function traverse(startId: string, adjacency: Map<string, Set<string>>, allowed?: Set<string>) {
  const visited = new Set<string>();
  const queue = [startId];
  while (queue.length) {
    const current = queue.shift()!;
    if (visited.has(current) || (allowed && !allowed.has(current))) continue;
    visited.add(current);
    for (const neighbour of adjacency.get(current) ?? []) {
      if (!visited.has(neighbour) && (!allowed || allowed.has(neighbour))) queue.push(neighbour);
    }
  }
  return visited;
}

export function analyzeCompanyGraphConnectivity(nodes: ConnectivityNode[], edges: ConnectivityEdge[], rootNodeId: string) {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const nodeIds = new Set(nodeById.keys());
  const adjacency = adjacencyFor(nodeIds, edges);
  const reachableNodeIds = nodeIds.has(rootNodeId) ? traverse(rootNodeId, adjacency) : new Set<string>();
  const unrootedNodeIds = new Set([...nodeIds].filter((id) => !reachableNodeIds.has(id)));
  const unrootedComponents: Array<{ nodeIds: string[]; anchorNodeId: string }> = [];

  while (unrootedNodeIds.size) {
    const first = [...unrootedNodeIds].sort()[0]!;
    const component = traverse(first, adjacency, unrootedNodeIds);
    component.forEach((id) => unrootedNodeIds.delete(id));
    const ordered = [...component].sort((leftId, rightId) => {
      const left = nodeById.get(leftId)!;
      const right = nodeById.get(rightId)!;
      return (anchorPriority[left.entityType] ?? 100) - (anchorPriority[right.entityType] ?? 100)
        || left.id.localeCompare(right.id);
    });
    unrootedComponents.push({ nodeIds: [...component].sort(), anchorNodeId: ordered[0]! });
  }

  return {
    reachableNodeIds,
    unrootedComponents: unrootedComponents.sort((left, right) => left.anchorNodeId.localeCompare(right.anchorNodeId))
  };
}
