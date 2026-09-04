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

type MutablePosition = UnifiedGraphPosition & { vx: number; vy: number; vz: number };

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
  const outgoing = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  edges.forEach((edge) => {
    if (!byId.has(edge.source) || !byId.has(edge.target)) return;
    adjacency.get(edge.source)?.add(edge.target);
    adjacency.get(edge.target)?.add(edge.source);
    outgoing.get(edge.source)?.add(edge.target);
  });

  const resolvedRootId = byId.has(rootId) ? rootId : nodes[0]?.id;
  if (!resolvedRootId) return new Map<string, UnifiedGraphPosition>();
  const depth = new Map<string, number>();
  const inferredParent = new Map<string, string>();
  const queue = [resolvedRootId];
  depth.set(resolvedRootId, 0);
  for (let cursor = 0; cursor < queue.length; cursor += 1) {
    const current = queue[cursor];
    const neighbours = [...(outgoing.get(current) || []), ...(adjacency.get(current) || [])].filter((id, index, values) => values.indexOf(id) === index).sort();
    neighbours.forEach((neighbour) => {
      if (depth.has(neighbour)) return;
      depth.set(neighbour, (depth.get(current) || 0) + 1);
      inferredParent.set(neighbour, current);
      queue.push(neighbour);
    });
  }

  const disconnected = nodes.filter((node) => !depth.has(node.id)).sort((left, right) => left.id.localeCompare(right.id));
  disconnected.forEach((node) => {
    depth.set(node.id, 2);
    inferredParent.set(node.id, resolvedRootId);
  });

  const parentFor = (node: UnifiedGraphLayoutNode) => node.parentId && byId.has(node.parentId) ? node.parentId : inferredParent.get(node.id);
  const branchFor = (nodeId: string) => {
    if (nodeId === resolvedRootId) return resolvedRootId;
    let current = nodeId;
    let parent = parentFor(byId.get(current)!);
    const seen = new Set([current]);
    while (parent && parent !== resolvedRootId && !seen.has(parent)) {
      seen.add(parent);
      current = parent;
      parent = parentFor(byId.get(current)!);
    }
    return parent === resolvedRootId ? current : nodeId;
  };

  const branches = new Map<string, UnifiedGraphLayoutNode[]>();
  nodes.filter((node) => node.id !== resolvedRootId).forEach((node) => {
    const branch = branchFor(node.id);
    const group = branches.get(branch) || [];
    group.push(node);
    branches.set(branch, group);
  });
  const orderedBranches = [...branches.entries()].sort(([leftId, left], [rightId, right]) => right.length - left.length || leftId.localeCompare(rightId));
  const branchCenters = new Map<string, UnifiedGraphPosition>();
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  orderedBranches.forEach(([branchId], index) => {
    const count = orderedBranches.length;
    const yUnit = count === 1 ? 0 : 1 - (index / (count - 1)) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - yUnit * yUnit));
    const angle = index * goldenAngle + hashUnit(branchId, 13) * 0.8;
    const radius = 18 + Math.log2(Math.max(2, nodes.length)) * 1.7;
    branchCenters.set(branchId, { x: Math.cos(angle) * radial * radius, y: yUnit * radius * 0.72, z: Math.sin(angle) * radial * radius });
  });

  const positions = new Map<string, MutablePosition>();
  positions.set(resolvedRootId, { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0 });
  orderedBranches.forEach(([branchId, branchNodes]) => {
    const center = branchCenters.get(branchId)!;
    const spread = 6 + Math.cbrt(branchNodes.length) * 2.2;
    branchNodes.sort((left, right) => (depth.get(left.id) || 0) - (depth.get(right.id) || 0) || (right.weight || 0) - (left.weight || 0) || left.id.localeCompare(right.id));
    branchNodes.forEach((node, index) => {
      const level = Math.max(1, depth.get(node.id) || 1);
      const phi = Math.acos(1 - 2 * hashUnit(node.id, 7));
      const theta = Math.PI * 2 * hashUnit(node.id, 19) + index * goldenAngle;
      const localRadius = node.id === branchId ? 0 : spread * (0.4 + 0.8 * hashUnit(node.id, 31)) + Math.min(level, 8) * 1;
      positions.set(node.id, {
        x: center.x + Math.sin(phi) * Math.cos(theta) * localRadius,
        y: center.y + Math.cos(phi) * localRadius * 0.82,
        z: center.z + Math.sin(phi) * Math.sin(theta) * localRadius,
        vx: 0,
        vy: 0,
        vz: 0
      });
    });
  });

  // A bounded force pass turns the hierarchy into an organic knowledge cloud:
  // links pull related records together while every branch keeps a stable home.
  const iterations = nodes.length > 700 ? 34 : nodes.length > 250 ? 48 : 64;
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    const cooling = 1 - iteration / iterations;
    edges.forEach((edge) => {
      const source = positions.get(edge.source);
      const target = positions.get(edge.target);
      if (!source || !target) return;
      const dx = target.x - source.x;
      const dy = target.y - source.y;
      const dz = target.z - source.z;
      const distance = Math.max(0.01, Math.hypot(dx, dy, dz));
      const desired = parentFor(byId.get(edge.target)!) === edge.source ? 5.2 : 9.2;
      const force = (distance - desired) * 0.015 * cooling;
      const fx = dx / distance * force;
      const fy = dy / distance * force;
      const fz = dz / distance * force;
      if (edge.source !== resolvedRootId) { source.vx += fx; source.vy += fy; source.vz += fz; }
      if (edge.target !== resolvedRootId) { target.vx -= fx; target.vy -= fy; target.vz -= fz; }
    });
    nodes.forEach((node, nodeIndex) => {
      if (node.id === resolvedRootId) return;
      const position = positions.get(node.id)!;
      const center = branchCenters.get(branchFor(node.id)) || { x: 0, y: 0, z: 0 };
      const gravity = node.id === branchFor(node.id) ? 0.032 : 0.0045;
      position.vx += (center.x - position.x) * gravity * cooling;
      position.vy += (center.y - position.y) * gravity * cooling;
      position.vz += (center.z - position.z) * gravity * cooling;
      // Deterministic sampled repulsion avoids quadratic work on company-scale maps.
      for (let sample = 1; sample <= Math.min(8, nodes.length - 1); sample += 1) {
        const other = positions.get(nodes[(nodeIndex + sample * 97) % nodes.length].id);
        if (!other || other === position) continue;
        const dx = position.x - other.x;
        const dy = position.y - other.y;
        const dz = position.z - other.z;
        const squared = Math.max(0.35, dx * dx + dy * dy + dz * dz);
        const force = 0.34 * cooling / squared;
        position.vx += dx * force;
        position.vy += dy * force;
        position.vz += dz * force;
      }
    });
    positions.forEach((position, id) => {
      if (id === resolvedRootId) return;
      position.vx *= 0.76;
      position.vy *= 0.76;
      position.vz *= 0.76;
      position.x += position.vx;
      position.y += position.vy;
      position.z += position.vz;
    });
  }

  return new Map([...positions].map(([id, position]) => [id, { x: position.x, y: position.y, z: position.z }]));
}
