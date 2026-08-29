import {
  ActorType,
  ApplicationInterfaceType,
  ApplicationPlatform,
  ApplicationStatus,
  ApplicationType,
  ArchitectureComponentType,
  CapabilityApplicability,
  CapabilityLifecycleStatus,
  CapabilityState,
  EvidenceSource,
  EvidenceType,
  EvidenceVerificationStatus,
  ImplementationStrategy,
  InnovationLifecycleStage,
  OperatingStatus,
  ProductLifecycleStage,
  ProductOfferingStatus,
  ProductOfferingType,
  Prisma
} from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { sendApiError } from "../../middleware/api-error";
import { asyncHandler } from "../../middleware/async-handler";
import { createEvent } from "../events/event.service";
import { buildApplicationGraph, buildPortfolioGraph } from "./application-graph";
import { calculateApplicationReadiness } from "./readiness";

const optionalText = z.string().trim().min(1).optional().nullable();
const keySchema = z.string().trim().min(1).max(100).regex(/^[a-z0-9]+(?:[._-][a-z0-9]+)*$/);
const idSchema = z.string().uuid();

const createApplicationSchema = z.object({
  name: z.string().trim().min(1),
  slug: keySchema,
  description: optionalText,
  problemStatement: optionalText,
  targetUsers: optionalText,
  valueProposition: optionalText,
  applicationType: z.nativeEnum(ApplicationType).optional(),
  owner: optionalText,
  innovationStage: z.nativeEnum(InnovationLifecycleStage).optional(),
  productStage: z.nativeEnum(ProductLifecycleStage).optional(),
  status: z.nativeEnum(ApplicationStatus).optional(),
  businessModel: optionalText,
  targetPlatforms: z.array(z.nativeEnum(ApplicationPlatform)).optional(),
  frontendUrl: optionalText,
  backendUrl: optionalText,
  documentationUrl: optionalText,
  source: z.nativeEnum(EvidenceSource).optional(),
  blueprintId: idSchema.optional(),
  metadata: z.record(z.unknown()).optional()
});

const updateApplicationSchema = createApplicationSchema.omit({ slug: true, blueprintId: true }).partial();

const createDomainSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  description: optionalText,
  position: z.number().int().min(0).optional()
});

const createReadinessDimensionSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  description: optionalText,
  weight: z.number().int().min(1).max(1000).optional(),
  position: z.number().int().min(0).optional()
});

const createCapabilityDefinitionSchema = z.object({
  domainId: idSchema,
  readinessDimensionId: idSchema.optional().nullable(),
  key: keySchema,
  name: z.string().trim().min(1),
  description: optionalText,
  universal: z.boolean().optional(),
  defaultApplicability: z.nativeEnum(CapabilityApplicability).optional(),
  maturity: z.string().trim().min(1).optional(),
  deprecated: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1)).optional()
});

const updateCapabilityDefinitionSchema = createCapabilityDefinitionSchema.omit({ key: true }).partial();

const createFeatureDefinitionSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  description: optionalText,
  position: z.number().int().min(0).optional()
});

const assignCapabilitySchema = z.object({
  capabilityDefinitionId: idSchema,
  applicability: z.nativeEnum(CapabilityApplicability),
  priority: z.number().int().min(0).max(100).optional(),
  targetState: z.nativeEnum(CapabilityState).optional(),
  lifecycleStatus: z.nativeEnum(CapabilityLifecycleStatus).optional(),
  implementationStrategy: z.nativeEnum(ImplementationStrategy).optional(),
  targetDescription: optionalText,
  observedSummary: optionalText,
  rationale: optionalText,
  notes: optionalText,
  owner: optionalText
});

const updateApplicationCapabilitySchema = assignCapabilitySchema.omit({ capabilityDefinitionId: true }).partial();

const assignFeatureSchema = z.object({
  applicationCapabilityId: idSchema,
  featureDefinitionId: idSchema,
  applicability: z.nativeEnum(CapabilityApplicability),
  priority: z.number().int().min(0).max(100).optional(),
  targetState: z.nativeEnum(CapabilityState).optional(),
  lifecycleStatus: z.nativeEnum(CapabilityLifecycleStatus).optional(),
  notes: optionalText
});

const createRepositorySchema = z.object({
  name: z.string().trim().min(1),
  url: z.string().trim().min(1),
  defaultBranch: optionalText,
  purpose: optionalText,
  isPrimary: z.boolean().optional()
});

const createDimensionSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  applicability: z.nativeEnum(CapabilityApplicability).optional(),
  targetState: z.nativeEnum(CapabilityState).optional(),
  notes: optionalText
});

const createObservationSchema = z.object({
  applicationCapabilityId: idSchema.optional(),
  applicationFeatureId: idSchema.optional(),
  applicationCapabilityDimensionId: idSchema.optional(),
  observedState: z.nativeEnum(CapabilityState),
  summary: optionalText,
  source: z.nativeEnum(EvidenceSource).optional(),
  confidence: z.number().int().min(0).max(100).optional()
}).refine((value) => [value.applicationCapabilityId, value.applicationFeatureId, value.applicationCapabilityDimensionId].filter(Boolean).length === 1, {
  message: "exactly_one_observation_target_required"
});

const createEvidenceSchema = z.object({
  applicationCapabilityId: idSchema.optional(),
  applicationFeatureId: idSchema.optional(),
  observationId: idSchema.optional(),
  type: z.nativeEnum(EvidenceType),
  source: z.nativeEnum(EvidenceSource).optional(),
  reference: z.string().trim().min(1),
  url: optionalText,
  description: optionalText,
  observedAt: z.coerce.date().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  metadata: z.record(z.unknown()).optional()
});

const createDependencySchema = z.object({
  fromCapabilityId: idSchema,
  toCapabilityId: idSchema,
  required: z.boolean().optional(),
  notes: optionalText
}).refine((value) => value.fromCapabilityId !== value.toCapabilityId, { message: "self_dependency_not_allowed" });

const createPackSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  description: optionalText,
  items: z.array(z.object({
    capabilityDefinitionId: idSchema,
    applicability: z.nativeEnum(CapabilityApplicability).optional(),
    priority: z.number().int().min(0).max(100).optional()
  })).default([])
});

const createBlueprintSchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  description: optionalText,
  suggestions: z.record(z.unknown()).optional(),
  capabilities: z.array(z.object({
    capabilityDefinitionId: idSchema,
    applicability: z.nativeEnum(CapabilityApplicability).optional(),
    priority: z.number().int().min(0).max(100).optional()
  })).default([])
});

const createTechnologySchema = z.object({
  key: keySchema,
  name: z.string().trim().min(1),
  category: z.string().trim().min(1),
  description: optionalText,
  websiteUrl: optionalText
});

const attachTechnologySchema = z.object({
  technologyDefinitionId: idSchema,
  purpose: optionalText,
  version: optionalText,
  scope: optionalText,
  rationale: optionalText
});

const createArchitectureComponentSchema = z.object({
  type: z.nativeEnum(ArchitectureComponentType),
  name: z.string().trim().min(1),
  description: optionalText,
  technologyDefinitionId: idSchema.optional().nullable(),
  version: optionalText,
  metadata: z.record(z.unknown()).optional()
});

const createInterfaceSchema = z.object({
  applicationCapabilityId: idSchema.optional().nullable(),
  applicationFeatureId: idSchema.optional().nullable(),
  type: z.nativeEnum(ApplicationInterfaceType),
  key: keySchema,
  name: z.string().trim().min(1),
  reference: optionalText,
  description: optionalText,
  requiresApproval: z.boolean().optional(),
  auditRequired: z.boolean().optional()
});

const createOfferingSchema = z.object({
  applicationId: idSchema.optional().nullable(),
  key: keySchema,
  name: z.string().trim().min(1),
  type: z.nativeEnum(ProductOfferingType),
  description: optionalText,
  valueProposition: optionalText,
  customerSegment: optionalText,
  businessModel: optionalText,
  pricing: z.record(z.unknown()).optional(),
  lifecycleStage: z.nativeEnum(ProductLifecycleStage).optional(),
  commercialStatus: z.nativeEnum(ProductOfferingStatus).optional(),
  productOwner: optionalText,
  salesReadiness: z.nativeEnum(CapabilityState).optional(),
  supportReadiness: z.nativeEnum(CapabilityState).optional(),
  documentationUrl: optionalText
});

const updateOfferingSchema = createOfferingSchema.omit({ key: true }).partial();

const procedureInclude = {
  process: true,
  qualityStandard: true,
  steps: { orderBy: { stepOrder: "asc" as const } }
};

const projectInclude = {
  taskLists: { include: { tasks: { orderBy: [{ status: "asc" as const }, { updatedAt: "desc" as const }] } }, orderBy: { name: "asc" as const } },
  tasks: { where: { taskListId: null }, orderBy: [{ status: "asc" as const }, { updatedAt: "desc" as const }] }
};

const capabilityInclude = {
  capabilityDefinition: {
    include: {
      domain: true,
      readinessDimension: true,
      features: true,
      procedures: { include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" as const } }
    }
  },
  dimensions: { orderBy: { key: "asc" as const } },
  evidence: { orderBy: { observedAt: "desc" as const } },
  interfaces: { orderBy: { name: "asc" as const } },
  features: { include: { featureDefinition: true, evidence: true, interfaces: true } },
  dependenciesFrom: { include: { toCapability: { include: { capabilityDefinition: true } } } },
  dependenciesTo: { include: { fromCapability: { include: { capabilityDefinition: true } } } }
};

function actor(req: Express.Request) {
  return req.auth!.authType === "user"
    ? { actorType: ActorType.user, actorId: req.auth!.userId ?? null }
    : { actorType: ActorType.agent, actorId: req.auth!.apiKeyId ?? null };
}

async function audit(req: Express.Request, action: string, resourceType: string, resourceId: string, inputPayload: Record<string, unknown> = {}) {
  const actorContext = actor(req);
  await prisma.auditLog.create({
    data: {
      workspaceId: req.auth!.workspaceId,
      ...actorContext,
      action,
      resourceType,
      resourceId,
      correlationId: `product-engineering:${resourceType}:${resourceId}:${Date.now()}`,
      inputPayload: inputPayload as Prisma.InputJsonValue
    }
  });
}

async function applicationForWorkspace(workspaceId: string, id: string) {
  return prisma.application.findFirst({ where: { id, workspaceId } });
}

async function capabilityForWorkspace(workspaceId: string, id: string) {
  return prisma.applicationCapability.findFirst({ where: { id, application: { workspaceId } } });
}

async function loadCapabilities(applicationId: string) {
  return prisma.applicationCapability.findMany({
    where: { applicationId },
    include: capabilityInclude,
    orderBy: [{ capabilityDefinition: { domain: { position: "asc" } } }, { priority: "desc" }]
  });
}

function readinessInput(capabilities: Awaited<ReturnType<typeof loadCapabilities>>) {
  return capabilities.map((capability) => ({
    id: capability.id,
    applicability: capability.applicability,
    observedState: capability.observedState,
    dimensionKey: capability.capabilityDefinition.readinessDimension?.key ?? capability.capabilityDefinition.domain.key,
    dimensionName: capability.capabilityDefinition.readinessDimension?.name ?? capability.capabilityDefinition.domain.name,
    dimensionWeight: capability.capabilityDefinition.readinessDimension?.weight ?? 100,
    dimensions: capability.dimensions.map((dimension) => ({
      applicability: dimension.applicability,
      observedState: dimension.observedState
    })),
    evidence: capability.evidence.map((evidence) => ({ verificationStatus: evidence.verificationStatus })),
    blockedBy: capability.dependenciesFrom.map((dependency) => ({
      id: dependency.toCapability.id,
      observedState: dependency.toCapability.observedState,
      required: dependency.required
    }))
  }));
}

function gapsFor(capabilities: Awaited<ReturnType<typeof loadCapabilities>>) {
  return capabilities
    .filter((capability) => capability.applicability !== "not_applicable" && !["complete", "verified"].includes(capability.observedState))
    .map((capability) => {
      const blockedBy = capability.dependenciesFrom
        .filter((dependency) => dependency.required && !["complete", "verified"].includes(dependency.toCapability.observedState))
        .map((dependency) => ({
          id: dependency.toCapability.id,
          key: dependency.toCapability.capabilityDefinition.key,
          name: dependency.toCapability.capabilityDefinition.name,
          observedState: dependency.toCapability.observedState
        }));
      return {
        id: capability.id,
        capabilityDefinitionId: capability.capabilityDefinitionId,
        key: capability.capabilityDefinition.key,
        name: capability.capabilityDefinition.name,
        domain: capability.capabilityDefinition.domain,
        applicability: capability.applicability,
        targetState: capability.targetState,
        observedState: capability.observedState,
        priority: capability.priority,
        evidenceCount: capability.evidence.length,
        verifiedEvidenceCount: capability.evidence.filter((evidence) => evidence.verificationStatus === "verified").length,
        blocked: blockedBy.length > 0,
        blockedBy,
        severity: (blockedBy.length ? "blocker" : capability.applicability === "required" ? "critical" : capability.applicability === "recommended" ? "high" : "medium") as "blocker" | "critical" | "high" | "medium"
      };
    })
    .sort((left, right) => {
      const order = { blocker: 0, critical: 1, high: 2, medium: 3 };
      return order[left.severity] - order[right.severity] || right.priority - left.priority;
    });
}

export const productEngineeringRouter = Router();

productEngineeringRouter.get("/graph", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [workspace, applications] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } }),
    prisma.application.findMany({
      where: { workspaceId, status: { not: ApplicationStatus.archived } },
      include: { capabilities: { include: capabilityInclude }, evidence: { select: { id: true } } },
      orderBy: [{ name: "asc" }, { id: "asc" }]
    })
  ]);
  if (!workspace) return sendApiError(res, 404, "workspace_not_found");
  const packet = buildPortfolioGraph({
    workspace,
    applications: applications.map((application) => {
      const readiness = calculateApplicationReadiness(readinessInput(application.capabilities));
      const gaps = gapsFor(application.capabilities);
      return {
        ...application,
        readiness,
        capabilityCount: application.capabilities.filter((capability) => capability.applicability !== "not_applicable").length,
        gapCount: gaps.length,
        evidenceCount: application.evidence.length
      };
    })
  });
  res.json({ data: packet });
}));

