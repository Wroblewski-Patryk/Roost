import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { PrismaClient, type ArchitectureComponentType, type CapabilityState } from "@prisma/client";

type CsvRow = Record<string, string>;

const prisma = new PrismaClient();

function parseCsv(source: string): CsvRow[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === '"') {
      if (quoted && source[index + 1] === '"') {
        value += '"';
        index += 1;
      } else quoted = !quoted;
    } else if (character === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && source[index + 1] === "\n") index += 1;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = "";
    } else value += character;
  }
  if (value.length || row.length) {
    row.push(value);
    rows.push(row);
  }
  const [headers, ...data] = rows;
  if (!headers) return [];
  return data.map((cells) => Object.fromEntries(headers.map((header, index) => [header.trim(), (cells[index] ?? "").trim()])));
}

function readCsv(filePath: string) {
  return parseCsv(fs.readFileSync(filePath, "utf8"));
}

function splitIds(value?: string) {
  return (value || "").split(";").map((item) => item.trim()).filter(Boolean);
}

function percent(value?: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100 ? Math.round(parsed) : 0;
}

function stateFor(value: number): CapabilityState {
  if (value >= 98) return "verified";
  if (value >= 85) return "complete";
  if (value > 0) return "partial";
  return "unknown";
}

function componentType(row: CsvRow): ArchitectureComponentType {
  if (row.type === "database_model" || row.layer === "data") return "database";
  if (row.type === "queue") return "queue";
  if (row.layer === "frontend") return "frontend";
  if (row.layer === "backend") return "backend";
  if (row.layer === "ci") return "ci_cd";
  if (row.layer === "operations") return "deployment";
  return "other";
}

const capabilityForFeature: Record<string, string> = {
  "auth-session": "authentication",
  "dashboard-runtime": "responsive-ui",
  "manual-order": "trading-engine",
  "architecture-map": "technical-documentation",
  wallets: "trading-engine",
  "profile-api-keys": "api-keys",
  "release-audit-tooling": "ci-cd",
  "bot-setup": "trading-engine",
  strategies: "trading-engine",
  markets: "market-data",
  backtests: "trading-engine",
  reports: "product-analytics",
  "logs-audit": "audit-history",
  "subscriptions-admin": "billing",
  "ai-assistant-foundation": "structured-api",
  "ops-config-pipeline": "monitoring",
  "api-support-routes": "rest-api",
  "runtime-support-services": "trading-engine",
  "api-platform-safety": "input-validation",
  "web-runtime-surfaces": "responsive-ui",
  "exchange-adapter": "trading-engine",
  positions: "position-management",
  "bot-runtime": "trading-engine",
  "market-data-stream-adapters": "market-data",
  "engine-runtime-core": "trading-engine",
  "web-residual-surfaces": "responsive-ui",
  "profile-basic": "users",
  "runtime-dca-pnl": "position-management",
  "profile-security": "authorization",
  "data-model": "database"
};

