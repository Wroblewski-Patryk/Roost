import assert from "node:assert/strict";
import test from "node:test";
import { decisionDomains, mandateBody } from "../modules/decisions/decision-authority-contract";
import { hierarchyPath, resolveDecisionAuthority, type AuthorityMandate, type AuthorityWorker } from "../modules/decisions/decision-authority-policy";
import { canonicalDepartmentKeys } from "../operating-model/department-registry";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const workspace = id(1), owner = id(2), now = Date.parse("2026-09-08T12:00:00Z");
const worker = (n: number, department: string, manager: number | null, director = false): AuthorityWorker => ({ id: id(n), workspaceId: workspace,
  principal: { kind: "agent", id: id(n) }, active: true, managerIds: manager ? [id(manager)] : [], departmentKeys: [department], hierarchyLevel: director ? "department_director" : "specialist", revision: "1" });
const workers = [worker(10, "11-innowacje", 11), worker(11, "11-innowacje", null, true), worker(12, "09-technologia", null, true), worker(13, "09-technologia", 12)];
const mandate: AuthorityMandate = { id: id(20), workspaceId: workspace, version: 1, revision: "1", issuer: { kind: "user", id: owner }, holder: { kind: "agent", id: id(12) },
  departmentKey: "09-technologia", entities: [{ type: "task", id: id(30) }], decisionDomains: ["ordinary_domain"], operations: ["accept_decision"],
  exclusions: [], exclusionReason: "No additional exclusions", maxRisk: "medium", startsAt: "2026-09-08T10:00:00Z", endsAt: "2026-09-09T10:00:00Z", status: "active", sourceDecisionId: id(40), reason: "Exact task authority" };
const base = { workspaceId: workspace, ownerUserId: owner, workers, mandates: [mandate], declaration: { domain: "ordinary_domain" as const,
  departmentKey: "09-technologia" as const, requesterId: id(10), recipientId: id(13), entities: mandate.entities }, operation: "accept_decision", risk: "medium" as const, now };

