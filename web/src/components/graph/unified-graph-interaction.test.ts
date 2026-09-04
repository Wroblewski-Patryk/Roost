import assert from "node:assert/strict";
import test from "node:test";
import { graphHoverClearDelayMs, graphNodeHitRadius, resolveInstancedItem } from "./unified-graph-interaction";

test("node hit areas remain larger than small visual nodes", () => {
  assert.equal(graphNodeHitRadius(0.24), 0.42);
  assert.equal(graphNodeHitRadius(0.46), 0.62);
});

test("instanced hover resolves only valid node indices", () => {
  const nodes = [{ id: "first" }, { id: "second" }];
  assert.equal(resolveInstancedItem(nodes, 1)?.id, "second");
  assert.equal(resolveInstancedItem(nodes), null);
  assert.equal(resolveInstancedItem(nodes, -1), null);
  assert.equal(resolveInstancedItem(nodes, 2), null);
});

test("hover clear delay is short enough to feel immediate", () => {
  assert.ok(graphHoverClearDelayMs > 0 && graphHoverClearDelayMs <= 100);
});