productEngineeringRouter.get("/applications/:id/graph", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [workspace, application, architecture, procedures, projects] = await Promise.all([
    prisma.workspace.findUnique({ where: { id: workspaceId }, select: { id: true, name: true } }),
    prisma.application.findFirst({ where: { id: String(req.params.id), workspaceId } }),
    prisma.applicationArchitectureComponent.findMany({
      where: { application: { id: String(req.params.id), workspaceId } },
      orderBy: [{ name: "asc" }, { id: "asc" }]
    }),
    prisma.applicationProcedure.findMany({
      where: { application: { id: String(req.params.id), workspaceId } },
      include: { procedure: { include: procedureInclude } },
      orderBy: { createdAt: "asc" }
    }),
    prisma.applicationProject.findMany({
      where: { application: { id: String(req.params.id), workspaceId } },
      include: { project: { include: projectInclude } },
      orderBy: { createdAt: "asc" }
    })
  ]);
  if (!workspace) return sendApiError(res, 404, "workspace_not_found");
  if (!application) return sendApiError(res, 404, "application_not_found");
  const capabilities = await loadCapabilities(application.id);
  const readiness = calculateApplicationReadiness(readinessInput(capabilities));
  res.json({ data: buildApplicationGraph({ workspace, application, capabilities, architecture, procedures, projects, readiness }) });
}));

productEngineeringRouter.get("/portfolio", asyncHandler(async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { workspaceId: req.auth!.workspaceId, status: { not: ApplicationStatus.archived } },
    include: { capabilities: { include: capabilityInclude }, offerings: true },
    orderBy: { updatedAt: "desc" }
  });
  const rows = applications.map((application) => {
    const readiness = calculateApplicationReadiness(readinessInput(application.capabilities));
    const gaps = gapsFor(application.capabilities);
    return { ...application, readiness, gapSummary: { total: gaps.length, blockers: gaps.filter((gap) => gap.blocked).length } };
  });
  res.json({
    data: {
      summary: {
        applications: rows.length,
        activeDevelopment: rows.filter((row) => ["mvp", "development", "validation"].includes(row.innovationStage)).length,
        prototypes: rows.filter((row) => row.innovationStage === "prototype").length,
        productization: rows.filter((row) => row.innovationStage === "productization").length,
        products: rows.filter((row) => row.productStage === "active").length,
        averageReadiness: rows.length ? Math.round(rows.reduce((sum, row) => sum + row.readiness.overall, 0) / rows.length) : 0
      },
      applications: rows
    }
  });
}));

productEngineeringRouter.get("/applications", asyncHandler(async (req, res) => {
  const applications = await prisma.application.findMany({
    where: { workspaceId: req.auth!.workspaceId },
    include: { repositories: true, offerings: true, _count: { select: { capabilities: true, evidence: true, projects: true } } },
    orderBy: { updatedAt: "desc" }
  });
  res.json({ data: applications });
}));

productEngineeringRouter.post("/applications", asyncHandler(async (req, res) => {
  const input = createApplicationSchema.parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const blueprint = input.blueprintId ? await prisma.applicationBlueprint.findFirst({
    where: { id: input.blueprintId, workspaceId }, include: { capabilities: true }
  }) : null;
  if (input.blueprintId && !blueprint) return sendApiError(res, 404, "blueprint_not_found");
  const { blueprintId: _blueprintId, ...applicationInput } = input;
  const application = await prisma.$transaction(async (tx) => {
    const created = await tx.application.create({
      data: {
        ...applicationInput,
        metadata: applicationInput.metadata as Prisma.InputJsonValue | undefined,
        workspaceId
      }
    });
    if (blueprint?.capabilities.length) {
      await tx.applicationCapability.createMany({
        data: blueprint.capabilities.map((item) => ({
          applicationId: created.id,
          capabilityDefinitionId: item.capabilityDefinitionId,
          applicability: item.applicability,
          priority: item.priority
        }))
      });
    }
    return created;
  });
  await audit(req, "application.create", "Application", application.id, { slug: application.slug });
  await createEvent({ type: "application_created", workspaceId, ...actor(req), resourceType: "Application", resourceId: application.id, payload: { slug: application.slug } });
  res.status(201).json({ data: application });
}));