function featureName(key: string, featureRows: Map<string, CsvRow>) {
  return featureRows.get(key)?.name || key.replace(/[_-]+/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function main() {
  const sourceRoot = path.resolve(process.argv[2] || path.join(process.cwd(), "..", "Soar"));
  const registryRoot = path.join(sourceRoot, "docs", "architecture");
  const nodesPath = path.join(registryRoot, "registry", "nodes.csv");
  const dependenciesPath = path.join(registryRoot, "relations", "dependencies.csv");
  const chainsPath = path.join(registryRoot, "chains", "chains.csv");
  const featuresPath = path.join(registryRoot, "registry", "features.csv");
  for (const required of [nodesPath, dependenciesPath, chainsPath, featuresPath]) {
    if (!fs.existsSync(required)) throw new Error(`Missing Soar architecture source: ${required}`);
  }

  const application = await prisma.application.findFirst({
    where: { slug: "soar" },
    include: { capabilities: { include: { capabilityDefinition: true } }, architecture: true }
  });
  if (!application) throw new Error("Roost does not contain the Soar application. Run the regular seed first.");

  // Feature rows become native Roost FeatureDefinition/ApplicationFeature
  // records. Importing them again as implementation atoms would produce two
  // visually indistinguishable "Auth session" nodes.
  const nodes = readCsv(nodesPath).filter((row) => row.id && row.name && row.type !== "feature");
  const dependencies = readCsv(dependenciesPath);
  const chains = readCsv(chainsPath).filter((row) => row.id && row.name);
  const featureRows = new Map(readCsv(featuresPath).map((row) => [row.feature, row]));
  const nodeIds = new Set(nodes.map((row) => row.id));
  const relationsBySource = new Map<string, Array<{ targetSourceId: string; type: string; status: string; description: string }>>();

  for (const relation of dependencies) {
    if (!nodeIds.has(relation.source_id) || !nodeIds.has(relation.target_id)) continue;
    const rows = relationsBySource.get(relation.source_id) ?? [];
    rows.push({ targetSourceId: relation.target_id, type: relation.relation_type || "relates_to", status: relation.status, description: relation.description });
    relationsBySource.set(relation.source_id, rows);
  }
  for (const node of nodes) {
    const rows = relationsBySource.get(node.id) ?? [];
    const existingTargets = new Set(rows.map((relation) => relation.targetSourceId));
    for (const targetSourceId of splitIds(node.depends_on)) {
      if (nodeIds.has(targetSourceId) && !existingTargets.has(targetSourceId)) rows.push({ targetSourceId, type: "depends_on", status: node.verification_status, description: "Registry dependency" });
    }
    relationsBySource.set(node.id, rows);
  }

  const capabilityByKey = new Map(application.capabilities.map((item) => [item.capabilityDefinition.key, item]));
  const featureKeys = Array.from(new Set(nodes.map((row) => row.feature).filter(Boolean))).sort();
  const featureDefinitionByKey = new Map<string, { id: string }>();
  const neededCapabilityKeys = Array.from(new Set(featureKeys.map((key) => capabilityForFeature[key] || "technical-documentation")));
  const definitions = await prisma.capabilityDefinition.findMany({ where: { workspaceId: application.workspaceId, key: { in: neededCapabilityKeys } } });
  for (const definition of definitions) {
    if (capabilityByKey.has(definition.key)) continue;
    const capability = await prisma.applicationCapability.create({
      data: { applicationId: application.id, capabilityDefinitionId: definition.id, applicability: "required", targetState: "complete", observedState: "unknown" },
      include: { capabilityDefinition: true }
    });
    capabilityByKey.set(definition.key, capability);
  }

  for (const [position, key] of featureKeys.entries()) {
    const capability = capabilityByKey.get(capabilityForFeature[key] || "technical-documentation");
    if (!capability) continue;
    const source = featureRows.get(key);
    const definition = await prisma.featureDefinition.upsert({
      where: { capabilityDefinitionId_key: { capabilityDefinitionId: capability.capabilityDefinitionId, key } },
      update: { name: featureName(key, featureRows), description: source?.description || undefined, position },
      create: { capabilityDefinitionId: capability.capabilityDefinitionId, key, name: featureName(key, featureRows), description: source?.description || undefined, position }
    });
    featureDefinitionByKey.set(key, definition);
    const relatedNodes = nodes.filter((row) => row.feature === key);
    const completion = relatedNodes.length ? Math.round(relatedNodes.reduce((sum, row) => sum + percent(row.completion_percent), 0) / relatedNodes.length) : 0;
    await prisma.applicationFeature.upsert({
      where: { applicationId_featureDefinitionId: { applicationId: application.id, featureDefinitionId: definition.id } },
      update: { observedState: stateFor(completion), lifecycleStatus: completion >= 85 ? "tested" : "implementing", notes: source?.description || source?.notes || undefined },
      create: { applicationId: application.id, applicationCapabilityId: capability.id, featureDefinitionId: definition.id, applicability: "required", targetState: "complete", observedState: stateFor(completion), lifecycleStatus: completion >= 85 ? "tested" : "implementing", notes: source?.description || source?.notes || undefined }
    });
  }

  for (const capability of capabilityByKey.values()) {
    const keys = featureKeys.filter((key) => capabilityForFeature[key] === capability.capabilityDefinition.key);
    if (!keys.length) continue;
    const related = nodes.filter((row) => keys.includes(row.feature));
    const completion = related.length ? Math.round(related.reduce((sum, row) => sum + percent(row.completion_percent), 0) / related.length) : 0;
    await prisma.applicationCapability.update({
      where: { id: capability.id },
      data: { observedState: stateFor(completion), lifecycleStatus: completion >= 85 ? "tested" : "implementing", observedSummary: `Imported from ${related.length} Soar architecture registry atoms.` }
    });
  }

  const importedIds = application.architecture
    .filter((item) => item.metadata && typeof item.metadata === "object" && !Array.isArray(item.metadata) && (item.metadata as Record<string, unknown>).sourceSystem === "soar-architecture-registry")
    .map((item) => item.id);

  const architectureRows = nodes.map((row) => ({
    applicationId: application.id,
    type: componentType(row),
    name: row.name,
    description: row.description || null,
    status: "active" as const,
    metadata: {
      sourceSystem: "soar-architecture-registry",
      sourceId: row.id,
      atomType: row.type,
      layer: row.layer || "other",
      module: row.module || undefined,
      feature: featureDefinitionByKey.has(row.feature) ? row.feature : undefined,
      parentSourceId: nodeIds.has(row.parent_id) ? row.parent_id : undefined,
      completionPercent: percent(row.completion_percent),
      verificationStatus: row.verification_status || row.status,
      riskLevel: row.risk_level,
      filePath: row.file_path,
      lastVerifiedAt: row.last_verified_at,
      relations: relationsBySource.get(row.id) ?? []
    }
  }));

  const chainRows = chains.map((row) => ({
    applicationId: application.id,
    type: "other" as const,
    name: row.name,
    description: row.notes || `Executable chain for ${row.feature}.`,
    status: "active" as const,
    metadata: {
      sourceSystem: "soar-architecture-registry",
      sourceId: row.id,
      atomType: "chain",
      layer: "flow",
      module: "architecture-chain",
      feature: featureDefinitionByKey.has(row.feature) ? row.feature : undefined,
      completionPercent: row.status === "verified" ? 100 : row.status.includes("verified") ? 90 : 60,
      verificationStatus: row.status,
      riskLevel: row.risk_level,
      filePath: row.evidence || undefined,
      lastVerifiedAt: row.last_verified_at,
      relations: splitIds(row.chain_node_ids).filter((id) => nodeIds.has(id)).map((targetSourceId) => ({ targetSourceId, type: "traces", status: row.status, description: "Chain member" }))
    }
  }));

  await prisma.$transaction(async (tx) => {
    if (importedIds.length) await tx.applicationArchitectureComponent.deleteMany({ where: { id: { in: importedIds } } });
    for (let index = 0; index < architectureRows.length; index += 100) {
      await tx.applicationArchitectureComponent.createMany({ data: architectureRows.slice(index, index + 100) });
    }
    await tx.applicationArchitectureComponent.createMany({ data: chainRows });
  });

  const procedures = await prisma.procedure.findMany({
    where: { workspaceId: application.workspaceId, status: "active" },
    orderBy: [{ version: "desc" }, { name: "asc" }]
  });
  const latestProcedureByName = new Map<string, (typeof procedures)[number]>();
  for (const procedure of procedures) if (!latestProcedureByName.has(procedure.name)) latestProcedureByName.set(procedure.name, procedure);
  const applicationProcedureNames = ["PROC-SH-APPLICATION-LIFECYCLE", "Feature Development Pipeline SOP", "Deployment Pipeline SOP"];
  for (const name of applicationProcedureNames) {
    const procedure = latestProcedureByName.get(name);
    if (!procedure) continue;
    await prisma.applicationProcedure.upsert({
      where: { applicationId_procedureId: { applicationId: application.id, procedureId: procedure.id } },
      create: { applicationId: application.id, procedureId: procedure.id, relationType: "governs", required: true },
      update: { relationType: "governs", required: true }
    });
  }
  const capabilityProcedureNames: Record<string, string> = {
    "ci-cd": "Deployment Pipeline SOP",
    "technical-documentation": "Documentation Update Pipeline SOP",
    "rest-api": "Integration Onboarding Pipeline SOP"
  };
  for (const [capabilityKey, procedureName] of Object.entries(capabilityProcedureNames)) {
    const capability = capabilityByKey.get(capabilityKey);
    const procedure = latestProcedureByName.get(procedureName);
    if (!capability || !procedure) continue;
    await prisma.capabilityProcedure.upsert({
      where: { capabilityDefinitionId_procedureId: { capabilityDefinitionId: capability.capabilityDefinitionId, procedureId: procedure.id } },
      create: { capabilityDefinitionId: capability.capabilityDefinitionId, procedureId: procedure.id, relationType: "implementation", required: true },
      update: { relationType: "implementation", required: true }
    });
  }

  let project = await prisma.project.findFirst({
    where: { workspaceId: application.workspaceId, source: "soar-architecture-registry", externalId: "soar-product-engineering" }
  });
  project = project
    ? await prisma.project.update({ where: { id: project.id }, data: { name: "Soar Product Engineering", status: "active", description: "Execution work derived from the Soar architecture registry and verification chains." } })
    : await prisma.project.create({ data: { workspaceId: application.workspaceId, source: "soar-architecture-registry", externalId: "soar-product-engineering", name: "Soar Product Engineering", status: "active", description: "Execution work derived from the Soar architecture registry and verification chains." } });
  await prisma.applicationProject.upsert({
    where: { applicationId_projectId: { applicationId: application.id, projectId: project.id } },
    create: { applicationId: application.id, projectId: project.id, relationType: "delivery" },
    update: { relationType: "delivery" }
  });
  let taskList = await prisma.taskList.findFirst({ where: { projectId: project.id, source: "soar-architecture-registry", externalId: "soar-verification-gaps" } });
  taskList = taskList
    ? await prisma.taskList.update({ where: { id: taskList.id }, data: { name: "Architecture verification gaps", status: "active" } })
    : await prisma.taskList.create({ data: { workspaceId: application.workspaceId, projectId: project.id, source: "soar-architecture-registry", externalId: "soar-verification-gaps", name: "Architecture verification gaps", description: "Open verification work generated from Soar executable chains." } });
  for (const chain of chains) {
    const missingLinks = splitIds(chain.missing_links);
    const status = chain.status === "verified" && !missingLinks.length ? "done" : chain.status.includes("verified") ? "in_progress" : "todo";
    await prisma.task.upsert({
      where: { workspaceId_source_externalId: { workspaceId: application.workspaceId, source: "soar-architecture-registry", externalId: `chain:${chain.id}` } },
      create: { workspaceId: application.workspaceId, projectId: project.id, taskListId: taskList.id, source: "soar-architecture-registry", externalId: `chain:${chain.id}`, title: `Verify ${chain.name}`, description: missingLinks.length ? `Missing links: ${missingLinks.join(", ")}` : chain.notes || "Verify the complete executable chain and its evidence.", status, priority: chain.risk_level === "high" ? "high" : "medium" },
      update: { projectId: project.id, taskListId: taskList.id, title: `Verify ${chain.name}`, description: missingLinks.length ? `Missing links: ${missingLinks.join(", ")}` : chain.notes || "Verify the complete executable chain and its evidence.", status, priority: chain.risk_level === "high" ? "high" : "medium" }
    });
  }

  console.log(JSON.stringify({
    application: application.name,
    sourceRoot,
    features: featureDefinitionByKey.size,
    implementationAtoms: architectureRows.length,
    chains: chainRows.length,
    procedures: applicationProcedureNames.filter((name) => latestProcedureByName.has(name)).length,
    project: project.name,
    tasks: chains.length,
    relations: Array.from(relationsBySource.values()).reduce((sum, rows) => sum + rows.length, 0)
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
