import assert from "node:assert/strict";
import test from "node:test";
import { interpolateApplicationGraphPositions } from "./application-graph-motion";

test("interpolates persistent graph nodes while placing new nodes at their target", () => {
  const from = new Map([["persistent", { x: 10, y: 20 }]]);
  const to = new Map([
    ["persistent", { x: 110, y: 220 }],
    ["new", { x: 300, y: 400 }]
  ]);
  const positions = interpolateApplicationGraphPositions(from, to, 0.5);
  assert.deepEqual(positions.get("persistent"), { x: 60, y: 120 });
  assert.deepEqual(positions.get("new"), { x: 300, y: 400 });
});

test("clamps animation progress to stable endpoints", () => {
  const from = new Map([["node", { x: 20, y: 40 }]]);
  const to = new Map([["node", { x: 120, y: 240 }]]);
  assert.deepEqual(interpolateApplicationGraphPositions(from, to, -1).get("node"), { x: 20, y: 40 });
  assert.deepEqual(interpolateApplicationGraphPositions(from, to, 2).get("node"), { x: 120, y: 240 });
});
