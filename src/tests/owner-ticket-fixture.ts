import { generateKeyPairSync, sign, randomUUID, createHash } from "node:crypto";
import { executionProviderRegistry } from "../modules/agent-runtime/execution-provider";
import { createOwnerTicketService, ticketHash, ticketBlocked, type OwnerTicketTx, type OwnerTicketStore, type TicketRow, type TicketKey } from "../modules/agent-runtime/owner-ticket";
import type { AuthContext } from "../auth/api-key.middleware";

export async function ownerTicketFixture() {
  const hash = "a".repeat(64), pin = { identity: hash, digest: hash }, start = Date.parse("2026-09-23T10:00:00Z");
  const owner = randomUUID(), workspaceId = randomUUID(), executionId = randomUUID(), taskId = randomUUID(), installationId = randomUUID();
  const auth: AuthContext = { workspaceId, userId: owner, workspaceRole: "owner", authType: "user" };
  const selection = { schemaVersion: "roost-managed-hermes-backend-v1", agent: "managed_hermes", riskClass: "low", fallback: "none",
    attemptPolicy: { maxTurns: 1, apiMaxRetries: 0, unavailable: "stop_attempt", restart: "never" }, backend: "codex_responses", provider: "openai-codex",
    modelSelection: { model: "gpt-5.6-sol", reasoningEffort: "medium" }, auth: "same_owner_subscription" };
  const hermes = executionProviderRegistry.providers.find(p => p.kind === "hermes_codex")!;
  const acceptance: any = { schemaVersion: "roost-trusted-provider-pilot-v1", decisionId: randomUUID(), revision: 1, state: "accepted",
    decidedAt: new Date(start - 1000).toISOString(), expiresAt: new Date(start + 120000).toISOString(), installationId,
    configurationIdentity: hash, installationIdentity: hash,
    provider: { kind: "hermes_codex", version: hermes.version, runtimeDigest: hash, launcherDigest: hash, profile: pin,
      configurationDigest: hash, modelSelection: selection, managedBackend: { schemaVersion: "roost-managed-hermes-backend-v1", evidence: pin,
        selectionDigest: hash, context: { identityDigest: hash, inputSeal: hash, revisionsDigest: hash, rolesDigest: hash,
          assignmentDigest: hash, riskDigest: hash, riskClass: "low", writerDigest: hash, scopeDigest: hash, budgetDigest: hash,
          turnPolicyDigest: hash, reviewRecoveryDigest: hash, gates: { jobVersion: "roost-windows-job-v2", launcher: { launcherDigest: hash, sourceDigest: hash },
            originalOwnership: true, durableResume: true, cleanup: "owned_job_zero_processes", recovery: "original_b28_cleanup_only",
            outputBudget: "fixed_22_bytes_zero_model_tokens", durationDeadline: new Date(start + 120000).toISOString(), release: "independent_review_no_release" } },
        runtime: { version: hermes.version, commit: hermes.commit, fixtureRuntimeDigest: hash, fixtureConfigurationDigest: hash, qualification: "closed_fixture_only" },
        auth: { source: "same_owner_subscription", policyVersion: "roost-hermes-same-owner-auth-v2", attestationId: randomUUID(), attestationDigest: hash, status: "unavailable_not_qualified" },
        managedModel: null, realIssuerQualified: false, privateAnchorQualified: false } },
    scope: { workspaceId, applicationId: randomUUID(), taskId, executionId, checkoutIdentity: hash, inputSeal: hash, accessDigest: hash,
      singleTaskDigest: hash, filesystemDigest: hash, writerDigest: hash }, mode: "trusted_provider_pilot", systemIsolation: false,
    arbitraryProviderAdmission: false, fullAutonomy: false, residualRiskAccepted: true, acknowledgement: "windows_account_authority_not_os_isolation", qualification: "closed_fixture_only" };
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const key: TicketKey = { installationId, keyId: "synthetic-1", epoch: 1,
    publicKeyDigest: createHash("sha256").update(publicKey.export({ type: "spki", format: "der" })).digest("hex") };
  const signer = { keyId: key.keyId, epoch: 1, publicKey: publicKey.export({ type: "spki", format: "pem" }).toString(),
    sign: async (bytes: Buffer) => sign(null, bytes, privateKey) };
  const c = { acceptance, claimDigest: hash, challenge: "b".repeat(64), contextDigest: "c".repeat(64) };
  let state = { tickets: [] as TicketRow[], journal: [] as any[], audit: [] as any[], spent: [] as string[], key };
  let tail = Promise.resolve();
  const faults = { audit: false, spend: false, commit: false, current: false, member: true };
  let time = start;
  // Rollback-capable serialized test model. This is NOT PostgreSQL evidence.
  const store: OwnerTicketStore = { async transaction(work) {
    const before = tail; let unlock!: () => void; tail = new Promise<void>(r => { unlock = r; }); await before;
    const draft = structuredClone(state);
    try {
      const tx: OwnerTicketTx = {
        primaryOwner: async a => faults.member && a.userId === owner && a.workspaceId === workspaceId,
        key: async w => w === workspaceId ? draft.key : null,
        current: async (w, e, d, r) => {
          if (faults.current || w !== workspaceId || e !== executionId || d !== c.acceptance.decisionId || r !== c.acceptance.revision) ticketBlocked();
          return structuredClone(c);
        },
        find: async (w, tid) => draft.tickets.find(t => t.workspaceId === w && t.id === tid) ?? null,
        insert: async row => {
          if (draft.tickets.some(t => t.id === row.id || t.executionId === row.executionId || t.nonceDigest === row.nonceDigest
            || t.decisionId === row.decisionId && t.decisionRevision === row.decisionRevision)) ticketBlocked("owner_ticket_replayed");
          draft.tickets.push(structuredClone(row)); draft.journal.push({ id: row.id, state: row.state, version: row.version });
        },
        transition: async (row, next, at, consumeId) => {
          const t = draft.tickets.find(t => t.id === row.id && t.state === "issued" && t.version === row.version);
          if (!t) return false;
          t.state = next; t.version++; if (next === "consumed") { t.consumeId = consumeId!; t.consumedAt = at; }
          if (next === "revoked") t.revokedAt = at;
          draft.journal.push({ id: t.id, state: next, version: t.version }); return true;
        },
        audit: async (row, status) => { if (faults.audit) throw Error("test audit failure"); draft.audit.push({ id: row.id, state: status }); },
        spendAttempt: async row => { if (faults.spend) throw Error("test spend failure"); draft.spent.push(row.executionId); },
        rotate: async (w, epoch, kid, digest, at) => {
          if (w !== workspaceId || draft.key.epoch !== epoch || draft.key.keyId === kid || draft.key.publicKeyDigest === digest) return false;
          draft.key.epoch++; draft.key.keyId = kid; draft.key.publicKeyDigest = digest;
          for (const t of draft.tickets.filter(t => t.state === "issued")) await tx.transition(t, "revoked", at);
          draft.audit.push({ state: "rotation" }); return true;
        }
      };
      const result = await work(tx); if (faults.commit) throw Error("test commit failure"); state = draft; return result;
    } finally { unlock(); }
  } };
  const options = { signer, issuer: "https://roost.example.invalid", now: () => new Date(time) };
  const service = createOwnerTicketService(store, options);
  const input = { executionId, decisionId: acceptance.decisionId, decisionRevision: 1,
    acceptanceDigest: await ticketHash(acceptance), contextDigest: c.contextDigest, explicitAcceptance: true };
  const consume = (ticket: any) => ({ ticket, ticketDigest: state.tickets[0].digest, challenge: c.challenge, claimDigest: c.claimDigest, executionId, taskId, attempt: 1 });
  return { auth, input, consume, c, service, store, options, faults, state: () => structuredClone(state), advance: (ms: number) => { time += ms; } };
}
