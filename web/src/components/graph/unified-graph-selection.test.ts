import assert from "node:assert/strict";
import test from "node:test";
import { resolveGraphSelection } from "./unified-graph-selection";

const edges = [
  { id: "root-area", source: "root", target: "area" },
  { id: "area-folder", source: "area", target: "folder" },
  { id: "folder-human", source: "folder", target: "human" },
  { id: "human-note", source: "human", target: "note" },
  { id: "human-task", source: "human", target: "task" },
  { id: "area-other", source: "area", target: "other" }
];

test("highlights the shortest path to the root and every direct neighbour", () => {
  const selection = resolveGraphSelection(edges, "human", "root")!;
  assert.deepEqual(selection.pathIds, ["human", "folder", "area", "root"]);
  assert.deepEqual([...selection.directIds].sort(), ["folder", "note", "task"]);
  assert.deepEqual([...selection.highlightedIds].sort(), ["area", "folder", "human", "note", "root", "task"]);
  assert.deepEqual([...selection.pathEdgeIds].sort(), ["area-folder", "folder-human", "root-area"]);
  assert.deepEqual([...selection.highlightedEdgeIds].sort(), ["area-folder", "folder-human", "human-note", "human-task", "root-area"]);
});

test("does not imply a root relationship when no recorded path exists", () => {
  const selection = resolveGraphSelection(edges, "isolated", "root")!;
  assert.deepEqual(selection.pathIds, ["isolated"]);
  assert.deepEqual([...selection.highlightedIds], ["isolated"]);
  assert.equal(selection.highlightedEdgeIds.size, 0);
});

test("uses a deterministic shortest path when cycles provide alternatives", () => {
  const selection = resolveGraphSelection([
    { id: "selected-b", source: "selected", target: "b" },
    { id: "b-root", source: "b", target: "root" },
    { id: "selected-a", source: "selected", target: "a" },
    { id: "a-root", source: "a", target: "root" }
  ], "selected", "root")!;
  assert.deepEqual(selection.pathIds, ["selected", "a", "root"]);
});
