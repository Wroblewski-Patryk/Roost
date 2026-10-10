import assert from "node:assert/strict";
import { test } from "node:test";
import { informationReviewTaskStatus } from "./company-information-runtime";

test("information result review preserves ClickUp-owned task status", () => {
  assert.equal(informationReviewTaskStatus("clickup", "accept"), null);
  assert.equal(informationReviewTaskStatus("clickup", "return"), null);
  assert.equal(informationReviewTaskStatus(null, "accept"), "done");
  assert.equal(informationReviewTaskStatus(null, "return"), "todo");
});
