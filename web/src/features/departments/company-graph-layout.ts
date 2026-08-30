export type CompanyGraphLayoutNode = {
  id: string;
  entityType: string;
  label: string;
};

export type CompanyGraphLayoutEdge = {
  from: { entityId: string };
  to: { entityId: string };
};

export type CompanyGraphPosition = { x: number; y: number };

const nodeWidth = 220;
const nodeHeight = 86;
const nodeGap = 44;
const componentGap = 180;

function componentBounds(ids: string[], positions: Map<string, CompanyGraphPosition>) {
  const points = ids.map((id) => positions.get(id)).filter((position): position is CompanyGraphPosition => Boolean(position));
  const left = Math.min(...points.map((position) => position.x));
  const top = Math.min(...points.map((position) => position.y));
  const right = Math.max(...points.map((position) => position.x + nodeWidth));
  const bottom = Math.max(...points.map((position) => position.y + nodeHeight));
  return { left, top, width: right - left, height: bottom - top };
}

/**
 * Places connected company objects around the most connected record in each
 * component. The graph therefore communicates relationships instead of merely
 * grouping records by their backend type.
 */
export function layoutCompanyGraphNodes(nodes: CompanyGraphLayoutNode[], edges: CompanyGraphLayoutEdge[]) {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const adjacency = new Map(nodes.map((node) => [node.id, new Set<string>()]));
  for (const edge of edges) {
    const source = edge.from.entityId;
    const target = edge.to.entityId;
    if (!byId.has(source) || !byId.has(target) || source === target) continue;
    adjacency.get(source)?.add(target);
    adjacency.get(target)?.add(source);
  }

  const components: string[][] = [];
  const visited = new Set<string>();
  const stableNodes = [...nodes].sort((left, right) => left.label.localeCompare(right.label) || left.id.localeCompare(right.id));
  for (const node of stableNodes) {
    if (visited.has(node.id)) continue;
    const component: string[] = [];
    const queue = [node.id];
    visited.add(node.id);
    while (queue.length) {
      const id = queue.shift()!;
      component.push(id);
      for (const neighbour of [...(adjacency.get(id) ?? [])].sort()) {
        if (visited.has(neighbour)) continue;
        visited.add(neighbour);
        queue.push(neighbour);
      }
    }
    components.push(component);
  }
  components.sort((left, right) => right.length - left.length || left[0]!.localeCompare(right[0]!));

  const positions = new Map<string, CompanyGraphPosition>();
  const packed: Array<{ ids: string[]; width: number; height: number; left: number; top: number }> = [];
  for (const ids of components) {
    if (ids.length === 1) {
      positions.set(ids[0]!, { x: 0, y: 0 });
    } else {
      const hub = [...ids].sort((left, right) =>
        (adjacency.get(right)?.size ?? 0) - (adjacency.get(left)?.size ?? 0)
        || byId.get(left)!.label.localeCompare(byId.get(right)!.label)
      )[0]!;
      const levelById = new Map<string, number>([[hub, 0]]);
      const queue = [hub];
      while (queue.length) {
        const id = queue.shift()!;
        for (const neighbour of adjacency.get(id) ?? []) {
          if (levelById.has(neighbour)) continue;
          levelById.set(neighbour, levelById.get(id)! + 1);
          queue.push(neighbour);
        }
      }
      positions.set(hub, { x: -nodeWidth / 2, y: -nodeHeight / 2 });
      const levels = new Map<number, string[]>();
      ids.filter((id) => id !== hub).forEach((id) => {
        const level = levelById.get(id) ?? 1;
        levels.set(level, [...(levels.get(level) ?? []), id]);
      });
      for (const [level, levelIds] of [...levels].sort(([left], [right]) => left - right)) {
        levelIds.sort((left, right) =>
          (adjacency.get(right)?.size ?? 0) - (adjacency.get(left)?.size ?? 0)
          || byId.get(left)!.entityType.localeCompare(byId.get(right)!.entityType)
          || byId.get(left)!.label.localeCompare(byId.get(right)!.label)
        );
        const minimumRadius = 320 + (level - 1) * 330;
        const circumferenceRadius = (levelIds.length * (nodeWidth + nodeGap)) / (2 * Math.PI);
        const radius = Math.max(minimumRadius, circumferenceRadius);
        levelIds.forEach((id, index) => {
          const angle = -Math.PI / 2 + (Math.PI * 2 * index) / levelIds.length;
          positions.set(id, {
            x: Math.cos(angle) * radius - nodeWidth / 2,
            y: Math.sin(angle) * radius - nodeHeight / 2
          });
        });
      }
    }
    const bounds = componentBounds(ids, positions);
    packed.push({ ids, width: bounds.width, height: bounds.height, left: bounds.left, top: bounds.top });
  }

  const targetRowWidth = Math.max(1080, Math.sqrt(packed.reduce((sum, item) => sum + item.width * item.height, 0)) * 1.35);
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  for (const component of packed) {
    if (cursorX > 0 && cursorX + component.width > targetRowWidth) {
      cursorX = 0;
      cursorY += rowHeight + componentGap;
      rowHeight = 0;
    }
    const offsetX = cursorX - component.left;
    const offsetY = cursorY - component.top;
    component.ids.forEach((id) => {
      const position = positions.get(id)!;
      positions.set(id, { x: position.x + offsetX, y: position.y + offsetY });
    });
    cursorX += component.width + componentGap;
    rowHeight = Math.max(rowHeight, component.height);
  }

  return positions;
}

export function findCompanyGraphLayoutCollisions(nodes: CompanyGraphLayoutNode[], positions: Map<string, CompanyGraphPosition>) {
  const collisions: Array<[string, string]> = [];
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    const left = nodes[leftIndex]!;
    const leftPosition = positions.get(left.id)!;
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const right = nodes[rightIndex]!;
      const rightPosition = positions.get(right.id)!;
      const overlaps = leftPosition.x < rightPosition.x + nodeWidth + nodeGap
        && leftPosition.x + nodeWidth + nodeGap > rightPosition.x
        && leftPosition.y < rightPosition.y + nodeHeight + nodeGap
        && leftPosition.y + nodeHeight + nodeGap > rightPosition.y;
      if (overlaps) collisions.push([left.id, right.id]);
    }
  }
  return collisions;
}