test("cross-department route follows both peer directors, independent of record order", () => {
  for (const roster of [workers, [...workers].reverse()]) assert.deepEqual(hierarchyPath(workspace, roster, id(10), id(13)).path, [10, 11, 12, 13].map(id));
  assert.deepEqual(hierarchyPath(workspace, workers, id(13), id(12)).path, [13, 12].map(id));
});
test("twelve directors remain peers; Management coordinates without a superior edge", () => {
  const directors = canonicalDepartmentKeys.slice(1).map((key,n) => worker(100 + n, key, null, true));
  for (const from of directors) for (const to of directors) assert.deepEqual(hierarchyPath(workspace, directors, from.id, to.id).path, from.id === to.id ? [from.id] : [from.id, to.id]);
});
test("an explicit owner reporting edge preserves the peer route and is watched", () => {
  const roster=structuredClone(workers);
  const root={...worker(99,"00-ogolny",null),principal:{kind:"user" as const,id:owner}};
  roster[1]!.managerIds=[root.id];roster[2]!.managerIds=[root.id];roster.push(root);
  const route=hierarchyPath(workspace,roster,id(10),id(13),owner);
  assert.equal(route.status,"valid");assert.deepEqual(route.path,[10,11,12,13].map(id));
  if(route.status==="valid")assert.ok(route.watchIds.includes(root.id));
  assert.equal(hierarchyPath(workspace,roster,id(10),id(13),id(999)).status,"blocked");
});
test("malformed or incomplete reporting never guesses a route", () => {
  const fixtures: Array<[string, (roster: AuthorityWorker[]) => void]> = [
    ["hierarchy_cycle", roster => { roster[1]!.hierarchyLevel = "specialist"; roster[1]!.managerIds = [id(10)]; }],
    ["hierarchy_manager_ambiguous", roster => { roster[0]!.managerIds.push(id(12)); }],
    ["hierarchy_missing_principal", roster => { roster[0]!.managerIds = [id(999)]; }],
    ["hierarchy_department_ambiguous", roster => { roster[0]!.departmentKeys.push("09-technologia"); }],
    ["hierarchy_department_ambiguous", roster => { roster[0]!.departmentKeys = ["00-ogolny"]; }],
    ["hierarchy_department_bypass", roster => { roster[0]!.managerIds = [id(13)]; }],
    ["hierarchy_director_not_peer", roster => { roster[1]!.managerIds = [id(12)]; }],
    ["hierarchy_director_ambiguous", roster => { roster.push(worker(99, "11-innowacje", null, true)); }],
    ["hierarchy_missing_supervisor", roster => { roster[1]!.hierarchyLevel = "CEO Director Owner"; }],
    ["hierarchy_missing_principal", roster => { roster[1]!.workspaceId = id(99); }]
  ];
  for (const [reason, mutate] of fixtures) {
    const roster = structuredClone(workers); mutate(roster);
    const result = hierarchyPath(workspace, roster, id(10), id(13));
    assert.equal(result.status, "blocked", reason); assert.equal("reason" in result && result.reason, reason);
  }
});
test("all five reserved domains and all critical decisions select only the current owner", () => {
  for (const domain of decisionDomains.filter(domain => domain !== "ordinary_domain")) {
    const result = resolveDecisionAuthority({ ...base, declaration: { ...base.declaration, domain } });
    assert.equal(result.status, "owner_reserved"); assert.deepEqual("principal" in result && result.principal, { kind: "user", id: owner });
  }
  assert.equal(resolveDecisionAuthority({ ...base, risk: "critical" }).status, "owner_reserved");
  assert.equal(resolveDecisionAuthority({ ...base, risk: null }).status, "blocked");
});
test("nearest exact mandate wins and retains full route, version and scope evidence", () => {
  const result = resolveDecisionAuthority(base);
  assert.equal(result.status, "delegated");
  if (result.status !== "delegated") return;
  assert.equal(result.mandate.id, mandate.id); assert.equal(result.mandate.version, 1);
  assert.deepEqual(result.path, [10, 11, 12, 13].map(id)); assert.deepEqual(result.scopeProof.entities, mandate.entities);
});
test("scope, operation, risk, time, identity and authority edits fail closed", () => {
  const changes: Partial<AuthorityMandate>[] = [
    { entities: [{ type: "project", id: id(30) }] }, { entities: [] }, { exclusions: mandate.entities },
    { operations: ["answer_interview"] }, { maxRisk: "low" }, { status: "suspended" }, { status: "revoked" },
    { startsAt: "2026-09-08T13:00:00Z" }, { endsAt: "2026-09-08T12:00:00Z" }, { workspaceId: id(999) },
    { issuer: { kind: "user", id: id(999) } }, { departmentKey: "11-innowacje" }, { holder: { kind: "agent", id: id(999) } }
  ];
  for (const change of changes) assert.equal(resolveDecisionAuthority({ ...base, mandates: [{ ...mandate, ...change }] }).status, "blocked", JSON.stringify(change));
  const duplicate = resolveDecisionAuthority({ ...base, mandates: [mandate, { ...mandate, id: id(21) }] });
  assert.equal("reason" in duplicate && duplicate.reason, "authority_mandate_ambiguous");
});
test("a delegated mandate cannot include reserved domains or critical risk", () => {
  const { id: _id, workspaceId: _workspace, issuer: _issuer, revision: _revision, version: _version, ...body } = mandate;
  assert.equal(mandateBody.safeParse(body).success, true);
  for (const domain of decisionDomains.filter(domain => domain !== "ordinary_domain")) assert.equal(mandateBody.safeParse({ ...body, decisionDomains: [domain] }).success, false);
  assert.equal(mandateBody.safeParse({ ...body, maxRisk: "critical" }).success, false);
});
