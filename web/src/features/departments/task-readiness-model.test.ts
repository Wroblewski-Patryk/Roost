import assert from "node:assert/strict";
import test from "node:test";
import { selectReferences, validationSections } from "./task-readiness-model";

test("selecting another source preserves old revisions until explicit review", () => {
  const old = [{ id: "a", revision: "old", evidence: "Reviewed evidence" }];
  const catalog = [{ id: "a", revision: "new", label: "Source A" }, { id: "b", revision: "current", label: "Source B" }];
  assert.deepEqual(selectReferences(old, catalog, ["a", "b"]), [...old, { id: "b", revision: "current" }]);
  assert.deepEqual(selectReferences(old, catalog, ["a"], true), [{ id: "a", revision: "new", evidence: "Reviewed evidence" }]);
});
test("diagnostics permit only translated sections, never unknown fields or values", () => {
  assert.deepEqual(validationSections({ issues: [{ field: "contract.context.technical", reason: "SYNTHETIC_SECRET" }, { field: "SYNTHETIC_SECRET", reason: "invalid" }] }), ["technical", "general"]);
});
