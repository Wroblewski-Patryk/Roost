import assert from "node:assert/strict";
import test from "node:test";
import {
  gateTone,
  itemTone,
  lifecycleStageKeys,
  parseProductMapReadResponse,
  projectionMessage,
  projectionTone,
  type ProductMapProjection,
  type ProductMapProjectionItem
} from "./product-map-projection";

const observedAt = "2026-07-28T10:00:00.000Z";
const uuid = "11111111-1111-4111-8111-111111111111";
const source = {
  repository: "Paperclip_Softwarehouse" as const,
  path: "docs/softwarehouse/19-autonomous-application-business-lifecycle.md" as const,
  documentVersion: "1.0" as const,
  commitSha: "a".repeat(40)
};

const item = (overrides: Partial<ProductMapProjectionItem> = {}): ProductMapProjectionItem => ({
  offeringId: "roost",
  paperclipProjectName: "Roost",
  lifecycleStage: "implementation",
  conflictState: "none",
  sourceControl: { branch: "main", sourceSha: "a".repeat(40), deployedSha: "a".repeat(40), versionAlignment: "aligned" },
  readiness: { status: "GO", evidenceState: "complete", zeroGapButNoGo: false, totalGaps: 0, nextGate: null },
  aggregates: { issues: { total: 1, byStatus: { backlog: 0, todo: 0, inProgress: 0, inReview: 0, blocked: 0, done: 1, cancelled: 0 } } },
  ...overrides
});

function packet(): ProductMapProjection {
  return {
    schemaVersion: "2.0",
    observedAt,
    sourceState: "available",
    stale: false,
    conflictState: "none",
    lifecycleProcedure: {
      procedureId: "PROC-SH-APPLICATION-LIFECYCLE",
      procedureVersion: "1.0",
      executionAuthority: "paperclip",
      observedAt,
      verifiedAt: observedAt,
      freshness: "current",
      gateResults: lifecycleStageKeys.map((stageKey) => ({
        stageKey,
        status: "verified",
        summary: `${stageKey} verified`,
        ownerRole: "Owner",
        verifiedAt: observedAt,
        evidenceRefs: [{ kind: "issue", issueIdentifier: "LUC-2193", label: "Evidence" }]
      })),
      evidenceRefs: [],
      supersession: { status: "active", supersedesVersion: null, supersededByVersion: null },
      source
    },
    items: [item()]
  };
}

function procedure() {
  return {
    identity: {
      procedureId: "PROC-SH-APPLICATION-LIFECYCLE",
      procedureVersion: "1.0",
      familyId: uuid,
      lifecycleStatus: "active",
      title: "Autonomous Application And Business Lifecycle"
    },
    definition: {
      accountableOwner: { roleId: uuid, roleName: "Human Owner" },
      participatingRoles: ["Human Owner"],
      purpose: "Purpose",
      scope: "Scope",
      trigger: "Trigger",
      entryCriteria: ["Entry"],
      primaryOutput: "Output",
      exitCriteria: ["Exit"],
      stages: lifecycleStageKeys.map((stageKey, index) => ({
        stageKey,
        order: index + 1,
        title: `Stage ${index + 1}`,
        accountableSourceOwner: "Owner",
        requiredOutput: "Required output",
        exitGate: "Exit gate",
        rollbackInstruction: "Rollback"
      }))
    },
    provenance: {
      definitionAuthority: "roost",
      executionAuthority: "paperclip",
      roostSource: {
        path: "docs/governance/autonomous-application-business-lifecycle.md",
        documentVersion: "1.0",
        sourceSha: "b".repeat(40)
      },
      operatingContractSource: source,
      observedAt: null,
      verifiedAt: null,
      freshness: "unavailable"
    },
    gates: [],
    conflicts: [],
    supersession: { status: "active", supersedesVersion: null, supersededByVersion: null, nextReviewAt: null },
    relations: { offerings: [], releases: [], decisions: [], kpis: [], evidence: [] },
    audit: null,
    authority: {
      readOnly: true,
      executionSystem: "paperclip",
      definitionSystem: "roost",
      canMutatePaperclip: false,
      canPromoteReadiness: false
    }
  };
}

test("the exact five public states keep truthful tone and copy", () => {
  assert.equal(projectionTone("current", packet()), "success");
  assert.equal(projectionTone("stale", packet()), "warning");
  assert.equal(projectionTone("source_only", null), "warning");
  assert.equal(projectionTone("conflict", packet()), "error");
  assert.equal(projectionTone("unavailable", null), "error");
  assert.match(projectionMessage("source_only", null).detail, /live execution evidence/i);
  assert.match(projectionMessage("conflict", packet()).detail, /stricter verdict/i);
  assert.match(projectionMessage("unavailable", null).detail, /Retry/i);
});

test("readiness never appears healthy outside a conflict-free current publication", () => {
  const ready = item();
  assert.equal(itemTone("current", ready), "badge-success");
  assert.equal(itemTone("stale", ready), "badge-warning");
  assert.equal(itemTone("source_only", ready), "badge-warning");
  assert.equal(itemTone("conflict", ready), "badge-error");
  assert.equal(itemTone("unavailable", ready), "badge-error");
  assert.equal(itemTone("current", item({ readiness: { ...ready.readiness, status: "NO-GO" } })), "badge-error");
});

test("gate tones distinguish verified, justified, blocked, stale, and failed evidence", () => {
  assert.equal(gateTone("verified"), "badge-success");
  assert.equal(gateTone("not_applicable"), "badge-info");
  assert.equal(gateTone("blocked"), "badge-warning");
  assert.equal(gateTone("stale"), "badge-warning");
  assert.equal(gateTone("failed"), "badge-error");
});

test("runtime response parsing accepts source-only and complete current shapes", () => {
  const sourceOnly = parseProductMapReadResponse({
    data: { status: "source_only", packet: null, procedure: procedure(), observedAt: null }
  });
  assert.equal(sourceOnly.data.procedure?.definition.stages.length, 18);

  const currentProcedure = {
    ...procedure(),
    provenance: { ...procedure().provenance, observedAt, verifiedAt: observedAt, freshness: "current" },
    gates: packet().lifecycleProcedure.gateResults,
    audit: { correlationId: uuid, sourceSnapshotId: "snapshot-1", packetDigestPrefix: "abcdef123456", receivedAt: observedAt }
  };
  const current = parseProductMapReadResponse({
    data: { status: "current", packet: packet(), procedure: currentProcedure, observedAt }
  });
  assert.equal(current.data.status, "current");
  assert.equal(current.data.procedure?.gates.length, 18);
});

test("runtime response parsing rejects legacy states, unknown fields, and malformed stage shape", () => {
  assert.throws(() => parseProductMapReadResponse({
    data: { status: "empty", packet: null, procedure: null, observedAt: null }
  }));
  assert.throws(() => parseProductMapReadResponse({
    data: { status: "source_only", packet: null, procedure: { ...procedure(), privateField: "no" }, observedAt: null }
  }));
  assert.throws(() => parseProductMapReadResponse({
    data: {
      status: "source_only",
      packet: null,
      procedure: {
        ...procedure(),
        definition: { ...procedure().definition, stages: procedure().definition.stages.slice(1) }
      },
      observedAt: null
    }
  }));
});
