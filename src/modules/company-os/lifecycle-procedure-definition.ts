import type { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

type DefinitionDb = PrismaClient | Prisma.TransactionClient;

export const lifecycleProcedureId = "PROC-SH-APPLICATION-LIFECYCLE" as const;
export const lifecycleProcedureVersion = "1.0" as const;
export const lifecycleProcedureTitle = "Autonomous Application And Business Lifecycle" as const;
export const lifecycleProcessName = lifecycleProcedureTitle;
export const lifecycleRoostSource = {
  path: "docs/governance/autonomous-application-business-lifecycle.md",
  documentVersion: lifecycleProcedureVersion,
  sourceSha: "7c06b448235ed8c0cad9cd872d64d6c66e43888a"
} as const;
export const lifecycleOperatingContractSource = {
  repository: "Roost",
  path: "docs/softwarehouse/19-autonomous-application-business-lifecycle.md",
  documentVersion: lifecycleProcedureVersion,
  commitSha: "b0e02c28de8bb3ebe0abf6239a5771b389a779f9"
} as const;

export const canonicalLifecycleStages = [
  {
    stageKey: "direction_portfolio_fit",
    title: "Direction and portfolio fit",
    accountableSourceOwner: "Board / 00 AIA / 11 CINO",
    requiredOutput: "Accepted strategic fit, accountable owner, active or parked state, and opportunity-cost record.",
    exitGate: "Direction and portfolio authority are explicit and supported by inspectable evidence."
  },
  {
    stageKey: "opportunity_problem_validation",
    title: "Opportunity and problem validation",
    accountableSourceOwner: "Product / Innovation",
    requiredOutput: "Target user, job, problem evidence, assumptions, and falsification result.",
    exitGate: "The intended user problem and outcome are credible enough to frame a product response."
  },
  {
    stageKey: "business_framing",
    title: "Business framing",
    accountableSourceOwner: "Product / Finance / Legal",
    requiredOutput: "Value proposition, use and pricing boundary, costs, constraints, risks, and success measures.",
    exitGate: "The accepted promise, value, cost, and risk boundary is decision-ready."
  },
  {
    stageKey: "product_discovery_requirements",
    title: "Product discovery and requirements",
    accountableSourceOwner: "App PM / Product",
    requiredOutput: "Versioned journeys, requirements, permissions, states, acceptance criteria, and exclusions.",
    exitGate: "The smallest useful end-to-end product slice is testable and unambiguous."
  },
  {
    stageKey: "ux_accessibility_design",
    title: "UX and accessibility design",
    accountableSourceOwner: "UX / UI / Product",
    requiredOutput: "Approved interaction model, responsive states, content, accessibility contract, and visual source.",
    exitGate: "The intended user can understand and complete the journey across supported surfaces."
  },
  {
    stageKey: "architecture_data_threat_design",
    title: "Architecture, data, and threat design",
    accountableSourceOwner: "CTO / TSA / Security",
    requiredOutput: "Architecture, data ownership, tenancy, integration, threat, migration, and recovery contract.",
    exitGate: "The slice can be built and operated without an unresolved architecture or safety ambiguity."
  },
  {
    stageKey: "delivery_release_planning",
    title: "Delivery and release planning",
    accountableSourceOwner: "Delivery / Operations / PM",
    requiredOutput: "Bounded plan, owners, dependencies, environments, proof gates, rollback, and release sequence.",
    exitGate: "One accountable vertical slice is ready to execute with a known validation and recovery path."
  },
  {
    stageKey: "implementation",
    title: "Implementation",
    accountableSourceOwner: "Layer specialist",
    requiredOutput: "Integrated source, configuration, data, error handling, and tests for the approved slice.",
    exitGate: "Implementation is complete without placeholders, bypasses, or unapproved authority expansion."
  },
  {
    stageKey: "automated_verification",
    title: "Automated verification",
    accountableSourceOwner: "Test Automation / specialist",
    requiredOutput: "Repeatable unit, integration, contract, regression, and risk-focused test evidence.",
    exitGate: "Required automated checks pass against the exact candidate."
  },
  {
    stageKey: "user_flow_qa",
    title: "User-flow QA",
    accountableSourceOwner: "QA / Product / UX",
    requiredOutput: "Real journey, responsive, input-mode, accessibility, recovery, and evidence screenshots.",
    exitGate: "The declared user journey works on supported surfaces and failure states are truthful."
  },
  {
    stageKey: "independent_review",
    title: "Independent review",
    accountableSourceOwner: "Code Review / CTO / Security",
    requiredOutput: "Independent code, architecture, security, privacy, and regression findings with disposition.",
    exitGate: "No unresolved critical finding remains and accepted risk is explicit."
  },
  {
    stageKey: "documentation_operational_readiness",
    title: "Documentation and operational readiness",
    accountableSourceOwner: "Docs / DRE / support owner",
    requiredOutput: "Synchronized product, architecture, operations, support, evidence, and recovery documentation.",
    exitGate: "Another accountable operator can reproduce, operate, support, and recover the candidate."
  },
  {
    stageKey: "release_decision",
    title: "Release decision",
    accountableSourceOwner: "PM / QVE / DRE / Security",
    requiredOutput: "Immutable candidate, gate verdicts, residual risks, approvers, and release or hold decision.",
    exitGate: "The exact candidate has an evidence-backed GO or explicit NO-GO decision."
  },
  {
    stageKey: "source_control_closure",
    title: "Source-control closure",
    accountableSourceOwner: "Delivery / author",
    requiredOutput: "Reviewed commit, clean worktree, target branch, redaction proof, and push/deploy impact.",
    exitGate: "The release source is coherent, reversible, attributable, and ready for its approved publication path."
  },
  {
    stageKey: "deployment_migration",
    title: "Deployment and migration",
    accountableSourceOwner: "DRE / Security",
    requiredOutput: "Observed deployment and migration result, exact SHA, health, logs, capacity, and rollback readiness.",
    exitGate: "The intended environment runs the exact candidate without an unresolved deployment or data risk."
  },
  {
    stageKey: "production_acceptance",
    title: "Production acceptance",
    accountableSourceOwner: "QVE / DRE / App PM",
    requiredOutput: "Production readiness, browser journey, auth, logs, restart, and data acceptance evidence.",
    exitGate: "The declared production journey works on the deployed SHA and the acceptance owner signs off."
  },
  {
    stageKey: "operate_support_observe",
    title: "Operate, support, and observe",
    accountableSourceOwner: "Operations / Product / support owner",
    requiredOutput: "SLI/SLO, alerts, support, incident, backup, cost, capacity, and outcome observations.",
    exitGate: "Health, support, cost, and intended user or business outcomes have accountable observation paths."
  },
  {
    stageKey: "retrospective_improvement",
    title: "Retrospective and improvement",
    accountableSourceOwner: "COO / accountable stage owner",
    requiredOutput: "Retrospective, causal findings, prevention, regression/eval updates, and next lifecycle decision.",
    exitGate: "Learning is recorded and the offering is explicitly expanded, maintained, reframed, paused, retired, or returned to discovery."
  }
] as const;

export const lifecycleStageKeys = canonicalLifecycleStages.map((stage) => stage.stageKey) as [
  typeof canonicalLifecycleStages[number]["stageKey"],
  ...Array<typeof canonicalLifecycleStages[number]["stageKey"]>
];
export const lifecycleStageKeySchema = z.enum(lifecycleStageKeys);
export type LifecycleStageKey = z.infer<typeof lifecycleStageKeySchema>;

export const lifecyclePurpose = "Present how an offering moves from direction and a validated problem through product delivery, release, operation, measured outcomes, and improvement.";
export const lifecycleScope = "Owner-facing application and business lifecycle knowledge projection; the supervised agent runtime reports live execution, blocker, run, and completion evidence while Roost retains approval and governance authority.";
export const lifecycleTrigger = "A new offering, material product change, release candidate, production recovery, or evidence-backed improvement enters the governed lifecycle.";
export const lifecycleEntryCriteria = [
  "The offering or change has a stable identity and accountable owner.",
  "The current lifecycle stage, source authority, and intended outcome are explicit.",
  "Protected actions remain behind their independent approval and evidence gates."
];
export const lifecyclePrimaryOutput = "A versioned, evidence-backed offering outcome with explicit readiness, authority, deployment, operation, and learning state.";
export const lifecycleExitCriteria = [
  "Every applicable lifecycle gate is verified or justified as not applicable.",
  "Source, deployed state, evidence, conflicts, risks, and supersession are inspectable.",
  "The accountable owner records the next lifecycle decision."
];

export const lifecycleStepExpectedOutputSchema = z.object({
  stageKey: lifecycleStageKeySchema,
  requiredOutput: z.string().min(1).max(500)
}).strict();

export const lifecycleStepValidationRuleSchema = z.object({
  stageKey: lifecycleStageKeySchema,
  exitGate: z.string().min(1).max(500),
  accountableSourceOwners: z.array(z.string().min(1).max(120)).min(1).max(10)
}).strict();

function sourceOwners(value: string) {
  return value.split("/").map((owner) => owner.trim()).filter(Boolean);
}

export async function ensureLifecycleProcedureForWorkspace(db: DefinitionDb, workspaceId: string) {
  const ownerRole = await db.companyRole.upsert({
    where: { workspaceId_name: { workspaceId, name: "Human Owner" } },
    update: {},
    create: {
      workspaceId,
      name: "Human Owner",
      type: "human",
      responsibilities: ["Final approval", "risk escalation", "business priority"],
      permissions: ["approval:decide", "workspace:admin"],
      allowedTools: ["companycore"]
    },
    select: { id: true, name: true }
  });

  const process = await db.process.upsert({
    where: { workspaceId_name_version: { workspaceId, name: lifecycleProcessName, version: 1 } },
    update: {
      description: lifecyclePurpose,
      ownerRoleId: ownerRole.id,
      department: "Operations / Product",
      category: "application_lifecycle",
      status: "active",
      maturityLevel: "defined"
    },
    create: {
      workspaceId,
      name: lifecycleProcessName,
      version: 1,
      description: lifecyclePurpose,
      ownerRoleId: ownerRole.id,
      department: "Operations / Product",
      category: "application_lifecycle",
      status: "active",
      maturityLevel: "defined"
    },
    select: { id: true, familyId: true }
  });

  const qualityStandard = await db.standard.upsert({
    where: {
      workspaceId_name_version: {
        workspaceId,
        name: "Company OS execution standard",
        version: 1
      }
    },
    update: {
      category: "operations",
      description: "Default quality standard for processes, pipelines, and procedures.",
      validationMethod: "Checklist, event evidence, and owner approval for high-risk actions.",
      ownerRoleId: ownerRole.id,
      status: "active"
    },
    create: {
      workspaceId,
      name: "Company OS execution standard",
      version: 1,
      category: "operations",
      description: "Default quality standard for processes, pipelines, and procedures.",
      validationMethod: "Checklist, event evidence, and owner approval for high-risk actions.",
      ownerRoleId: ownerRole.id,
      status: "active"
    },
    select: { id: true }
  });

  const procedure = await db.procedure.upsert({
    where: { workspaceId_name_version: { workspaceId, name: lifecycleProcedureId, version: 1 } },
    update: {
      processId: process.id,
      purpose: lifecyclePurpose,
      scope: lifecycleScope,
      ownerRoleId: ownerRole.id,
      status: "active",
      requiredTools: [],
      requiredPermissions: [],
      expectedResult: lifecyclePrimaryOutput,
      qualityStandardId: qualityStandard.id
    },
    create: {
      workspaceId,
      processId: process.id,
      name: lifecycleProcedureId,
      purpose: lifecyclePurpose,
      scope: lifecycleScope,
      ownerRoleId: ownerRole.id,
      version: 1,
      status: "active",
      requiredTools: [],
      requiredPermissions: [],
      expectedResult: lifecyclePrimaryOutput,
      qualityStandardId: qualityStandard.id
    },
    select: { id: true, familyId: true }
  });

  const steps = canonicalLifecycleStages.map((stage, index) => {
    return {
      procedureId: procedure.id,
      stepOrder: index + 1,
      instruction: `Complete ${stage.title}, preserve source authority, record evidence, and stop on an unresolved gate.`,
      stepType: "manual" as const,
      requiredToolAdapterId: null,
      expectedInput: { stageKey: stage.stageKey },
      expectedOutput: { stageKey: stage.stageKey, requiredOutput: stage.requiredOutput },
      validationRule: {
        stageKey: stage.stageKey,
        exitGate: stage.exitGate,
        accountableSourceOwners: sourceOwners(stage.accountableSourceOwner)
      },
      rollbackInstruction: "Return to the previous accountable stage, preserve failure evidence, and record the recovery owner and next decision."
    };
  });

  // These rows are a published definition, not mutable runtime records. Replacing
  // the complete child set keeps the definition exact and avoids eighteen
  // sequential upserts inside workspace bootstrap transactions.
  await db.procedureStep.deleteMany({ where: { procedureId: procedure.id } });
  await db.procedureStep.createMany({ data: steps });

  return { procedureId: procedure.id, familyId: procedure.familyId, processId: process.id, ownerRole };
}
