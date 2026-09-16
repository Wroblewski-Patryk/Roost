// Exact B25-consumed recovery only. No provider/API/configuration authority.
import path from "node:path";
import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
import { readFileSync, readdirSync, mkdirSync, openSync, writeFileSync, fsyncSync, closeSync, unlinkSync, rmdirSync } from "node:fs";
import { z } from "zod";
import { nativeDigest, physicalIdentity } from "./agent-host-native-footprint.mjs";
import { nativeArtifactSnapshot, readDurableNativeReview } from "./agent-host-native-review.mjs";
import { currentNativeProcessIdentity, observeWindowsProcessIdentity } from "./agent-host-process-identity.mjs";
import { readB21LegacyAdoption, qualifyB21LegacyAdoption } from "./agent-host-hermes-b25-adoption.mjs";
import { inspectB21RetainedEvidence } from "./agent-host-hermes-b24-supplement.mjs";
import { b26Exists, b26Inventory, assertB26Remaining, b26OutsideStateDigest } from "./agent-host-b26-inventory.mjs";

export const b26RecoveryVersion = "roost-b21-adopted-recovery-v1";
export const b26RecoveryScope = "b26_exact_adopted_b21_fixture_lease_writer_only";
export const b26ApprovalMaxAgeMs = 60 * 60 * 1000;
const h = z.string().regex(/^[a-f0-9]{64}$/), fail = reason => { throw Error(reason); }, grants = new WeakMap();
const artifactSchema = z.object({ name: z.literal("agent-host-recovery.lock"), identity: z.string().regex(/^\d+:\d+$/), digest: h }).strict();
const rowSchema = z.object({ pathDigest: h, identity: h, kind: z.enum(["file", "directory"]), bytes: z.string().regex(/^\d+$/).optional(),
  time: z.string().regex(/^\d+$/).optional(), digest: h.optional() }).strict().refine(r => r.kind === "file" ? r.bytes && r.time && r.digest : !r.bytes && !r.time && !r.digest);
const contextSchema = z.object({ adoptionDigest: h, frozenEvidenceDigest: h, adoptionEventsDigest: h, ownerDecisionDigest: h,
  planDigest: h, outsideStateDigest: h, rootPathDigest: h, rootIdentity: h, parentIdentity: h }).strict();
const phases = ["consumed", "barrier_ready", "remove_intent", "removed", "fixture_removed", "lease_remove_intent", "lease_removed", "writer_remove_intent", "writer_removed", "barrier_remove_intent", "barrier_removed", "complete"];
const eventSchema = z.object({ version: z.literal(b26RecoveryVersion), scope: z.literal(b26RecoveryScope), index: z.number().int().nonnegative(),
  phase: z.enum(phases), target: z.number().int().nonnegative().nullable(), at: z.string().datetime(), previousDigest: h.nullable(),
  stateIdentity: h, directoryIdentity: h, eventIdentity: h, controllerDigest: h, context: contextSchema,
  plan: z.array(rowSchema).min(1).max(512).nullable(), barrier: artifactSchema.nullable(), executionAuthorized: z.literal(false) }).strict();
const processSchema = z.object({ pid: z.number().int().positive(), creationTime: z.string().regex(/^\d{16,20}$/), executablePathDigest: h, executableDigest: h }).strict();
const optionsSchema = z.object({ reportPath: z.string(), reviewDirectory: z.string(), supplementDirectory: z.string(), adoptionDirectory: z.string(),
  installation: z.object({ attestationPath: z.string(), manifestPath: z.string() }).strict(),
  expected: z.object({ originalReviewDigest: h, supplementDigest: h }).strict(), adoptionDigest: h, frozenEvidenceDigest: h, ownerDecisionDigest: h }).strict();
const controllerSchema = z.object({ version: z.literal(b26RecoveryVersion), adoptionDigest: h, planDigest: h,
  owner: processSchema, nonce: h, lockIdentity: h, at: z.string().datetime() }).strict();
