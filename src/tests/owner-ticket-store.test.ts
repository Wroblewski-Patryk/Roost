import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { createPrismaOwnerTicketStore } from "../modules/agent-runtime/owner-ticket-store";
import { ownerTicketFixture } from "./owner-ticket-fixture";

test("Prisma adapter requires a fresh primary membership and rejects missing physical evidence", async () => {
  const f = await ownerTicketFixture(); let member = true, primary = f.auth.userId;
  const db = {
    $executeRaw: async () => 1,
    workspaceMembership: { findFirst: async () => member ? { userId: f.auth.userId, role: "owner" } : null },
    workspace: { findUnique: async () => ({ ownerUserId: primary }) }
  };
  const store = createPrismaOwnerTicketStore({ $transaction: async (fn: any, options: any) => {
    assert.equal(options.isolationLevel, "Serializable"); return fn(db);
  } } as any);
  assert.equal(await store.transaction(tx => tx.primaryOwner(f.auth)), true);
  member = false; assert.equal(await store.transaction(tx => tx.primaryOwner(f.auth)), false);
  member = true; primary = "other"; assert.equal(await store.transaction(tx => tx.primaryOwner(f.auth)), false);
  await assert.rejects(store.transaction(tx => tx.current(f.auth.workspaceId, f.input.executionId, f.input.decisionId, 1, new Date())), /owner_ticket_evidence_unavailable/);
});
test("Prisma conflicts never retry the callback and unexpected diagnostics are redacted", async () => {
  for (const code of ["P2034", "P2002", "P2010", "unknown"]) {
    let calls = 0;
    const store = createPrismaOwnerTicketStore({ $transaction: async () => {
      calls++;
      if (code === "unknown") throw Error("PRIVATE DATABASE DIAGNOSTIC");
      throw new Prisma.PrismaClientKnownRequestError("PRIVATE DATABASE DIAGNOSTIC", { code, clientVersion: "5.22.0", meta: { code: "40001" } });
    } } as any);
    await assert.rejects(store.transaction(async () => "unused"), code === "unknown" ? /owner_ticket_unavailable/ : /owner_ticket_replayed/);
    assert.equal(calls, 1);
  }
});