productEngineeringRouter.get("/applications/:id", asyncHandler(async (req, res) => {
  const application = await prisma.application.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId },
    include: {
      repositories: true,
      technologies: { include: { technologyDefinition: true } },
      architecture: { include: { technologyDefinition: true } },
      interfaces: true,
      evidence: { orderBy: { observedAt: "desc" }, take: 100 },
      offerings: true,
      procedures: { include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" } },
      projects: { include: { project: { include: projectInclude } }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!application) return sendApiError(res, 404, "application_not_found");
  res.json({ data: application });
}));

productEngineeringRouter.patch("/applications/:id", asyncHandler(async (req, res) => {
  const input = updateApplicationSchema.parse(req.body);
  const existing = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!existing) return sendApiError(res, 404, "application_not_found");
  const application = await prisma.application.update({
    where: { id: existing.id },
    data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined }
  });
  await audit(req, "application.update", "Application", application.id, { changed: Object.keys(input) });
  await createEvent({ type: "application_updated", workspaceId: req.auth!.workspaceId, ...actor(req), resourceType: "Application", resourceId: application.id, payload: { changed: Object.keys(input) } });
  res.json({ data: application });
}));

productEngineeringRouter.get("/applications/:id/capability-map", asyncHandler(async (req, res) => {
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const capabilities = await loadCapabilities(application.id);
  res.json({ data: { application, capabilities } });
}));

productEngineeringRouter.get("/applications/:id/gaps", asyncHandler(async (req, res) => {
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const capabilities = await loadCapabilities(application.id);
  const gaps = gapsFor(capabilities);
  res.json({ data: { application, summary: { total: gaps.length, blockers: gaps.filter((gap) => gap.blocked).length }, gaps } });
}));

productEngineeringRouter.get("/applications/:id/readiness", asyncHandler(async (req, res) => {
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const capabilities = await loadCapabilities(application.id);
  res.json({ data: { application, readiness: calculateApplicationReadiness(readinessInput(capabilities)) } });
}));

productEngineeringRouter.get("/applications/:id/agent-context", asyncHandler(async (req, res) => {
  const application = await prisma.application.findFirst({
    where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId },
    include: {
      repositories: true,
      technologies: { include: { technologyDefinition: true } },
      architecture: { include: { technologyDefinition: true } },
      interfaces: true,
      offerings: true,
      procedures: { include: { procedure: { include: procedureInclude } }, orderBy: { createdAt: "asc" } },
      projects: { include: { project: { include: projectInclude } }, orderBy: { createdAt: "asc" } }
    }
  });
  if (!application) return sendApiError(res, 404, "application_not_found");
  const capabilities = await loadCapabilities(application.id);
  const gaps = gapsFor(capabilities);
  const readiness = calculateApplicationReadiness(readinessInput(capabilities));
  res.json({
    data: {
      schemaVersion: "application-agent-context-v2",
      generatedAt: new Date().toISOString(),
      application,
      lifecycle: { innovation: application.innovationStage, product: application.productStage, status: application.status },
      targetCapabilities: capabilities.filter((item) => item.applicability !== "not_applicable").map((item) => ({ id: item.id, definition: item.capabilityDefinition, applicability: item.applicability, targetState: item.targetState })),
      observedCapabilities: capabilities.map((item) => ({ id: item.id, definitionKey: item.capabilityDefinition.key, observedState: item.observedState, observedSummary: item.observedSummary, evidence: item.evidence })),
      gaps,
      blockers: gaps.filter((gap) => gap.blocked),
      dependencies: capabilities.flatMap((item) => item.dependenciesFrom),
      operatingModel: {
        applicationProcedures: application.procedures,
        capabilityProcedures: capabilities.flatMap((item) => item.capabilityDefinition.procedures.map((link) => ({
          capabilityId: item.id,
          capabilityKey: item.capabilityDefinition.key,
          ...link
        }))),
        projects: application.projects
      },
      architecture: application.architecture,
      technologies: application.technologies,
      interfaces: application.interfaces,
      evidenceSummary: {
        total: capabilities.reduce((sum, item) => sum + item.evidence.length, 0),
        verified: capabilities.reduce((sum, item) => sum + item.evidence.filter((evidence) => evidence.verificationStatus === "verified").length, 0),
        requiredWithoutEvidence: capabilities.filter((item) => item.applicability === "required" && item.evidence.length === 0).map((item) => item.capabilityDefinition.key)
      },
      readiness,
      authority: {
        sourceOfTruth: "roost",
        declarationIsNotObservation: true,
        evidenceDoesNotAutomaticallyPromoteObservedState: true
      }
    }
  });
}));

productEngineeringRouter.post("/applications/:id/capabilities", asyncHandler(async (req, res) => {
  const input = assignCapabilitySchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const definition = await prisma.capabilityDefinition.findFirst({ where: { id: input.capabilityDefinitionId, workspaceId: req.auth!.workspaceId } });
  if (!definition) return sendApiError(res, 404, "capability_definition_not_found");
  const capability = await prisma.applicationCapability.upsert({
    where: { applicationId_capabilityDefinitionId: { applicationId: application.id, capabilityDefinitionId: definition.id } },
    create: { ...input, applicationId: application.id },
    update: input,
    include: capabilityInclude
  });
  await audit(req, "application_capability.assign", "ApplicationCapability", capability.id, { applicationId: application.id, capabilityDefinitionId: definition.id });
  res.status(201).json({ data: capability });
}));

productEngineeringRouter.patch("/application-capabilities/:id", asyncHandler(async (req, res) => {
  const input = updateApplicationCapabilitySchema.parse(req.body);
  const existing = await capabilityForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!existing) return sendApiError(res, 404, "application_capability_not_found");
  const capability = await prisma.applicationCapability.update({ where: { id: existing.id }, data: input, include: capabilityInclude });
  await audit(req, "application_capability.update", "ApplicationCapability", capability.id, { changed: Object.keys(input) });
  res.json({ data: capability });
}));

