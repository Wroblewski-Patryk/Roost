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

function layoutWholeCompany(
  nodes: CompanyGraphLayoutNode[],
  edges: CompanyGraphLayoutEdge[],
  workspaceId: string,
  departmentIds: string[]
) {
  const positions = new Map<string, CompanyGraphPosition>();
  const departmentSet = new Set(departmentIds);
  const departmentByRecord = new Map<string, string>();
  for (const edge of edges) {
    if (departmentSet.has(edge.from.entityId) && !departmentSet.has(edge.to.entityId) && edge.to.entityId !== workspaceId) departmentByRecord.set(edge.to.entityId, departmentByRecord.get(edge.to.entityId) ?? edge.from.entityId);
    if (departmentSet.has(edge.to.entityId) && !departmentSet.has(edge.from.entityId) && edge.from.entityId !== workspaceId) departmentByRecord.set(edge.from.entityId, departmentByRecord.get(edge.from.entityId) ?? edge.to.entityId);
  }
  const byDepartment = new Map(departmentIds.map((id) => [id, [] as CompanyGraphLayoutNode[]]));
  const unassigned: CompanyGraphLayoutNode[] = [];
  nodes.filter((node) => node.id !== workspaceId && !departmentSet.has(node.id)).forEach((node) => {
    const departmentId = departmentByRecord.get(node.id);
    if (departmentId) byDepartment.get(departmentId)?.push(node);
    else unassigned.push(node);
  });
  byDepartment.forEach((records) => records.sort((left, right) => left.entityType.localeCompare(right.entityType) || left.label.localeCompare(right.label)));
  unassigned.sort((left, right) => left.entityType.localeCompare(right.entityType) || left.label.localeCompare(right.label));

  const clusters = [
    ...departmentIds.map((id) => ({ id, records: byDepartment.get(id) ?? [] })),
    ...(unassigned.length ? [{ id: workspaceId, records: unassigned }] : [])
  ];
  const clusterColumns = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(clusters.length))));
  const clusterGap = 220;
  const clusterPadding = 70;
  const measured = clusters.map((cluster) => {
    const columns = Math.max(1, Math.min(6, Math.ceil(Math.sqrt(Math.max(cluster.records.length, 1) * 1.5))));
    const rows = Math.max(1, Math.ceil(cluster.records.length / columns));
    return { ...cluster, columns, width: columns * (nodeWidth + nodeGap) - nodeGap + clusterPadding * 2, height: 150 + rows * (nodeHeight + nodeGap) + clusterPadding };
  });
  const columnWidths = Array.from({ length: clusterColumns }, (_, column) => Math.max(...measured.filter((_, index) => index % clusterColumns === column).map((cluster) => cluster.width), nodeWidth));
  const columnOffsets = columnWidths.map((_, index) => columnWidths.slice(0, index).reduce((sum, width) => sum + width + clusterGap, 0));
  const rowHeights: number[] = [];
  measured.forEach((cluster, index) => { const row = Math.floor(index / clusterColumns); rowHeights[row] = Math.max(rowHeights[row] ?? 0, cluster.height); });
  const rowOffsets = rowHeights.map((_, index) => rowHeights.slice(0, index).reduce((sum, height) => sum + height + clusterGap, 0));
  const totalWidth = columnWidths.reduce((sum, width) => sum + width, 0) + clusterGap * Math.max(0, clusterColumns - 1);
  positions.set(workspaceId, { x: totalWidth / 2 - nodeWidth / 2, y: 0 });

  measured.forEach((cluster, index) => {
    const column = index % clusterColumns;
    const row = Math.floor(index / clusterColumns);
    const left = columnOffsets[column]!;
    const top = 260 + rowOffsets[row]!;
    if (cluster.id !== workspaceId) positions.set(cluster.id, { x: left + cluster.width / 2 - nodeWidth / 2, y: top });
    cluster.records.forEach((record, recordIndex) => {
      const recordColumn = recordIndex % cluster.columns;
      const recordRow = Math.floor(recordIndex / cluster.columns);
      positions.set(record.id, { x: left + clusterPadding + recordColumn * (nodeWidth + nodeGap), y: top + 150 + recordRow * (nodeHeight + nodeGap) });
    });
  });
  return positions;
}

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
  const workspace = nodes.find((node) => node.entityType === "workspace");
  const departments = nodes.filter((node) => node.entityType === "department").sort((left, right) => left.label.localeCompare(right.label));
  if (workspace && departments.length > 1 && nodes.length > departments.length + 1) {
    return layoutWholeCompany(nodes, edges, workspace.id, departments.map((department) => department.id));
  }
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
