import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import childProcess from "node:child_process";
import { createOwnerTicketService, ticketHash } from "../modules/agent-runtime/owner-ticket";
import { ownerTicketHandler } from "../modules/agent-runtime/owner-ticket-http";
import { ownerTicketFixture } from "./owner-ticket-fixture";

test("valid issue and consume bind exact context, preserve false flags and return no launch receipt", async t => {
  for (const method of ["spawn", "spawnSync", "exec", "execSync", "execFile", "execFileSync", "fork"] as const)
    t.mock.method(childProcess, method, () => { throw Error("process creation forbidden"); });
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input);
  assert.equal(f.state().tickets.length, 1);
  const result = await f.service.consume(f.auth, f.consume(issued.ticket));
  assert.ok("consumeAck" in result); assert.equal(result.consumeAck.payload.firstUse, true);
  for (const flag of ["realIssuerQualified", "transportQualified", "launchAuthority"] as const) assert.equal(result[flag], false);
  assert.deepEqual(f.state().spent, [f.input.executionId]);
  assert.deepEqual(f.state().journal.map(j => j.state), ["issued", "consumed"]);
  assert.equal("launchReceipt" in result, false);
  assert.doesNotMatch(JSON.stringify(f.state()), /PRIVATE KEY|signature|leaseToken|publicKey"|acceptance"/);
});
for (const actor of ["admin", "member", "viewer", "other_owner", "agent", "worker", "old_member", "other_workspace"]) {
  test(`issue/consume/revoke/rotate refuse ${actor}`, async () => {
    const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input), bad: any = { ...f.auth };
    if (["admin", "member", "viewer"].includes(actor)) bad.workspaceRole = actor;
    if (actor === "other_owner") bad.userId = randomUUID();
    if (actor === "other_workspace") bad.workspaceId = randomUUID();
    if (["agent", "worker"].includes(actor)) { bad.authType = "api_key"; bad.apiKeyId = randomUUID(); }
    if (actor === "old_member") f.faults.member = false;
    await assert.rejects(f.service.issue(bad, f.input), /owner_ticket_forbidden/);
    await assert.rejects(f.service.consume(bad, f.consume(issued.ticket)), /owner_ticket_forbidden/);
    await assert.rejects(f.service.revoke(bad, { ticketId: issued.ticket.payload.ticketId, expectedVersion: 1 }), /owner_ticket_forbidden/);
    await assert.rejects(f.service.rotate(bad, { expectedEpoch: 1, nextKeyId: "next", nextPublicKeyDigest: "f".repeat(64) }), /owner_ticket_forbidden/);
    assert.equal(f.state().tickets[0].state, "issued");
  });
}
test("missing signer is unavailable, creates no key or row", async () => {
  const f = await ownerTicketFixture(), service = createOwnerTicketService(f.store, { ...f.options, signer: undefined });
  await assert.rejects(service.issue(f.auth, f.input), /owner_ticket_unavailable/);
  assert.equal(f.state().tickets.length, 0);
});
test("bad signer result and thrown secret are not returned over HTTP", async t => {
  const f = await ownerTicketFixture();
  const service = createOwnerTicketService(f.store, { ...f.options, signer: { ...f.options.signer, sign: async () => { throw Error("PRIVATE TEST SIGNER DIAGNOSTIC"); } } });
  const app = express(); app.use(express.json()); app.use((req, _res, next) => { req.auth = f.auth; next(); });
  app.post("/issue", ownerTicketHandler("issue", service));
  const server = app.listen(0, "127.0.0.1"); t.after(() => server.close());
  await new Promise<void>(r => server.once("listening", r));
  const port = (server.address() as any).port;
  const result = await fetch(`http://127.0.0.1:${port}/issue`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(f.input) });
  assert.equal(result.status, 503); assert.equal(result.headers.get("cache-control"), "no-store");
  assert.doesNotMatch(await result.text(), /PRIVATE TEST|stack|signer/i); assert.equal(f.state().tickets.length, 0);
  const bad = createOwnerTicketService(f.store, { ...f.options, signer: { ...f.options.signer, sign: async () => Buffer.alloc(64) } });
  await assert.rejects(bad.issue(f.auth, f.input), /owner_ticket_signing_failed/);
});
const drift: Record<string, (f: Awaited<ReturnType<typeof ownerTicketFixture>>) => void> = {
  decision: f => { f.c.acceptance.revision++; }, missingDecision: f => { f.faults.current = true; },
  revokedDecision: f => { f.c.acceptance.state = "revoked"; }, Ready: f => { f.c.contextDigest = "d".repeat(64); },
  Writer: f => { f.c.acceptance.scope.writerDigest = "d".repeat(64); }, input: f => { f.c.acceptance.scope.inputSeal = "d".repeat(64); },
  claim: f => { f.c.claimDigest = "d".repeat(64); f.c.contextDigest = "e".repeat(64); },
  backend: f => { f.c.acceptance.provider.kind = "direct_codex"; },
  model: f => { f.c.acceptance.provider.modelSelection.modelSelection.model = "gpt-6-astra"; },
  reasoning: f => { f.c.acceptance.provider.modelSelection.modelSelection.reasoningEffort = "high"; },
  scope: f => { f.c.acceptance.scope.filesystemDigest = "d".repeat(64); },
  risk: f => { f.c.acceptance.provider.managedBackend.context.riskDigest = "d".repeat(64); },
  budget: f => { f.c.acceptance.provider.managedBackend.context.budgetDigest = "d".repeat(64); },
  release: f => { f.c.acceptance.provider.managedBackend.context.gates.release = "automatic"; },
  attempt: f => { f.c.acceptance.scope.executionId = randomUUID(); },
  acknowledgement: f => { f.c.acceptance.residualRiskAccepted = false; }
};
for (const [name, change] of Object.entries(drift)) test(`current ${name} drift denies issue and consume`, async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input), before = f.state(); change(f);
  await assert.rejects(f.service.issue(f.auth, f.input));
  await assert.rejects(f.service.consume(f.auth, f.consume(issued.ticket)));
  assert.deepEqual(f.state(), before);
});
for (const field of ["ticketDigest", "signature", "challenge", "claimDigest", "workspace", "taskId", "executionId", "attempt", "signatureValidated"]) test(`consume rejects altered ${field}`, async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input), input: any = f.consume(issued.ticket);
  const auth = { ...f.auth };
  if (field === "signature") input.ticket.signature = "0".repeat(128);
  else if (field === "workspace") auth.workspaceId = randomUUID();
  else if (field === "attempt") input.attempt = 2;
  else if (field === "signatureValidated") input.signatureValidated = true;
  else input[field] = field.endsWith("Id") ? randomUUID() : "d".repeat(64);
  await assert.rejects(f.service.consume(auth, input)); assert.equal(f.state().tickets[0].state, "issued");
});
test("20 concurrent consume calls: one commit, deterministic replay denials; old JSON cannot renew", async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input), input = f.consume(issued.ticket);
  const results = await Promise.allSettled(Array.from({ length: 20 }, () => f.service.consume(f.auth, structuredClone(input))));
  assert.equal(results.filter(r => r.status === "fulfilled").length, 1);
  for (const r of results) if (r.status === "rejected") assert.match(r.reason.message, /owner_ticket_replayed/);
  assert.equal(f.state().journal.length, 2); assert.equal(f.state().audit.length, 2); assert.equal(f.state().spent.length, 1);
  await assert.rejects(f.service.issue(f.auth, f.input), /owner_ticket_replayed/);
  await assert.rejects(f.service.consume(f.auth, JSON.parse(JSON.stringify(input))), /owner_ticket_replayed/);
});
for (const point of ["audit", "spend", "commit"] as const) test(`consume ${point} failure rolls back state, audit and attempt together`, async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input), before = f.state();
  f.faults[point] = true; await assert.rejects(f.service.consume(f.auth, f.consume(issued.ticket))); assert.deepEqual(f.state(), before);
});
test("issue failure leaves no row and no journal", async () => {
  const f = await ownerTicketFixture(); f.faults.audit = true;
  await assert.rejects(f.service.issue(f.auth, f.input)); assert.equal(f.state().tickets.length, 0); assert.equal(f.state().journal.length, 0);
});
test("expiry is a durable terminal event; future notBefore denies without effect", async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input);
  f.advance(-1); await assert.rejects(f.service.consume(f.auth, f.consume(issued.ticket)), /not_yet_valid/);
  f.advance(60001); assert.deepEqual(await f.service.consume(f.auth, f.consume(issued.ticket)), { error: "owner_ticket_expired" });
  assert.equal(f.state().tickets[0].state, "expired"); assert.equal(f.state().spent.length, 0);
  await assert.rejects(f.service.issue(f.auth, f.input), /owner_ticket_replayed/);
});
test("owner revoke and epoch rotation invalidate unused tickets without deleting history", async () => {
  for (const action of ["revoke", "rotate"]) {
    const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input);
    if (action === "revoke") await f.service.revoke(f.auth, { ticketId: issued.ticket.payload.ticketId, expectedVersion: 1 });
    else await f.service.rotate(f.auth, { expectedEpoch: 1, nextKeyId: "next", nextPublicKeyDigest: "f".repeat(64) });
    await assert.rejects(f.service.consume(f.auth, f.consume(issued.ticket)), /owner_ticket_replayed/);
    assert.equal(f.state().tickets[0].state, "revoked"); assert.equal(f.state().journal.length, 2);
  }
});
test("owner must confirm exact digests and explicit acceptance", async () => {
  const f = await ownerTicketFixture();
  for (const input of [{ ...f.input, explicitAcceptance: false }, { ...f.input, acceptanceDigest: "e".repeat(64) }, { ...f.input, contextDigest: "e".repeat(64) }]) await assert.rejects(f.service.issue(f.auth, input));
  assert.equal(await ticketHash(f.c.acceptance), f.input.acceptanceDigest); assert.equal(f.state().tickets.length, 0);
});
test("changing issuer configuration cannot consume a previously issued ticket", async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input);
  const other = createOwnerTicketService(f.store, { ...f.options, issuer: "https://other.example.invalid" });
  await assert.rejects(other.consume(f.auth, f.consume(issued.ticket)), /owner_ticket_binding_invalid/);
  assert.equal(f.state().tickets[0].state, "issued");
});
test("changed signing key and epoch fail closed", async () => {
  const f = await ownerTicketFixture(), issued = await f.service.issue(f.auth, f.input);
  for (const signer of [{ ...f.options.signer, keyId: "wrong" }, { ...f.options.signer, epoch: 2 }]) {
    const other = createOwnerTicketService(f.store, { ...f.options, signer });
    await assert.rejects(other.consume(f.auth, f.consume(issued.ticket)), /owner_ticket_key_unavailable/);
  }
  assert.equal(f.state().tickets[0].state, "issued");
});
test("HTTP issue + consume is one-use with synthetic signer and transaction store", async t => {
  const f = await ownerTicketFixture(), app = express();
  app.use(express.json()); app.use((req, _res, next) => { req.auth = f.auth; next(); });
  for (const action of ["issue", "consume", "revoke", "rotate"] as const) app.post(`/${action}`, ownerTicketHandler(action, f.service));
  const server = app.listen(0, "127.0.0.1"); t.after(() => server.close()); await new Promise<void>(r => server.once("listening", r));
  const post = (action: string, body: unknown) => fetch(`http://127.0.0.1:${(server.address() as any).port}/${action}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  const issue = await post("issue", f.input); assert.equal(issue.status, 201);
  const ticket = (await issue.json() as any).data.ticket;
  const consume = await post("consume", f.consume(ticket)); assert.equal(consume.status, 200);
  assert.equal((await consume.json() as any).data.launchAuthority, false);
  assert.equal((await post("consume", f.consume(ticket))).status, 409);
  assert.equal(f.state().spent.length, 1);
});
test("uncomposed production handler fails closed for owner, denies API key", async t => {
  const f = await ownerTicketFixture(), app = express(); let auth = f.auth;
  app.use(express.json()); app.use((req, _res, next) => { req.auth = auth; next(); }); app.post("/issue", ownerTicketHandler("issue"));
  const server = app.listen(0, "127.0.0.1"); t.after(() => server.close()); await new Promise<void>(r => server.once("listening", r));
  const url = `http://127.0.0.1:${(server.address() as any).port}/issue`;
  assert.equal((await fetch(url, { method: "POST" })).status, 503);
  auth = { ...auth, authType: "api_key" }; assert.equal((await fetch(url, { method: "POST" })).status, 403);
});
