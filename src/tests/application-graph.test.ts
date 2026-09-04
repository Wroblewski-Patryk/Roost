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
      domain: { key: values.domainKey, name: values.domainName },
      procedures: [] as Array<{
        relationType: string;
        required: boolean;
        procedure: { id: string; name: string; purpose: string; status: string; version: number; process: { name: string } | null; qualityStandard: { name: string } | null; steps: Array<{ id: string; stepOrder: number; instruction: string; stepType: string }> };
      }>
    },
    evidence: values.evidence.map((verificationStatus) => ({ verificationStatus })),
    features: [] as Array<{
      id: string;
      applicability: "required" | "recommended" | "optional" | "not_applicable";
      targetState: "unknown" | "not_started" | "missing" | "partial" | "complete" | "verified";
      observedState: "unknown" | "not_started" | "missing" | "partial" | "complete" | "verified";
      lifecycleStatus: string;
      notes: string | null;
      featureDefinition: { id: string; key: string; name: string; description: string | null };
      evidence: Array<{ verificationStatus: string }>;
    }>,
    dependenciesFrom: [] as Array<{
      id: string;
      required: boolean;
      notes: string | null;
      toCapability: { id: string; observedState: "unknown" | "partial" | "complete" | "verified"; capabilityDefinition: { name: string } };
    }>
  };
}

test("portfolio graph is a deterministic Applications to application projection", () => {
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

  assert.equal(packet.schemaVersion, "application-graph-v2");
  assert.deepEqual(packet.nodes.map((node) => node.type), ["portfolio", "application"]);
  assert.equal(packet.nodes[0]?.label, "Applications");
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

test("application documentation records preserve their recorded parent hierarchy", () => {
  const packet = buildApplicationGraph({
    workspace,
    application,
    capabilities: [],
    records: [
      { id: "doc-1", recordType: "architecture_document", key: "system", title: "System architecture", status: "active", priority: "normal", functionalState: "expected" },
      { id: "section-1", recordType: "architecture_section", key: "runtime", title: "Runtime topology", status: "active", priority: "normal", functionalState: "expected", parentId: "doc-1" }
    ],
    readiness: { overall: 0, blockers: [] }
  });
  const document = packet.nodes.find((node) => node.entityId === "doc-1");
  const section = packet.nodes.find((node) => node.entityId === "section-1");

  assert.equal(section?.parentNodeId, document?.id);
  assert.deepEqual(section?.path, [packet.rootNodeId, `application:${application.id}`, document?.id, section?.id]);
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

test("implementation atoms are projected under native feature layers with typed relations", () => {
  const auth = capability({ id: "authentication", key: "authentication", name: "Authentication", domainKey: "identity-access", domainName: "Identity & Access", state: "complete" });
  auth.features.push({
    id: "feature-auth-session",
    applicability: "required",
    targetState: "complete",
    observedState: "complete",
    lifecycleStatus: "tested",
    notes: null,
    featureDefinition: { id: "definition-auth-session", key: "auth-session", name: "Auth session", description: "Session lifecycle" },
    evidence: []
  });
  const packet = buildApplicationGraph({
    workspace,
    application,
    capabilities: [auth],
    readiness: { overall: 90, blockers: [] },
    architecture: [
      {
        id: "component-api",
        type: "backend",
        name: "POST /auth/login",
        description: "Login endpoint",
        status: "active",
        metadata: {
          sourceSystem: "test-registry",
          sourceId: "API-LOGIN",
          atomType: "api_route",
          layer: "backend",
          feature: "auth-session",
          completionPercent: 100,
          verificationStatus: "verified",
          relations: [{ targetSourceId: "DB-USER", type: "reads_writes" }]
        }
      },
      {
        id: "component-user",
        type: "database",
        name: "User table",
        description: "User identity record",
        status: "active",
        metadata: {
          sourceSystem: "test-registry",
          sourceId: "DB-USER",
          atomType: "database_model",
          layer: "data",
          feature: "auth-session",
          completionPercent: 100,
          verificationStatus: "verified"
        }
      }
    ]
  });
  const feature = packet.nodes.find((node) => node.entityId === "feature-auth-session");
  const layers = packet.nodes.filter((node) => node.type === "layer");
  const atoms = packet.nodes.filter((node) => node.type === "implementation");

  assert.equal(packet.schemaVersion, "application-graph-v2");
  assert.equal(layers.length, 2);
  assert.equal(atoms.length, 2);
  assert.equal(layers.every((node) => node.parentNodeId === feature?.id), true);
  assert.equal(packet.edges.some((edge) => edge.type === "dependency" && edge.label === "Reads Writes"), true);
});

test("application execution projects procedures, steps, projects and tasks without duplicating source entities", () => {
  const auth = capability({ id: "authentication", key: "authentication", name: "Authentication" });
  auth.capabilityDefinition.procedures = [{
    relationType: "implementation",
    required: true,
    procedure: { id: "procedure-auth", name: "Authentication delivery", purpose: "Deliver authentication safely.", status: "active", version: 2, process: { name: "Feature delivery" }, qualityStandard: null, steps: [{ id: "step-auth", stepOrder: 1, instruction: "Verify session boundaries", stepType: "manual" }] }
  }];
  const packet = buildApplicationGraph({
    workspace,
    application,
    capabilities: [auth],
    readiness: { overall: 50, blockers: [] },
    procedures: [{ relationType: "governs", required: true, procedure: { id: "procedure-release", name: "Release SOP", purpose: "Release safely.", status: "draft", version: 1, process: null, qualityStandard: null, steps: [{ id: "step-release", stepOrder: 1, instruction: "Run checks", stepType: "automation" }] } }],
    projects: [{ relationType: "delivery", project: { id: "project-soar", name: "Soar delivery", status: "active", taskLists: [{ id: "list-verification", name: "Verification", status: "active", tasks: [{ id: "task-login", title: "Verify login", status: "in_progress", priority: "high", dueDate: null }] }], tasks: [] } }]
  });

  const release = packet.nodes.find((node) => node.entityId === "procedure-release");
  const inherited = packet.nodes.find((node) => node.entityId === "procedure-auth");
  const capabilityNode = packet.nodes.find((node) => node.entityId === auth.id);
  const task = packet.nodes.find((node) => node.entityId === "task-login");

  assert.equal(release?.type, "procedure");
  assert.equal(release?.isBlocked, true);
  assert.equal(inherited?.parentNodeId, capabilityNode?.id);
  assert.equal(task?.type, "task");
  assert.equal(task?.completeness, 50);
  assert.equal(packet.nodes.some((node) => node.type === "project" && node.entityId === "project-soar"), true);
});