const bytes = v => Buffer.from(JSON.stringify(v) + "\n");
const sign = (key, domain, payload) => createHmac("sha256", key).update(b26RecoveryVersion + ":" + domain + "\n").update(bytes(payload)).digest("hex");
const eventName = index => "event-" + String(index).padStart(5, "0") + ".json";
const artifact = file => { const { name, identity, digest } = nativeArtifactSnapshot(file); return { name, identity, digest }; };
const equal = (a, b) => nativeDigest(a) === nativeDigest(b);
export const b26RecoveryDirectory = (state, adoptionDigest) => path.join(state, "native-recovery-b26-" + h.parse(adoptionDigest));
function schedule(plan) {
  return [{ phase: "consumed", target: null }, { phase: "barrier_ready", target: null },
    ...plan.flatMap((_, target) => [{ phase: "remove_intent", target }, { phase: "removed", target }]),
    ...["fixture_removed", "lease_remove_intent", "lease_removed", "writer_remove_intent", "writer_removed", "barrier_remove_intent", "barrier_removed", "complete"].map(phase => ({ phase, target: null }))];
}
function signed(file, schema, key, domain) {
  const item = nativeArtifactSnapshot(file), r = z.object({ payload: schema, signature: h }).strict().parse(item.record);
  if (!timingSafeEqual(Buffer.from(r.signature, "hex"), Buffer.from(sign(key, domain, r.payload), "hex"))) fail("native_b26_integrity_unproven");
  return { ...item, payload: r.payload };
}
function adoption(options) {
  const a = readB21LegacyAdoption(options.adoptionDirectory, options.supplementDirectory);
  if (a.payload.stage !== "adopted" || a.digest !== options.adoptionDigest || a.payload.approval.frozenEvidenceDigest !== options.frozenEvidenceDigest
      || a.payload.approval.originalReviewDigest !== options.expected.originalReviewDigest || a.payload.approval.supplementDigest !== options.expected.supplementDigest)
    fail("native_b26_adoption_mismatch");
  return a;
}
function readJournal(s) {
  const names = readdirSync(s.directory).sort(), files = names.filter(n => /^event-\d{5}\.json$/.test(n));
  if (!files.length || files.length > 1034 || names.length > 2048 || names.some(n => !/^event-\d{5}\.json$/.test(n) && !/^controller-[a-f0-9]{64}\.json$/.test(n) && n !== ".controller.lock")) fail("native_b26_journal_invalid");
  const events = []; let first, steps;
  for (const [index, name] of files.entries()) {
    if (name !== eventName(index)) fail("native_b26_journal_invalid");
    const file = path.join(s.directory, name), item = signed(file, eventSchema, s.key, "event"), p = item.payload;
    if (!index) { first = p; if (!p.plan || new Set(p.plan.map(r => r.pathDigest)).size !== p.plan.length || p.plan.at(-1).pathDigest !== nativeDigest("")
      || p.context.planDigest !== nativeDigest(p.plan)) fail("native_b26_plan_invalid"); steps = schedule(p.plan); }
    const controller = signed(path.join(s.directory, "controller-" + p.controllerDigest + ".json"), controllerSchema, s.key, "controller");
    if (controller.digest !== p.controllerDigest || controller.payload.adoptionDigest !== s.options.adoptionDigest || controller.payload.planDigest !== first.context.planDigest
        || p.index !== index || !equal({ phase: p.phase, target: p.target }, steps[index]) || p.previousDigest !== (events.at(-1)?.digest ?? null)
        || p.eventIdentity !== physicalIdentity(file, false) || p.directoryIdentity !== physicalIdentity(s.directory) || p.stateIdentity !== s.stateIdentity
        || !equal(p.context, first.context) || index && p.plan !== null || !index && p.barrier !== null
        || index && !p.barrier || index > 1 && !equal(p.barrier, events[1].payload.barrier)
        || Date.parse(p.at) < Date.parse(s.adoption.payload.observedAt) || Date.parse(p.at) >= Date.parse(s.adoption.payload.expiresAt)
        || index && Date.parse(p.at) < Date.parse(events.at(-1).payload.at)) fail("native_b26_journal_invalid");
    events.push({ payload: p, digest: item.digest });
  }
  if (first.context.adoptionDigest !== s.options.adoptionDigest || first.context.frozenEvidenceDigest !== s.options.frozenEvidenceDigest
      || first.context.adoptionEventsDigest !== nativeDigest(s.adoption.events.map(e => [e.digest, e.identity]))) fail("native_b26_journal_binding_invalid");
  for (const name of names.filter(n => n.startsWith("controller-"))) {
    const record = signed(path.join(s.directory, name), controllerSchema, s.key, "controller");
    if (name !== "controller-" + record.digest + ".json" || record.payload.adoptionDigest !== s.options.adoptionDigest || record.payload.planDigest !== first.context.planDigest) fail("native_b26_controller_changed");
  }
  return { events, last: events.at(-1), context: first.context, plan: first.plan, steps };
}
function stateOf(s) {
  const j = s.journal, phasesSeen = new Set(j?.events.map(e => e.payload.phase) ?? []), phase = j?.last.payload.phase;
  const removed = j?.events.filter(e => e.payload.phase === "removed").length ?? 0;
  const allowed = name => phasesSeen.has(name + "_remove_intent");
  const absent = (name, file) => {
    const gone = !b26Exists(file);
    if (phasesSeen.has(name + "_removed") ? !gone : !allowed(name) && gone) fail("native_b26_release_order_invalid");
    return gone;
  };
  return { removed, pending: phase === "remove_intent" ? j.last.payload.target : null,
    leaseAbsent: absent("lease", s.lease), writerAbsent: absent("writer", s.writer),
    barrierReady: phasesSeen.has("barrier_ready"), barrierMayBeAbsent: allowed("barrier"), barrierMustBeAbsent: phasesSeen.has("barrier_removed") };
}
function check(s, { historical = false, controller = true } = {}) {
  const nowAdoption = adoption(s.options);
  if (!equal(nowAdoption.events.map(e => [e.digest, e.identity]), s.adoption.events.map(e => [e.digest, e.identity]))
      || physicalIdentity(s.state) !== s.stateIdentity || physicalIdentity(path.dirname(s.root)) !== s.frozen.observation.fixtureParentIdentity)
    fail("native_b26_evidence_changed");
  if (!historical) {
    s.assertOwnerAuthority({ scope: b26RecoveryScope, adoptionDigest: s.options.adoptionDigest, frozenEvidenceDigest: s.options.frozenEvidenceDigest, phase: s.journal?.last.payload.phase ?? "preflight" });
    if (Date.now() < Date.parse(s.adoption.payload.observedAt) || Date.now() >= Date.parse(s.adoption.payload.expiresAt)
        || Date.now() < s.at || Date.now() - s.at >= b26ApprovalMaxAgeMs || performance.now() - s.monotonic >= b26ApprovalMaxAgeMs) fail("native_b26_authority_expired");
  }
  if (s.journal) { const current = readJournal(s); if (current.last.digest !== s.journal.last.digest) fail("native_b26_journal_changed"); }
  if (controller && s.controller && (!b26Exists(s.controllerFile) || !equal(artifact(s.controllerFile), s.controller))) fail("native_b26_controller_changed");
  const st = stateOf(s);
  s.retained.assertRetained(st);
  if (b26OutsideStateDigest(s.state, s.excluded) !== s.context.outsideStateDigest) fail("native_b26_outside_state_changed");
  const barrierPresent = b26Exists(s.barrier);
  if (st.barrierReady) {
    if (st.barrierMustBeAbsent ? barrierPresent : !barrierPresent && !st.barrierMayBeAbsent) fail("native_b26_barrier_changed");
    if (barrierPresent && !equal(artifact(s.barrier), s.journal.events[1].payload.barrier)) fail("native_b26_barrier_changed");
  } else if (barrierPresent) fail("native_b26_barrier_publication_incomplete");
  const inventory = assertB26Remaining(s.root, s.plan, st.removed, st.pending);
  if (!historical && Date.now() >= Date.parse(s.adoption.payload.expiresAt)) fail("native_b26_authority_expired");
  return { ...st, inventory };
}
function append(s, phase, target = null, barrier = null) {
  const index = s.journal?.events.length ?? 0, file = path.join(s.directory, eventName(index));
  const fd = openSync(file, "wx", 0o600);
  try {
    const payload = eventSchema.parse({ version: b26RecoveryVersion, scope: b26RecoveryScope, index, phase, target, at: new Date().toISOString(),
      previousDigest: s.journal?.last.digest ?? null, stateIdentity: s.stateIdentity, directoryIdentity: physicalIdentity(s.directory), eventIdentity: physicalIdentity(file, false),
      controllerDigest: s.controller.digest, context: s.context, plan: index ? null : s.plan,
      barrier: barrier ?? s.journal?.events[1]?.payload.barrier ?? null, executionAuthorized: false });
    writeFileSync(fd, bytes({ payload, signature: sign(s.key, "event", payload) })); fsyncSync(fd);
  } finally { closeSync(fd); }
  s.journal = readJournal(s); s.onCheckpoint({ phase, target, kind: "durable", removed: stateOf(s).removed });
}
function acquireController(s) {
  if (b26Exists(s.controllerFile)) {
    const old = signed(s.controllerFile, controllerSchema, s.key, "controller"), p = old.payload;
    if (p.lockIdentity !== physicalIdentity(s.controllerFile, false) || p.adoptionDigest !== s.options.adoptionDigest || p.planDigest !== s.context.planDigest
        || signed(path.join(s.directory, "controller-" + old.digest + ".json"), controllerSchema, s.key, "controller").digest !== old.digest) fail("native_b26_controller_changed");
    const live = observeWindowsProcessIdentity(p.owner.pid);
    if (live) fail(live.creationTime === p.owner.creationTime ? "native_b26_controller_active" : "native_b26_controller_pid_reused");
    check(s, { controller: false });
    if (!equal(artifact(s.controllerFile), { name: old.name, identity: old.identity, digest: old.digest }) || observeWindowsProcessIdentity(p.owner.pid)) fail("native_b26_controller_changed");
    unlinkSync(s.controllerFile); // Only this signed transient B26 controller lock.
  }
  const fd = openSync(s.controllerFile, "wx", 0o600);
  try {
    const payload = controllerSchema.parse({ version: b26RecoveryVersion, adoptionDigest: s.options.adoptionDigest, planDigest: s.context.planDigest,
      owner: currentNativeProcessIdentity(), nonce: randomBytes(32).toString("hex"), lockIdentity: physicalIdentity(s.controllerFile, false), at: new Date().toISOString() });
    writeFileSync(fd, bytes({ payload, signature: sign(s.key, "controller", payload) })); fsyncSync(fd);
  } finally { closeSync(fd); }
  s.controller = artifact(s.controllerFile);
  const receipt = path.join(s.directory, "controller-" + s.controller.digest + ".json"), out = openSync(receipt, "wx", 0o600);
  try { writeFileSync(out, readFileSync(s.controllerFile)); fsyncSync(out); } finally { closeSync(out); }
  if (signed(receipt, controllerSchema, s.key, "controller").digest !== s.controller.digest) fail("native_b26_controller_changed");
}
function releaseController(s) {
  if (s.controller && b26Exists(s.controllerFile) && equal(artifact(s.controllerFile), s.controller)) unlinkSync(s.controllerFile);
}
function load(options, assertOwnerAuthority, onCheckpoint = () => {}) {
  if (typeof assertOwnerAuthority !== "function") fail("native_b26_owner_authority_required");
  options = optionsSchema.parse(options);
  h.parse(options.adoptionDigest); h.parse(options.frozenEvidenceDigest); h.parse(options.ownerDecisionDigest);
  const a = adoption(options), frozen = a.payload.frozenEvidence, state = path.dirname(options.reviewDirectory), directory = b26RecoveryDirectory(state, a.digest);
  const keyFile = path.join(options.supplementDirectory, "integrity.key");
  if (physicalIdentity(keyFile, false) !== frozen.supplement.keyIdentity) fail("native_b26_key_changed");
  const key = readFileSync(keyFile); if (key.length !== 32) fail("native_b26_key_changed");
  const review = readDurableNativeReview(options.reviewDirectory), b = review.payload.binding;
  const report = nativeArtifactSnapshot(options.reportPath).record, root = report.cleanupRequiredAt;
  if (nativeDigest(root) !== frozen.pathDigests.fixture || path.resolve(root) !== root) fail("native_b26_path_changed");
  const s = { options: structuredClone(options), adoption: a, frozen, state, directory, root, key, stateIdentity: physicalIdentity(state),
    writer: path.join(state, b.writer.name), lease: path.join(state, b.lease.name), barrier: path.join(state, "agent-host-recovery.lock"),
    controllerFile: path.join(directory, ".controller.lock"), assertOwnerAuthority, onCheckpoint, at: Date.now(), monotonic: performance.now(),
    retained: inspectB21RetainedEvidence(options, frozen) };
  s.excluded = [path.basename(directory), "agent-host-recovery.lock", b.writer.name, b.lease.name];
  if (b26Exists(directory)) {
    s.journal = readJournal(s); s.plan = s.journal.plan; s.context = s.journal.context;
    if (s.context.ownerDecisionDigest !== options.ownerDecisionDigest) fail("native_b26_owner_authority_mismatch");
  } else {
    const q = qualifyB21LegacyAdoption(options, options.adoptionDirectory); if (!q.eligibleForB26Preparation) fail(q.missingEvidence[0] ?? "native_b26_preflight_failed");
    const inventory = b26Inventory(root);
    if (inventory.fixtureDigest !== frozen.observation.fixtureInventoryDigest || inventory.rows[0].identity !== frozen.observation.fixtureRootIdentity) fail("native_b26_plan_invalid");
    s.plan = inventory.plan;
    s.context = { adoptionDigest: a.digest, frozenEvidenceDigest: options.frozenEvidenceDigest,
      adoptionEventsDigest: nativeDigest(a.events.map(e => [e.digest, e.identity])), ownerDecisionDigest: options.ownerDecisionDigest,
      planDigest: nativeDigest(s.plan), outsideStateDigest: b26OutsideStateDigest(state, s.excluded),
      rootPathDigest: nativeDigest(root), rootIdentity: frozen.observation.fixtureRootIdentity, parentIdentity: frozen.observation.fixtureParentIdentity };
  }
  if (s.context.rootPathDigest !== nativeDigest(root) || s.context.rootIdentity !== frozen.observation.fixtureRootIdentity || s.context.parentIdentity !== frozen.observation.fixtureParentIdentity) fail("native_b26_plan_invalid");
  check(s, { historical: s.journal?.last.payload.phase === "complete", controller: false }); return s;
}
export function approveB26Recovery(options, assertOwnerAuthority, onCheckpoint) {
  const s = load(options, assertOwnerAuthority, onCheckpoint), grant = Object.freeze({}); grants.set(grant, { s, attempted: false }); return grant;
}
function result(s, replay = false) {
  return { status: "DONE", version: b26RecoveryVersion, recoveryDigest: s.journal.last.digest, adoptionDigest: s.options.adoptionDigest,
    removedFixtureEntries: s.plan.length, fixtureAbsent: true, leaseAbsent: true, writerAbsent: true, barrierAbsent: true,
    retainedEvidenceVerified: true, otherManagedStateUnchanged: true, adoptionConsumed: true, replay, executionAuthorized: false };
}
export function executeB26Recovery(grant) {
  const g = grants.get(grant); if (!g) fail("native_b26_approval_unproven");
  const s = g.s;
  if (g.done) { check(s, { historical: true, controller: false }); return result(s, true); }
  if (g.attempted) fail("native_b26_grant_consumed"); g.attempted = true;
  if (s.journal?.last.payload.phase === "complete") { check(s, { historical: true, controller: false }); g.done = true; return result(s, true); }
  check(s, { controller: false });
  if (!s.journal) { try { mkdirSync(s.directory); } catch { fail("native_b26_duplicate_consumption"); } }
  try {
    acquireController(s);
    if (!s.journal) append(s, "consumed");
    if (s.journal.last.payload.phase === "consumed") {
      check(s);
      const fd = openSync(s.barrier, "wx", 0o600);
      try { writeFileSync(fd, bytes({ version: b26RecoveryVersion, adoptionDigest: s.options.adoptionDigest, planDigest: s.context.planDigest })); fsyncSync(fd); }
      finally { closeSync(fd); }
      append(s, "barrier_ready", null, artifact(s.barrier));
    }
    while (s.journal.events.length < s.journal.steps.length) {
      const next = s.journal.steps[s.journal.events.length], state = check(s);
      if (next.phase === "removed") {
        const item = s.plan[next.target], file = state.inventory.paths.get(item.pathDigest);
        if (file) {
          // Resolve only the observed in-root path, then check exact object again.
          const immediate = assertB26Remaining(s.root, s.plan, state.removed, state.pending);
          if (immediate.paths.get(item.pathDigest) !== file || physicalIdentity(file, item.kind === "directory") !== item.identity) fail("native_b26_target_changed");
          if (item.kind === "directory") rmdirSync(file); else unlinkSync(file);
          if (b26Exists(file)) fail("native_b26_delete_unproven");
        }
        s.onCheckpoint({ phase: "removed", target: next.target, kind: "effect", removed: state.removed });
      } else if (["lease_removed", "writer_removed", "barrier_removed"].includes(next.phase)) {
        const kind = next.phase.split("_")[0], file = s[kind];
        if (b26Exists(file)) {
          const expected = kind === "barrier" ? s.journal.events[1].payload.barrier : s.frozen.binding[kind];
          const now = artifact(file);
          if (kind === "barrier" ? !equal(now, expected) : nativeDigest(now.identity) !== expected.identityDigest || now.digest !== expected.digest) fail("native_b26_target_changed");
          unlinkSync(file); if (b26Exists(file)) fail("native_b26_delete_unproven");
        }
        s.onCheckpoint({ phase: next.phase, target: null, kind: "effect", removed: state.removed });
      }
      append(s, next.phase, next.target);
    }
    check(s); g.done = true; return result(s);
  } finally { releaseController(s); }
}
export function inspectB26Postflight(options) {
  try {
    const s = load(options, () => {});
    if (s.journal?.last.payload.phase !== "complete" || b26Exists(s.controllerFile)) fail("native_b26_recovery_incomplete");
    return result(s);
  } catch (e) { return { status: "BLOCKED", reason: /^native_[a-z0-9_]+$/.test(e.message) ? e.message : "native_b26_evidence_unproven", executionAuthorized: false }; }
}
