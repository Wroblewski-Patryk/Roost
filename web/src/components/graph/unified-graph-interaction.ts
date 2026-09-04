export const graphHoverClearDelayMs = 90;

export function graphNodeHitRadius(visualRadius: number) {
  return Math.max(0.42, visualRadius + 0.16);
}

export function resolveInstancedItem<T>(items: T[], instanceId?: number) {
  if (typeof instanceId !== "number" || instanceId < 0 || instanceId >= items.length) return null;
  return items[instanceId] ?? null;
}
