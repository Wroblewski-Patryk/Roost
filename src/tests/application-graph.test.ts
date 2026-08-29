import assert from "node:assert/strict";
import test from "node:test";
import {
  buildApplicationGraph,
  buildPortfolioGraph,
  graphDomainFor
} from "../modules/product-engineering/application-graph";

const workspace = { id: "workspace-1", name: "LuckySparrow" };
const application = {
  id: "application-1",
  name: "Soar",
  slug: "soar",
  description: "Trading automation platform.",
  owner: "Product Engineering",
  innovationStage: "development" as const,
  productStage: "candidate" as const,
  status: "active" as const,
  frontendUrl: "https://soar.example.test",
  backendUrl: null,
  documentationUrl: null
};

function capability(overrides: Partial<{
  id: string;
  key: string;
  name: string;
  domainKey: string;
  domainName: string;
  state: "unknown" | "partial" | "complete" | "verified";
  evidence: string[];
}> = {}) {
  const values = {
    id: "capability-1",
    key: "trading-engine",
    name: "Trading Engine",
    domainKey: "trading",
    domainName: "Trading",
    state: "partial" as const,
    evidence: ["verified"],
    ...overrides
  };
  return {
    id: values.id,
    applicability: "required" as const,
    targetState: "complete" as const,
    observedState: values.state,
    lifecycleStatus: "implementing",
    targetDescription: "A safe trading engine.",
    observedSummary: null,
    owner: "Soar",
    capabilityDefinition: {
      id: `definition-${values.id}`,
      key: values.key,
      name: values.name,
      description: `${values.name} definition`,
      tags: [],
      domain: { key: values.domainKey, name: values.domainName }
    },
    evidence: values.evidence.map((verificationStatus) => ({ verificationStatus })),
    features: [],
    dependenciesFrom: [] as Array<{
      id: string;
      required: boolean;
      notes: string | null;
      toCapability: { id: string; observedState: "unknown" | "partial" | "complete" | "verified"; capabilityDefinition: { name: string } };
    }>
  };
}

test("portfolio graph is a deterministic company to application projection", () => {
  const packet = buildPortfolioGraph({
    workspace,
    applications: [{
      ...application,
      readiness: { overall: 52, blockers: [{}] },
      capabilityCount: 4,
      gapCount: 2,
      evidenceCount: 1
    }]
  });

  assert.equal(packet.schemaVersion, "application-graph-v1");
  assert.deepEqual(packet.nodes.map((node) => node.type), ["company", "application"]);
  assert.equal(packet.edges[0]?.type, "hierarchy");
  assert.equal(packet.nodes[1]?.completeness, 52);
  assert.deepEqual(packet.nodes[1]?.path, [packet.nodes[0]?.id, packet.nodes[1]?.id]);
});

test("application graph maps product-specific capability domains into Domain", () => {
  const trading = capability();
  const packet = buildApplicationGraph({ workspace, application, capabilities: [trading], readiness: { overall: 50, blockers: [] } });
  const domain = packet.nodes.find((node) => node.type === "domain");
  const projectedCapability = packet.nodes.find((node) => node.type === "capability");

  assert.equal(graphDomainFor("experience", "Experience").label, "Frontend");
  assert.equal(domain?.label, "Domain");
  assert.equal(projectedCapability?.parentNodeId, domain?.id);
  assert.equal(projectedCapability?.completeness, 50);
  assert.equal(projectedCapability?.details.verifiedEvidenceCount, 1);
});

test("required incomplete dependencies become blocker edges and node blockers", () => {
  const marketData = capability({ id: "market-data", key: "market-data", name: "Market Data", state: "unknown", evidence: [] });
  const trading = capability();
  trading.dependenciesFrom.push({
    id: "dependency-1",
    required: true,
    notes: "Trading requires market data",
    toCapability: { id: marketData.id, observedState: marketData.observedState, capabilityDefinition: { name: marketData.capabilityDefinition.name } }
  });
  const packet = buildApplicationGraph({
    workspace,
    application,
    capabilities: [trading, marketData],
    readiness: { overall: 25, blockers: [{ capabilityId: trading.id }] }
  });
  const tradingNode = packet.nodes.find((node) => node.entityId === trading.id);
  const blockerEdge = packet.edges.find((edge) => edge.type === "blocks");

  assert.equal(tradingNode?.isBlocked, true);
  assert.deepEqual(tradingNode?.details.blockerLabels, ["Market Data"]);
  assert.equal(blockerEdge?.required, true);
  assert.match(blockerEdge?.source ?? "", /^capability:/);
});
