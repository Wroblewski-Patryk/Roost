import assert from "node:assert/strict";
import test from "node:test";
import { resolveDepartmentEntry } from "../operating-model/department-registry";

test("normalizes legacy Company OS department labels to canonical departments", () => {
  const cases = new Map([
    ["Engineering", "09-technologia"],
    ["Marketing", "03-sprzedaz"],
    ["Customer Success", "05-relacje"],
    ["HR", "06-kadry"],
    ["Agent Management", "06-kadry"],
    ["Knowledge", "08-zasoby"],
    ["Documentation", "08-zasoby"],
    ["Design", "02-produkt"],
    ["UX", "02-produkt"],
    ["CEO Office", "12-zarzadzanie"]
  ]);

  for (const [label, expected] of cases) {
    assert.equal(resolveDepartmentEntry(label)?.canonicalKey, expected, label);
  }
});
