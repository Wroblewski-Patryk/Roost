import type { GraphPosition } from "./application-graph-layout";

export function interpolateApplicationGraphPositions(
  from: Map<string, GraphPosition>,
  to: Map<string, GraphPosition>,
  progress: number
) {
  const boundedProgress = Math.max(0, Math.min(1, progress));
  const positions = new Map<string, GraphPosition>();
  to.forEach((target, id) => {
    const start = from.get(id) ?? target;
    positions.set(id, {
      x: start.x + (target.x - start.x) * boundedProgress,
      y: start.y + (target.y - start.y) * boundedProgress
    });
  });
  return positions;
}