productEngineeringRouter.post("/applications/:id/features", asyncHandler(async (req, res) => {
  const input = assignFeatureSchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const [applicationCapability, featureDefinition] = await Promise.all([
    prisma.applicationCapability.findFirst({ where: { id: input.applicationCapabilityId, applicationId: application.id } }),
    prisma.featureDefinition.findFirst({
      where: { id: input.featureDefinitionId, capabilityDefinition: { workspaceId: req.auth!.workspaceId } }
    })
  ]);
  if (!applicationCapability || !featureDefinition) return sendApiError(res, 404, "application_feature_relation_not_found");
  if (applicationCapability.capabilityDefinitionId !== featureDefinition.capabilityDefinitionId) {
    return sendApiError(res, 409, "feature_definition_capability_mismatch");
  }
  const feature = await prisma.applicationFeature.upsert({
    where: { applicationId_featureDefinitionId: { applicationId: application.id, featureDefinitionId: featureDefinition.id } },
    create: { ...input, applicationId: application.id },
    update: input,
    include: { featureDefinition: true, evidence: true, interfaces: true }
  });
  await audit(req, "application_feature.assign", "ApplicationFeature", feature.id, {
    applicationId: application.id,
    applicationCapabilityId: applicationCapability.id,
    featureDefinitionId: featureDefinition.id
  });
  res.status(201).json({ data: feature });
}));

productEngineeringRouter.post("/applications/:id/repositories", asyncHandler(async (req, res) => {
  const input = createRepositorySchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const repository = await prisma.applicationRepository.upsert({
    where: { applicationId_url: { applicationId: application.id, url: input.url } },
    create: { ...input, applicationId: application.id },
    update: input
  });
  await audit(req, "application_repository.upsert", "ApplicationRepository", repository.id, {
    applicationId: application.id,
    url: repository.url
  });
  res.status(201).json({ data: repository });
}));

productEngineeringRouter.post("/application-capabilities/:id/dimensions", asyncHandler(async (req, res) => {
  const input = createDimensionSchema.parse(req.body);
  const capability = await capabilityForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!capability) return sendApiError(res, 404, "application_capability_not_found");
  const dimension = await prisma.applicationCapabilityDimension.upsert({
    where: { applicationCapabilityId_key: { applicationCapabilityId: capability.id, key: input.key } },
    create: { ...input, applicationCapabilityId: capability.id },
    update: input
  });
  await audit(req, "application_capability_dimension.upsert", "ApplicationCapabilityDimension", dimension.id, { capabilityId: capability.id });
  res.status(201).json({ data: dimension });
}));

productEngineeringRouter.post("/applications/:id/observations", asyncHandler(async (req, res) => {
  const input = createObservationSchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const target = input.applicationCapabilityId
    ? await prisma.applicationCapability.findFirst({ where: { id: input.applicationCapabilityId, applicationId: application.id } })
    : input.applicationFeatureId
      ? await prisma.applicationFeature.findFirst({ where: { id: input.applicationFeatureId, applicationId: application.id } })
      : await prisma.applicationCapabilityDimension.findFirst({ where: { id: input.applicationCapabilityDimensionId!, applicationCapability: { applicationId: application.id } } });
  if (!target) return sendApiError(res, 404, "observation_target_not_found");
  const actorContext = actor(req);
  const observation = await prisma.$transaction(async (tx) => {
    const created = await tx.capabilityObservation.create({ data: { ...input, applicationId: application.id, observedByType: actorContext.actorType, observedById: actorContext.actorId } });
    if (input.applicationCapabilityId) await tx.applicationCapability.update({ where: { id: input.applicationCapabilityId }, data: { observedState: input.observedState, observedSummary: input.summary } });
    if (input.applicationFeatureId) await tx.applicationFeature.update({ where: { id: input.applicationFeatureId }, data: { observedState: input.observedState } });
    if (input.applicationCapabilityDimensionId) await tx.applicationCapabilityDimension.update({ where: { id: input.applicationCapabilityDimensionId }, data: { observedState: input.observedState } });
    return created;
  });
  await audit(req, "capability_observation.record", "CapabilityObservation", observation.id, { observedState: observation.observedState, source: observation.source });
  res.status(201).json({ data: observation });
}));

productEngineeringRouter.post("/applications/:id/evidence", asyncHandler(async (req, res) => {
  const input = createEvidenceSchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  if (input.applicationCapabilityId && !await prisma.applicationCapability.findFirst({ where: { id: input.applicationCapabilityId, applicationId: application.id } })) return sendApiError(res, 404, "application_capability_not_found");
  if (input.applicationFeatureId && !await prisma.applicationFeature.findFirst({ where: { id: input.applicationFeatureId, applicationId: application.id } })) return sendApiError(res, 404, "application_feature_not_found");
  if (input.observationId && !await prisma.capabilityObservation.findFirst({ where: { id: input.observationId, applicationId: application.id } })) return sendApiError(res, 404, "observation_not_found");
  const evidence = await prisma.applicationEvidence.create({
    data: {
      ...input,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
      applicationId: application.id,
      workspaceId: req.auth!.workspaceId
    }
  });
  await audit(req, "application_evidence.record", "ApplicationEvidence", evidence.id, { type: evidence.type, source: evidence.source });
  res.status(201).json({ data: evidence });
}));

productEngineeringRouter.post("/evidence/:id/actions/verify", asyncHandler(async (req, res) => {
  const input = z.object({ status: z.nativeEnum(EvidenceVerificationStatus).default(EvidenceVerificationStatus.verified) }).parse(req.body ?? {});
  const existing = await prisma.applicationEvidence.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!existing) return sendApiError(res, 404, "evidence_not_found");
  const actorContext = actor(req);
  const evidence = await prisma.applicationEvidence.update({
    where: { id: existing.id },
    data: { verificationStatus: input.status, verifiedAt: new Date(), verifiedByType: actorContext.actorType, verifiedById: actorContext.actorId }
  });
  await audit(req, "application_evidence.verify", "ApplicationEvidence", evidence.id, { status: input.status });
  res.json({ data: evidence });
}));

productEngineeringRouter.post("/applications/:id/dependencies", asyncHandler(async (req, res) => {
  const input = createDependencySchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const count = await prisma.applicationCapability.count({ where: { applicationId: application.id, id: { in: [input.fromCapabilityId, input.toCapabilityId] } } });
  if (count !== 2) return sendApiError(res, 404, "dependency_capability_not_found");
  const dependency = await prisma.applicationCapabilityDependency.upsert({
    where: { fromCapabilityId_toCapabilityId: { fromCapabilityId: input.fromCapabilityId, toCapabilityId: input.toCapabilityId } },
    create: input,
    update: { required: input.required, notes: input.notes }
  });
  await audit(req, "application_capability_dependency.upsert", "ApplicationCapabilityDependency", dependency.id, input);
  res.status(201).json({ data: dependency });
}));

