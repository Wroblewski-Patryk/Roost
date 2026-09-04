export type GraphSelectionEdge = {
  id: string;
  source: string;
  target: string;
};

export type GraphSelectionContext = {
  directIds: Set<string>;
  pathIds: string[];
  highlightedIds: Set<string>;
  highlightedEdgeIds: Set<string>;
  pathEdgeIds: Set<string>;
};

export function resolveGraphSelection(
  edges: GraphSelectionEdge[],
  selectedId: string | null | undefined,
  rootId: string
): GraphSelectionContext | null {
  if (!selectedId) return null;

  const adjacency = new Map<string, Array<{ nodeId: string; edgeId: string }>>();
  const connect = (from: string, to: string, edgeId: string) => {
    const neighbours = adjacency.get(from) || [];
    neighbours.push({ nodeId: to, edgeId });
    adjacency.set(from, neighbours);
  };
  edges.forEach((edge) => {
    connect(edge.source, edge.target, edge.id);
    connect(edge.target, edge.source, edge.id);
  });
  adjacency.forEach((neighbours) => neighbours.sort((left, right) => left.nodeId.localeCompare(right.nodeId) || left.edgeId.localeCompare(right.edgeId)));

  const direct = adjacency.get(selectedId) || [];
  const directIds = new Set(direct.map(({ nodeId }) => nodeId));
  const previous = new Map<string, { nodeId: string; edgeId: string }>();
  const visited = new Set([selectedId]);
  const queue = [selectedId];
  for (let cursor = 0; cursor < queue.length && !visited.has(rootId); cursor += 1) {
    const current = queue[cursor];
    (adjacency.get(current) || []).forEach(({ nodeId, edgeId }) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      previous.set(nodeId, { nodeId: current, edgeId });
      queue.push(nodeId);
    });
  }

  const pathIds = [selectedId];
  const pathEdgeIds = new Set<string>();
  if (visited.has(rootId) && rootId !== selectedId) {
    const reversePath = [rootId];
    let current = rootId;
    while (current !== selectedId) {
      const step = previous.get(current);
      if (!step) break;
      pathEdgeIds.add(step.edgeId);
      current = step.nodeId;
      reversePath.push(current);
    }
    pathIds.splice(0, pathIds.length, ...reversePath.reverse());
  }

  const highlightedIds = new Set([...pathIds, ...directIds]);
  const highlightedEdgeIds = new Set(pathEdgeIds);
  direct.forEach(({ edgeId }) => highlightedEdgeIds.add(edgeId));
  return { directIds, pathIds, highlightedIds, highlightedEdgeIds, pathEdgeIds };
}
