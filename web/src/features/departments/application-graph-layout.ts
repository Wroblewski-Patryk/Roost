import type { ApplicationGraphNode } from "./application-graph-types";

export type GraphPosition = { x: number; y: number };

export function getApplicationGraphNodeSize(node: ApplicationGraphNode, focusId: string) {
  if (node.id === focusId && node.type === "portfolio") return { width: 200, height: 200 };
  if (node.id === focusId) return { width: 256, height: node.type === "application" ? 112 : 100 };
  if (node.path.includes(focusId)) {
    if (node.type === "application") return { width: 240, height: 112 };
    if (["domain", "capability", "feature", "layer"].includes(node.type)) return { width: 216, height: 84 };
    if (node.type === "implementation") return { width: 204, height: 80 };
    return { width: 240, height: 100 };
  }
  return { width: 172, height: 68 };
}

function boxesOverlap(left: GraphPosition & { width: number; height: number }, right: GraphPosition & { width: number; height: number }, padding = 36) {
  return left.x < right.x + right.width + padding
    && left.x + left.width + padding > right.x
    && left.y < right.y + right.height + padding
    && left.y + left.height + padding > right.y;
}

export function findApplicationGraphLayoutCollisions(nodes: ApplicationGraphNode[], focus: ApplicationGraphNode, positions: Map<string, GraphPosition>) {
  const boxes = nodes.flatMap((node) => {
    const position = positions.get(node.id);
    return position ? [{ ...position, ...getApplicationGraphNodeSize(node, focus.id), id: node.id }] : [];
  });
  const collisions: Array<[string, string]> = [];
  for (let leftIndex = 0; leftIndex < boxes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < boxes.length; rightIndex += 1) {
      const left = boxes[leftIndex];
      const right = boxes[rightIndex];
      if (left && right && boxesOverlap(left, right)) collisions.push([left.id, right.id]);
    }
  }
  return collisions;
}

function resolveLayoutCollisions(nodes: ApplicationGraphNode[], focus: ApplicationGraphNode, positions: Map<string, GraphPosition>) {
  const ordered = nodes
    .filter((node) => positions.has(node.id))
    .sort((left, right) => {
      if (left.id === focus.id) return -1;
      if (right.id === focus.id) return 1;
      const leftPosition = positions.get(left.id)!;
      const rightPosition = positions.get(right.id)!;
      return leftPosition.x - rightPosition.x || leftPosition.y - rightPosition.y || left.label.localeCompare(right.label);
    });
  const placed: Array<GraphPosition & { id: string; width: number; height: number }> = [];
  for (const node of ordered) {
    const original = positions.get(node.id)!;
    const size = getApplicationGraphNodeSize(node, focus.id);
    const candidate = { ...original, ...size, id: node.id };
    if (node.id !== focus.id) {
      let collision = placed.find((other) => boxesOverlap(candidate, other));
      while (collision) {
        candidate.y = collision.y + collision.height + 36;
        collision = placed.find((other) => boxesOverlap(candidate, other));
      }
      positions.set(node.id, { x: candidate.x, y: candidate.y });
    }
    placed.push(candidate);
  }
}

export function layoutApplicationGraphNodes(nodes: ApplicationGraphNode[], focus: ApplicationGraphNode) {
  const positions = new Map<string, GraphPosition>();
  positions.set(focus.id, { x: 0, y: 0 });

  const lineage = focus.path
    .slice(0, -1)
    .map((id) => nodes.find((node) => node.id === id))
    .filter((node): node is ApplicationGraphNode => Boolean(node));
  lineage.forEach((node, index) => {
    positions.set(node.id, { x: -460, y: (index - (lineage.length - 1) / 2) * 132 });
  });

  const depthById = new Map<string, number>([[focus.id, 0]]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of nodes) {
      if (!node.parentNodeId || depthById.has(node.id)) continue;
      const parentDepth = depthById.get(node.parentNodeId);
      if (parentDepth === undefined) continue;
      depthById.set(node.id, parentDepth + 1);
      changed = true;
    }
  }

  const firstLevelCount = nodes.filter((node) => depthById.get(node.id) === 1).length;
  const firstLevelColumns = firstLevelCount > 18 ? 3 : firstLevelCount > 6 ? 2 : 1;
  const firstLevel = nodes
    .filter((node) => depthById.get(node.id) === 1)
    .sort((left, right) => Number(right.isBlocked) - Number(left.isBlocked) || left.label.localeCompare(right.label));
  const secondLevel = nodes
    .filter((node) => depthById.get(node.id) === 2)
    .sort((left, right) => Number(right.isBlocked) - Number(left.isBlocked) || left.label.localeCompare(right.label));

  if (secondLevel.length > 0) {
    let groupTop = 0;
    const groupedPositions: Array<[string, GraphPosition]> = [];
    for (const parent of firstLevel) {
      const children = secondLevel.filter((node) => node.parentNodeId === parent.id);
      const columns = Math.min(4, Math.max(children.length, 1));
      const rows = Math.max(1, Math.ceil(children.length / columns));
      const groupHeight = (rows - 1) * 142 + 100;
      const parentHeight = getApplicationGraphNodeSize(parent, focus.id).height;
      groupedPositions.push([parent.id, { x: 390, y: groupTop + groupHeight / 2 - parentHeight / 2 }]);
      children.forEach((child, index) => {
        groupedPositions.push([child.id, {
          x: 730 + (index % columns) * 310,
          y: groupTop + Math.floor(index / columns) * 142
        }]);
      });
      groupTop += groupHeight + 48;
    }
    const verticalOffset = Math.max(0, groupTop - 48) / 2 - getApplicationGraphNodeSize(focus, focus.id).height / 2;
    groupedPositions.forEach(([id, position]) => positions.set(id, { x: position.x, y: position.y - verticalOffset }));
  } else {
    firstLevel.forEach((node, index) => {
      if (lineage.length === 0 && firstLevel.length <= 8) {
        const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(firstLevel.length, 1);
        positions.set(node.id, { x: Math.cos(angle) * 410, y: Math.sin(angle) * 310 });
      } else {
        const column = index % firstLevelColumns;
        const row = Math.floor(index / firstLevelColumns);
        positions.set(node.id, {
          x: 390 + column * 340,
          y: (row - (Math.ceil(firstLevel.length / firstLevelColumns) - 1) / 2) * 142
        });
      }
    });
  }

  const relations = nodes.filter((node) => !positions.has(node.id));
  relations.forEach((node, index) => {
    positions.set(node.id, { x: 180 + (index % 3) * 320, y: 400 + Math.floor(index / 3) * 142 });
  });
  resolveLayoutCollisions(nodes, focus, positions);
  return positions;
}