productEngineeringRouter.get("/catalog", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const [domains, dimensions, packs, blueprints, technologies] = await Promise.all([
    prisma.capabilityDomain.findMany({ where: { workspaceId }, include: { capabilities: { include: { domain: true, readinessDimension: true, features: true, procedures: { include: { procedure: { include: procedureInclude } } } } } }, orderBy: { position: "asc" } }),
    prisma.readinessDimensionDefinition.findMany({ where: { workspaceId }, orderBy: { position: "asc" } }),
    prisma.capabilityPack.findMany({ where: { workspaceId }, include: { items: { include: { capabilityDefinition: true } } }, orderBy: { name: "asc" } }),
    prisma.applicationBlueprint.findMany({ where: { workspaceId }, include: { capabilities: { include: { capabilityDefinition: true } } }, orderBy: { name: "asc" } }),
    prisma.technologyDefinition.findMany({ where: { workspaceId }, orderBy: { name: "asc" } })
  ]);
  res.json({ data: { domains, dimensions, packs, blueprints, technologies } });
}));

productEngineeringRouter.post("/capability-domains", asyncHandler(async (req, res) => {
  const input = createDomainSchema.parse(req.body);
  const domain = await prisma.capabilityDomain.create({ data: { ...input, workspaceId: req.auth!.workspaceId } });
  await audit(req, "capability_domain.create", "CapabilityDomain", domain.id, { key: domain.key });
  res.status(201).json({ data: domain });
}));

productEngineeringRouter.post("/readiness-dimensions", asyncHandler(async (req, res) => {
  const input = createReadinessDimensionSchema.parse(req.body);
  const dimension = await prisma.readinessDimensionDefinition.create({ data: { ...input, workspaceId: req.auth!.workspaceId } });
  await audit(req, "readiness_dimension.create", "ReadinessDimensionDefinition", dimension.id, { key: dimension.key });
  res.status(201).json({ data: dimension });
}));

productEngineeringRouter.post("/capability-definitions", asyncHandler(async (req, res) => {
  const input = createCapabilityDefinitionSchema.parse(req.body);
  const domain = await prisma.capabilityDomain.findFirst({ where: { id: input.domainId, workspaceId: req.auth!.workspaceId } });
  if (!domain) return sendApiError(res, 404, "capability_domain_not_found");
  if (input.readinessDimensionId && !await prisma.readinessDimensionDefinition.findFirst({ where: { id: input.readinessDimensionId, workspaceId: req.auth!.workspaceId } })) return sendApiError(res, 404, "readiness_dimension_not_found");
  const definition = await prisma.capabilityDefinition.create({ data: { ...input, workspaceId: req.auth!.workspaceId }, include: { domain: true, readinessDimension: true } });
  await audit(req, "capability_definition.create", "CapabilityDefinition", definition.id, { key: definition.key });
  res.status(201).json({ data: definition });
}));

productEngineeringRouter.patch("/capability-definitions/:id", asyncHandler(async (req, res) => {
  const input = updateCapabilityDefinitionSchema.parse(req.body);
  const existing = await prisma.capabilityDefinition.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!existing) return sendApiError(res, 404, "capability_definition_not_found");
  if (input.domainId && !await prisma.capabilityDomain.findFirst({ where: { id: input.domainId, workspaceId: req.auth!.workspaceId } })) return sendApiError(res, 404, "capability_domain_not_found");
  if (input.readinessDimensionId && !await prisma.readinessDimensionDefinition.findFirst({ where: { id: input.readinessDimensionId, workspaceId: req.auth!.workspaceId } })) return sendApiError(res, 404, "readiness_dimension_not_found");
  const definition = await prisma.capabilityDefinition.update({ where: { id: existing.id }, data: input, include: { domain: true, readinessDimension: true } });
  await audit(req, "capability_definition.update", "CapabilityDefinition", definition.id, { changed: Object.keys(input) });
  res.json({ data: definition });
}));

productEngineeringRouter.post("/capability-definitions/:id/features", asyncHandler(async (req, res) => {
  const input = createFeatureDefinitionSchema.parse(req.body);
  const definition = await prisma.capabilityDefinition.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!definition) return sendApiError(res, 404, "capability_definition_not_found");
  const feature = await prisma.featureDefinition.create({ data: { ...input, capabilityDefinitionId: definition.id } });
  await audit(req, "feature_definition.create", "FeatureDefinition", feature.id, { capabilityDefinitionId: definition.id });
  res.status(201).json({ data: feature });
}));

productEngineeringRouter.post("/capability-definitions/:id/procedures", asyncHandler(async (req, res) => {
  const input = z.object({
    procedureId: idSchema,
    relationType: z.string().trim().min(1).optional(),
    required: z.boolean().optional()
  }).parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const [definition, procedure] = await Promise.all([
    prisma.capabilityDefinition.findFirst({ where: { id: String(req.params.id), workspaceId } }),
    prisma.procedure.findFirst({ where: { id: input.procedureId, workspaceId } })
  ]);
  if (!definition) return sendApiError(res, 404, "capability_definition_not_found");
  if (!procedure) return sendApiError(res, 404, "procedure_not_found");
  const link = await prisma.capabilityProcedure.upsert({
    where: { capabilityDefinitionId_procedureId: { capabilityDefinitionId: definition.id, procedureId: procedure.id } },
    create: { capabilityDefinitionId: definition.id, procedureId: procedure.id, relationType: input.relationType, required: input.required },
    update: { relationType: input.relationType, required: input.required },
    include: { procedure: { include: procedureInclude } }
  });
  await audit(req, "capability_procedure.link", "CapabilityProcedure", definition.id, { procedureId: procedure.id, relationType: link.relationType });
  await createEvent({ type: "capability_procedure_linked", workspaceId, ...actor(req), resourceType: "CapabilityDefinition", resourceId: definition.id, payload: { procedureId: procedure.id } });
  res.status(201).json({ data: link });
}));

