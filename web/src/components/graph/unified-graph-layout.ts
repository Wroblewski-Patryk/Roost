export type UnifiedGraphPosition = { x: number; y: number; z: number };

export type UnifiedGraphLayoutNode = {
  id: string;
  parentId?: string | null;
  weight?: number;
};

export type UnifiedGraphLayoutEdge = {
  source: string;
  target: string;
};

function hashUnit(value: string, salt: number) {
  let hash = 2166136261 ^ salt;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967295;
}

export function layoutUnifiedGraph3D(
  nodes: UnifiedGraphLayoutNode[],
  edges: UnifiedGraphLayoutEdge[],
  rootId: string
) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  edges.forEach((edge) => {
    if (!byId.has(edge.source) || !byId.has(edge.target)) return;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
  });

  const depth = new Map<string, number>();
  const queue = byId.has(rootId) ? [rootId] : nodes[0] ? [nodes[0].id] : [];
  if (queue[0]) depth.set(queue[0], 0);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const neighbours = [...(adjacency.get(current) || [])].sort();
    neighbours.forEach((neighbour) => {
      if (depth.has(neighbour)) return;
      depth.set(neighbour, (depth.get(current) || 0) + 1);
      queue.push(neighbour);
    });
  }

  const disconnected = nodes.filter((node) => !depth.has(node.id)).sort((a, b) => a.id.localeCompare(b.id));
  disconnected.forEach((node, index) => depth.set(node.id, 2 + Math.floor(index / 24)));
  const layers = new Map<number, UnifiedGraphLayoutNode[]>();
  nodes.forEach((node) => {
    const level = depth.get(node.id) || 0;
    const group = layers.get(level) || [];
    group.push(node);
    layers.set(level, group);
  });

  const positions = new Map<string, UnifiedGraphPosition>();
  [...layers.entries()].sort(([left], [right]) => left - right).forEach(([level, layer]) => {
    layer.sort((left, right) => (right.weight || 0) - (left.weight || 0) || left.id.localeCompare(right.id));
    if (level === 0) {
      layer.forEach((node, index) => positions.set(node.id, { x: index * 2.5, y: 0, z: 0 }));
      return;
    }

    const count = layer.length;
    const radius = 5.8 + Math.min(level, 5) * 3.9 + Math.log2(Math.max(1, count)) * 0.85;
    layer.forEach((node, index) => {
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      const yUnit = count === 1 ? 0 : 1 - (index / (count - 1)) * 2;
      const radial = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
      const angle = index * goldenAngle + hashUnit(node.parentId || node.id, level) * 0.9;
      positions.set(node.id, {
        x: Math.cos(angle) * radial * radius,
        y: yUnit * radius * 0.72,
        z: Math.sin(angle) * radial * radius
      });
    });
  });

  return positions;
}
