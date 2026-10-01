import test from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { randomUUID } from "node:crypto";
import { workerCredentialCatalogHandler } from "../modules/api-keys/api-keys.routes";
import { asyncHandler } from "../middleware/async-handler";
import { workerTicketFingerprint } from "../auth/worker-ticket-principal";

test("worker generation catalog is administrator-only, bounded and secret-free", async t => {
  const workspaceId = randomUUID(), hostId = randomUUID(), installationId = randomUUID();
  let queries: any[] = [];
  const row = { id: randomUUID(), workspaceId, workerHostId: hostId,
    workerInstallationId: installationId, credentialVersion: 1, workerBindingEpoch: 4,
    keyHash: "a".repeat(64), key: null, keyPrefix: "worker-v1", boundAgentId: null,
    active: false, revokedAt: new Date("2026-01-02T00:00:00Z"), expiresAt: new Date("2026-01-01T00:00:00Z"),
    scopes: ["agent-runtime:claim"], createdAt: new Date(), updatedAt: new Date(), lastUsedAt: null, name: "Bound worker" };
  let suppliedRows: any[] = [row];
  const db: any = { apiKey: { findMany: async (query: any) => { queries.push(query); return suppliedRows; } } };
  const app = express();
  app.use((req: any, _res, next) => {
    const role = req.header("x-fixture-role"), type = req.header("x-fixture-type") ?? "user";
    req.auth = role ? { authType: type, workspaceId, userId: type === "user" ? randomUUID() : null, workspaceRole: role } : undefined;
    next();
  });
  app.get("/v1/api-keys/worker-credentials", asyncHandler(workerCredentialCatalogHandler(db)));
  app.use((error: any, _req: any, res: any, _next: any) => res.status(error?.name === "ZodError" ? 400 : 500).json({ error: "validation_error" }));
  const server = app.listen(0, "127.0.0.1"); await new Promise<void>(resolve => server.once("listening", resolve));
  t.after(() => new Promise<void>(resolve => server.close(() => resolve())));
  const call = async (headers: Record<string, string> = {}, suffix = "") => {
    const response = await fetch(`http://127.0.0.1:${(server.address() as any).port}/v1/api-keys/worker-credentials${suffix}`, { headers });
    return { status: response.status, cache: response.headers.get("cache-control"), body: await response.json() as any };
  };
  const deniedHeaders: Record<string, string>[] = [{}, { "x-fixture-role": "member" }, { "x-fixture-role": "viewer" },
    { "x-fixture-role": "owner", "x-fixture-type": "api_key" }];
  for (const headers of deniedHeaders) assert.equal((await call(headers)).status, 403);
  assert.equal(queries.length, 0);
  for (const role of ["admin", "owner"]) {
    const response = await call({ "x-fixture-role": role }, `?hostId=${hostId}`);
    assert.equal(response.status, 200); assert.equal(response.cache, "no-store");
    const credential = response.body.data.credentials[0];
    assert.equal(response.body.data.schemaVersion, "roost-worker-credential-catalog-v1");
    assert.equal(credential.epoch, 4); assert.equal(credential.version, 1);
    assert.equal(credential.fingerprint, workerTicketFingerprint(row.keyHash));
    assert.equal(credential.active, false); assert.equal(credential.revokedAt, row.revokedAt.toISOString());
    assert.equal(credential.expiresAt, row.expiresAt.toISOString());
    assert.deepEqual(Object.keys(credential).sort(), ["id", "workspaceId", "installationId", "hostId", "version", "epoch", "fingerprint", "active", "revokedAt", "expiresAt", "scopes"].sort());
    assert.ok(!JSON.stringify(response.body).includes(row.keyHash)); assert.ok(!JSON.stringify(response.body).includes("keyPrefix"));
    assert.deepEqual(queries.at(-1).where, { workspaceId, boundAgentId: null, workerHostId: hostId });
    assert.deepEqual(queries.at(-1).orderBy, [{ workerBindingEpoch: "desc" }, { createdAt: "desc" }, { id: "desc" }]);
    assert.deepEqual(queries.at(-1).distinct, ["workerHostId"]); assert.equal(queries.at(-1).take, 1);
  }
  assert.equal((await call({ "x-fixture-role": "owner" }, "?hostId=invalid")).status, 400);
  assert.equal(queries.length, 2);
  await call({ "x-fixture-role": "owner" }); assert.equal(queries.at(-1).take, 51);
  assert.deepEqual(queries.at(-1).where.workerHostId, { not: null });
  suppliedRows = Array.from({ length: 51 }, (_, index) => ({ ...row, id: randomUUID(), workerHostId: randomUUID(), workerBindingEpoch: index + 1 }));
  const bounded = await call({ "x-fixture-role": "owner" });
  assert.equal(bounded.body.data.credentials.length, 50); assert.equal(bounded.body.data.truncated, true);
});