productEngineeringRouter.delete("/capability-definitions/:id/procedures/:procedureId", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const definition = await prisma.capabilityDefinition.findFirst({ where: { id: String(req.params.id), workspaceId } });
  if (!definition) return sendApiError(res, 404, "capability_definition_not_found");
  const result = await prisma.capabilityProcedure.deleteMany({
    where: { capabilityDefinitionId: definition.id, procedureId: String(req.params.procedureId), procedure: { workspaceId } }
  });
  if (!result.count) return sendApiError(res, 404, "capability_procedure_not_found");
  await audit(req, "capability_procedure.unlink", "CapabilityProcedure", definition.id, { procedureId: String(req.params.procedureId) });
  await createEvent({ type: "capability_procedure_unlinked", workspaceId, ...actor(req), resourceType: "CapabilityDefinition", resourceId: definition.id, payload: { procedureId: String(req.params.procedureId) } });
  res.status(204).send();
}));

productEngineeringRouter.post("/capability-packs", asyncHandler(async (req, res) => {
  const input = createPackSchema.parse(req.body);
  const ids = input.items.map((item) => item.capabilityDefinitionId);
  if (ids.length && await prisma.capabilityDefinition.count({ where: { workspaceId: req.auth!.workspaceId, id: { in: ids } } }) !== new Set(ids).size) return sendApiError(res, 404, "capability_definition_not_found");
  const pack = await prisma.capabilityPack.create({
    data: {
      workspaceId: req.auth!.workspaceId,
      key: input.key,
      name: input.name,
      description: input.description,
      items: { create: input.items.map((item) => ({ ...item, applicability: item.applicability ?? CapabilityApplicability.required, priority: item.priority ?? 50 })) }
    },
    include: { items: { include: { capabilityDefinition: true } } }
  });
  await audit(req, "capability_pack.create", "CapabilityPack", pack.id, { key: pack.key });
  res.status(201).json({ data: pack });
}));

productEngineeringRouter.post("/applications/:id/actions/apply-pack", asyncHandler(async (req, res) => {
  const input = z.object({ packId: idSchema }).parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const pack = await prisma.capabilityPack.findFirst({ where: { id: input.packId, workspaceId: req.auth!.workspaceId }, include: { items: true } });
  if (!pack) return sendApiError(res, 404, "capability_pack_not_found");
  await prisma.$transaction(pack.items.map((item) => prisma.applicationCapability.upsert({
    where: { applicationId_capabilityDefinitionId: { applicationId: application.id, capabilityDefinitionId: item.capabilityDefinitionId } },
    create: { applicationId: application.id, capabilityDefinitionId: item.capabilityDefinitionId, applicability: item.applicability, priority: item.priority },
    update: { applicability: item.applicability, priority: item.priority }
  })));
  await audit(req, "capability_pack.apply", "Application", application.id, { packId: pack.id, itemCount: pack.items.length });
  res.json({ data: { applicationId: application.id, packId: pack.id, applied: pack.items.length } });
}));

productEngineeringRouter.post("/application-blueprints", asyncHandler(async (req, res) => {
  const input = createBlueprintSchema.parse(req.body);
  const ids = input.capabilities.map((item) => item.capabilityDefinitionId);
  if (ids.length && await prisma.capabilityDefinition.count({ where: { workspaceId: req.auth!.workspaceId, id: { in: ids } } }) !== new Set(ids).size) return sendApiError(res, 404, "capability_definition_not_found");
  const blueprint = await prisma.applicationBlueprint.create({
    data: {
      workspaceId: req.auth!.workspaceId,
      key: input.key,
      name: input.name,
      description: input.description,
      suggestions: input.suggestions as Prisma.InputJsonValue | undefined,
      capabilities: { create: input.capabilities.map((item) => ({ ...item, applicability: item.applicability ?? CapabilityApplicability.required, priority: item.priority ?? 50 })) }
    },
    include: { capabilities: { include: { capabilityDefinition: true } } }
  });
  await audit(req, "application_blueprint.create", "ApplicationBlueprint", blueprint.id, { key: blueprint.key });
  res.status(201).json({ data: blueprint });
}));

productEngineeringRouter.post("/technologies", asyncHandler(async (req, res) => {
  const input = createTechnologySchema.parse(req.body);
  const technology = await prisma.technologyDefinition.create({ data: { ...input, workspaceId: req.auth!.workspaceId } });
  await audit(req, "technology_definition.create", "TechnologyDefinition", technology.id, { key: technology.key });
  res.status(201).json({ data: technology });
}));

productEngineeringRouter.post("/applications/:id/technologies", asyncHandler(async (req, res) => {
  const input = attachTechnologySchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  if (!await prisma.technologyDefinition.findFirst({ where: { id: input.technologyDefinitionId, workspaceId: req.auth!.workspaceId } })) return sendApiError(res, 404, "technology_not_found");
  const technology = await prisma.applicationTechnology.create({ data: { ...input, applicationId: application.id }, include: { technologyDefinition: true } });
  await audit(req, "application_technology.attach", "ApplicationTechnology", technology.id, { applicationId: application.id });
  res.status(201).json({ data: technology });
}));

productEngineeringRouter.post("/applications/:id/architecture", asyncHandler(async (req, res) => {
  const input = createArchitectureComponentSchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  if (input.technologyDefinitionId && !await prisma.technologyDefinition.findFirst({ where: { id: input.technologyDefinitionId, workspaceId: req.auth!.workspaceId } })) return sendApiError(res, 404, "technology_not_found");
  const component = await prisma.applicationArchitectureComponent.create({
    data: { ...input, metadata: input.metadata as Prisma.InputJsonValue | undefined, applicationId: application.id },
    include: { technologyDefinition: true }
  });
  await audit(req, "application_architecture_component.create", "ApplicationArchitectureComponent", component.id, { applicationId: application.id, type: component.type });
  res.status(201).json({ data: component });
}));

productEngineeringRouter.post("/applications/:id/interfaces", asyncHandler(async (req, res) => {
  const input = createInterfaceSchema.parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  if (input.applicationCapabilityId && !await prisma.applicationCapability.findFirst({ where: { id: input.applicationCapabilityId, applicationId: application.id } })) return sendApiError(res, 404, "application_capability_not_found");
  if (input.applicationFeatureId && !await prisma.applicationFeature.findFirst({ where: { id: input.applicationFeatureId, applicationId: application.id } })) return sendApiError(res, 404, "application_feature_not_found");
  const item = await prisma.applicationInterface.create({ data: { ...input, applicationId: application.id } });
  await audit(req, "application_interface.create", "ApplicationInterface", item.id, { applicationId: application.id, type: item.type });
  res.status(201).json({ data: item });
}));

productEngineeringRouter.post("/applications/:id/projects", asyncHandler(async (req, res) => {
  const input = z.object({ projectId: idSchema, relationType: z.string().trim().min(1).optional() }).parse(req.body);
  const application = await applicationForWorkspace(req.auth!.workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const project = await prisma.project.findFirst({ where: { id: input.projectId, workspaceId: req.auth!.workspaceId } });
  if (!project) return sendApiError(res, 404, "project_not_found");
  const link = await prisma.applicationProject.upsert({
    where: { applicationId_projectId: { applicationId: application.id, projectId: project.id } },
    create: { applicationId: application.id, projectId: project.id, relationType: input.relationType },
    update: { relationType: input.relationType }
  });
  await audit(req, "application_project.link", "ApplicationProject", application.id, { projectId: project.id, relationType: link.relationType });
  res.status(201).json({ data: link });
}));

productEngineeringRouter.delete("/applications/:id/projects/:projectId", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const application = await applicationForWorkspace(workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const result = await prisma.applicationProject.deleteMany({
    where: { applicationId: application.id, projectId: String(req.params.projectId), project: { workspaceId } }
  });
  if (!result.count) return sendApiError(res, 404, "application_project_not_found");
  await audit(req, "application_project.unlink", "ApplicationProject", application.id, { projectId: String(req.params.projectId) });
  await createEvent({ type: "application_project_unlinked", workspaceId, ...actor(req), resourceType: "Application", resourceId: application.id, payload: { projectId: String(req.params.projectId) } });
  res.status(204).send();
}));

productEngineeringRouter.post("/applications/:id/procedures", asyncHandler(async (req, res) => {
  const input = z.object({
    procedureId: idSchema,
    relationType: z.string().trim().min(1).optional(),
    required: z.boolean().optional()
  }).parse(req.body);
  const workspaceId = req.auth!.workspaceId;
  const [application, procedure] = await Promise.all([
    applicationForWorkspace(workspaceId, String(req.params.id)),
    prisma.procedure.findFirst({ where: { id: input.procedureId, workspaceId } })
  ]);
  if (!application) return sendApiError(res, 404, "application_not_found");
  if (!procedure) return sendApiError(res, 404, "procedure_not_found");
  const link = await prisma.applicationProcedure.upsert({
    where: { applicationId_procedureId: { applicationId: application.id, procedureId: procedure.id } },
    create: { applicationId: application.id, procedureId: procedure.id, relationType: input.relationType, required: input.required },
    update: { relationType: input.relationType, required: input.required },
    include: { procedure: { include: procedureInclude } }
  });
  await audit(req, "application_procedure.link", "ApplicationProcedure", application.id, { procedureId: procedure.id, relationType: link.relationType });
  await createEvent({ type: "application_procedure_linked", workspaceId, ...actor(req), resourceType: "Application", resourceId: application.id, payload: { procedureId: procedure.id } });
  res.status(201).json({ data: link });
}));

productEngineeringRouter.delete("/applications/:id/procedures/:procedureId", asyncHandler(async (req, res) => {
  const workspaceId = req.auth!.workspaceId;
  const application = await applicationForWorkspace(workspaceId, String(req.params.id));
  if (!application) return sendApiError(res, 404, "application_not_found");
  const result = await prisma.applicationProcedure.deleteMany({
    where: { applicationId: application.id, procedureId: String(req.params.procedureId), procedure: { workspaceId } }
  });
  if (!result.count) return sendApiError(res, 404, "application_procedure_not_found");
  await audit(req, "application_procedure.unlink", "ApplicationProcedure", application.id, { procedureId: String(req.params.procedureId) });
  await createEvent({ type: "application_procedure_unlinked", workspaceId, ...actor(req), resourceType: "Application", resourceId: application.id, payload: { procedureId: String(req.params.procedureId) } });
  res.status(204).send();
}));

productEngineeringRouter.get("/offerings", asyncHandler(async (req, res) => {
  const offerings = await prisma.productOffering.findMany({ where: { workspaceId: req.auth!.workspaceId }, include: { application: true }, orderBy: { updatedAt: "desc" } });
  res.json({ data: offerings });
}));

productEngineeringRouter.post("/offerings", asyncHandler(async (req, res) => {
  const input = createOfferingSchema.parse(req.body);
  if (input.applicationId && !await applicationForWorkspace(req.auth!.workspaceId, input.applicationId)) return sendApiError(res, 404, "application_not_found");
  const offeringData: Prisma.ProductOfferingUncheckedCreateInput = {
    ...input,
    pricing: input.pricing as Prisma.InputJsonValue | undefined,
    workspaceId: req.auth!.workspaceId
  };
  const offering = await prisma.productOffering.create({ data: offeringData, include: { application: true } });
  await audit(req, "product_offering.create", "ProductOffering", offering.id, { key: offering.key, applicationId: offering.applicationId });
  res.status(201).json({ data: offering });
}));

productEngineeringRouter.patch("/offerings/:id", asyncHandler(async (req, res) => {
  const input = updateOfferingSchema.parse(req.body);
  const existing = await prisma.productOffering.findFirst({ where: { id: String(req.params.id), workspaceId: req.auth!.workspaceId } });
  if (!existing) return sendApiError(res, 404, "product_offering_not_found");
  if (input.applicationId && !await applicationForWorkspace(req.auth!.workspaceId, input.applicationId)) return sendApiError(res, 404, "application_not_found");
  const offeringData: Prisma.ProductOfferingUncheckedUpdateInput = {
    ...input,
    pricing: input.pricing as Prisma.InputJsonValue | undefined
  };
  const offering = await prisma.productOffering.update({ where: { id: existing.id }, data: offeringData, include: { application: true } });
  await audit(req, "product_offering.update", "ProductOffering", offering.id, { changed: Object.keys(input) });
  res.json({ data: offering });
}));
