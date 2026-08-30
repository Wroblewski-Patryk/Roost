import { PrismaClient } from "@prisma/client";
import { createHmac, randomBytes, scrypt as scryptCallback } from "crypto";
import { promisify } from "util";
import { ensureLifecycleProcedureForWorkspace } from "../src/modules/company-os/lifecycle-procedure-definition";

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);
const keyLength = 64;

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scrypt(password, salt, keyLength)) as Buffer;
  return `scrypt:${salt}:${derivedKey.toString("hex")}`;
}

function hashApiKey(apiKey: string) {
  const secret =
    process.env.API_KEY_HASH_SECRET ??
    process.env.AUTH_TOKEN_SECRET ??
    "companycore-api-key-hash-secret";

  return createHmac("sha256", secret).update(apiKey).digest("hex");
}

function apiKeyPrefix(apiKey: string) {
  return apiKey.slice(0, 10);
}

const operatingAreas = [
  { key: "strategy-governance", name: "Strategy and governance", position: 1 },
  { key: "projects-delivery", name: "Projects and delivery", position: 2 },
  { key: "tasks-workflow", name: "Tasks and workflow", position: 3 },
  { key: "sales-crm", name: "Sales and CRM", position: 4 },
  { key: "marketing-growth", name: "Marketing and growth", position: 5 },
  { key: "finance-billing", name: "Finance and billing", position: 6 },
  { key: "people-roles", name: "People and roles", position: 7 },
  { key: "operations-administration", name: "Operations and administration", position: 8 },
  { key: "knowledge-decisions", name: "Knowledge and decisions", position: 9 },
  { key: "assets-storage", name: "Assets and storage", position: 10 },
  { key: "automations-integrations", name: "Automations and integrations", position: 11 },
  { key: "ai-agents-observability", name: "AI agents and observability", position: 12 }
] as const;

const operatingTables = [
  ["projects-delivery", "projects", "projects", "Projects"],
  ["strategy-governance", "goals", "goals", "Goals"],
  ["strategy-governance", "targets", "targets", "Targets"],
  ["tasks-workflow", "task_lists", "task-lists", "Task lists"],
  ["tasks-workflow", "tasks", "tasks", "Tasks"],
  ["sales-crm", "clients", "clients", "Clients"],
  ["sales-crm", "pipeline_stages", "pipeline-stages", "Pipeline stages"],
  ["sales-crm", "deals", "deals", "Deals"],
  ["sales-crm", "interactions", "interactions", "Interactions"],
  ["knowledge-decisions", "notes", "notes", "Notes"],
  ["knowledge-decisions", "decisions", "decisions", "Decisions"],
  ["ai-agents-observability", "agents", "agents", "Agents"],
  ["ai-agents-observability", "agent_logs", "agent-logs", "Agent logs"],
  ["ai-agents-observability", "events", "events", "Events"],
  ["strategy-governance", "processes", "processes", "Processes"],
  ["tasks-workflow", "pipelines", "pipelines", "Pipelines"],
  ["tasks-workflow", "pipeline_runs", "pipeline-runs", "Pipeline runs"],
  ["tasks-workflow", "stage_runs", "stage-runs", "Stage runs"],
  ["tasks-workflow", "checklist_templates", "checklist-templates", "Checklist templates"],
  ["tasks-workflow", "checklist_items", "checklist-items", "Checklist items"],
  ["tasks-workflow", "acceptance_criteria", "acceptance-criteria", "Acceptance criteria"],
  ["strategy-governance", "policies", "policies", "Policies"],
  ["strategy-governance", "metrics", "metrics", "Metrics"],
  ["strategy-governance", "risks", "risks", "Risks"],
  ["strategy-governance", "controls", "controls", "Controls"],
  ["operations-administration", "procedures", "procedures", "Procedures"],
  ["operations-administration", "procedure_steps", "procedure-steps", "Procedure steps"],
  ["operations-administration", "approvals", "approvals", "Approvals"],
  ["operations-administration", "dependencies", "dependencies", "Dependencies"],
  ["operations-administration", "business_functions", "business-functions", "Business functions"],
  ["people-roles", "company_roles", "company-roles", "Company roles"],
  ["people-roles", "workforce_entities", "workforce", "Workforce entities"],
  ["sales-crm", "stakeholders", "stakeholders", "Stakeholders"],
  ["assets-storage", "resources", "resources", "Resources"],
  ["assets-storage", "artifacts", "artifacts", "Artifacts"],
  ["automations-integrations", "tool_adapters", "tool-adapters", "Tool adapters"],
  ["automations-integrations", "integration_capabilities", "integration-capabilities", "Integration capabilities"],
  ["automations-integrations", "automation_rules", "automation-rules", "Automation rules"],
  ["automations-integrations", "triggers", "triggers", "Triggers"],
  ["ai-agents-observability", "audit_logs", "audit-logs", "Audit logs"],
  ["knowledge-decisions", "knowledge_items", "knowledge-items", "Knowledge items"],
  ["knowledge-decisions", "decision_logs", "decision-logs", "Decision logs"],
  ["knowledge-decisions", "standards", "standards", "Standards"]
] as const;

async function ensureSeedOperatingModel(workspaceId: string) {
  const areaByKey = new Map<string, { id: string }>();

  for (const area of operatingAreas) {
    const record = await prisma.operatingArea.upsert({
      where: {
        workspaceId_key: {
          workspaceId,
          key: area.key
        }
      },
      update: {
        name: area.name,
        position: area.position
      },
      create: {
        workspaceId,
        key: area.key,
        name: area.name,
        position: area.position
      },
      select: { id: true }
    });
    areaByKey.set(area.key, record);
  }

  for (const [areaKey, tableName, apiSlug, name] of operatingTables) {
    const area = areaByKey.get(areaKey)!;
    await prisma.operatingTable.upsert({
      where: {
        workspaceId_apiSlug: {
          workspaceId,
          apiSlug
        }
      },
      update: {
        areaId: area.id,
        tableName,
        name,
        source: "companycore"
      },
      create: {
        workspaceId,
        areaId: area.id,
        tableName,
        apiSlug,
        name,
        source: "companycore"
      }
    });
  }
}

const companyRoleSeeds = [
  {
    name: "Human Owner",
    type: "human",
    responsibilities: ["Final approval", "risk escalation", "business priority"],
    permissions: ["approval:decide", "workspace:admin"],
    allowedTools: ["companycore"]
  },
  {
    name: "CEO Agent",
    type: "agent",
    responsibilities: ["company prioritization", "cross-process monitoring"],
    permissions: ["process:read", "pipeline:read", "decision:propose"],
    allowedTools: ["companycore", "clickup", "google_drive"]
  },
  {
    name: "CTO Agent",
    type: "agent",
    responsibilities: ["architecture review", "technical risk control"],
    permissions: ["process:read", "pipeline:write", "procedure:write"],
    allowedTools: ["companycore", "github", "coolify"]
  },
  {
    name: "Project Manager Agent",
    type: "agent",
    responsibilities: ["task planning", "pipeline coordination", "status reporting"],
    permissions: ["task:write", "pipeline:read", "approval:request"],
    allowedTools: ["companycore", "clickup", "google_drive"]
  },
  {
    name: "Developer Agent",
    type: "agent",
    responsibilities: ["implementation", "test execution", "technical reporting"],
    permissions: ["task:read", "artifact:create", "log:write"],
    allowedTools: ["companycore", "github", "coolify"]
  },
  {
    name: "QA Agent",
    type: "agent",
    responsibilities: ["validation", "regression checks", "quality evidence"],
    permissions: ["task:read", "standard:read", "log:write"],
    allowedTools: ["companycore", "clickup", "github"]
  },
  {
    name: "Documentation Agent",
    type: "agent",
    responsibilities: ["documentation updates", "knowledge linking", "decision capture"],
    permissions: ["document:write", "knowledge:write", "decision:write"],
    allowedTools: ["companycore", "google_drive"]
  },
  {
    name: "Sales Agent",
    type: "agent",
    responsibilities: ["lead qualification", "offer preparation", "client handoff"],
    permissions: ["client:write", "deal:write", "approval:request"],
    allowedTools: ["companycore", "clickup", "google_drive"]
  },
  {
    name: "Finance Agent",
    type: "agent",
    responsibilities: ["billing preparation", "finance control checks"],
    permissions: ["resource:read", "approval:request"],
    allowedTools: ["companycore", "google_drive"]
  }
] as const;

const adapterSeeds = [
  {
    provider: "clickup",
    name: "ClickUp",
    authType: "api_key",
    connectionStatus: "configured",
    capabilities: ["read_task", "create_task", "update_task", "comment_task"]
  },
  {
    provider: "google_drive",
    name: "Google Drive",
    authType: "oauth",
    connectionStatus: "disconnected",
    capabilities: ["read_file", "create_file", "update_file", "search_files", "create_folder"]
  },
  {
    provider: "github",
    name: "GitHub",
    authType: "oauth",
    connectionStatus: "disconnected",
    capabilities: ["read_logs", "deploy_app"]
  },
  {
    provider: "coolify",
    name: "Coolify",
    authType: "api_key",
    connectionStatus: "disconnected",
    capabilities: ["deploy_app", "read_logs"]
  },
  {
    provider: "n8n",
    name: "n8n",
    authType: "webhook_secret",
    connectionStatus: "disconnected",
    capabilities: ["create_calendar_event"]
  }
] as const;

const pipelineSeeds = [
  {
    processName: "Feature development",
    department: "Product",
    ownerRole: "CTO Agent",
    pipelineName: "Feature Development Pipeline",
    purpose: "Move a product idea through architecture, implementation, validation, deploy, monitoring, and documentation.",
    riskLevel: "high",
    stages: [
      "Idea",
      "Architecture Review",
      "Task Planning",
      "Implementation",
      "Tests",
      "UI Review",
      "Security Review",
      "Deploy",
      "Monitoring",
      "Documentation Update"
    ]
  },
  {
    processName: "Client onboarding",
    department: "Customer Success",
    ownerRole: "Project Manager Agent",
    pipelineName: "Client Onboarding Pipeline",
    purpose: "Convert a lead into an approved, prepared, and kicked-off delivery project.",
    riskLevel: "medium",
    stages: [
      "Lead",
      "Discovery",
      "Offer",
      "Contract/Approval",
      "Project Setup",
      "Drive Folder",
      "ClickUp Tasks",
      "Kickoff",
      "Delivery Plan"
    ]
  },
  {
    processName: "Content production",
    department: "Marketing",
    ownerRole: "Documentation Agent",
    pipelineName: "Content Production Pipeline",
    purpose: "Take content ideas from brief through review, publication, and analytics.",
    riskLevel: "medium",
    stages: ["Idea", "Brief", "Draft", "Review", "SEO", "Graphics", "Approval", "Publish", "Analytics"]
  },
  {
    processName: "Agent task execution",
    department: "HR / Agent Management",
    ownerRole: "Project Manager Agent",
    pipelineName: "Agent Task Execution Pipeline",
    purpose: "Guide agents from task intake through context, planning, execution, validation, reporting, and approval handoff.",
    riskLevel: "high",
    stages: [
      "Task Received",
      "Context Gathering",
      "Procedure Selection",
      "Plan",
      "Execute",
      "Validate",
      "Report",
      "Approval if needed",
      "Close"
    ]
  },
  {
    processName: "Integration onboarding",
    department: "Operations",
    ownerRole: "CTO Agent",
    pipelineName: "Integration Onboarding Pipeline",
    purpose: "Add new tool adapters through research, design, auth, capability mapping, sync tests, UI status, and documentation.",
    riskLevel: "high",
    stages: [
      "Tool Selected",
      "API Research",
      "Adapter Design",
      "Auth Setup",
      "Capabilities Mapping",
      "Test Sync",
      "UI Status",
      "Documentation"
    ]
  },
  {
    processName: "Documentation update",
    department: "Knowledge / Documentation",
    ownerRole: "Documentation Agent",
    pipelineName: "Documentation Update Pipeline",
    purpose: "Keep operational documentation synchronized with changes and related processes or tasks.",
    riskLevel: "medium",
    stages: [
      "Change Detected",
      "Affected Docs Identified",
      "Draft Update",
      "Review",
      "Publish",
      "Link to Related Process/Task"
    ]
  },
  {
    processName: "Deployment",
    department: "Engineering",
    ownerRole: "CTO Agent",
    pipelineName: "Deployment Pipeline",
    purpose: "Promote code through tests, build, deploy, health checks, log review, rollback handling, and status reporting.",
    riskLevel: "critical",
    stages: [
      "Code Ready",
      "Tests",
      "Build",
      "Deploy via Coolify/GitHub",
      "Health Check",
      "Logs Review",
      "Rollback if needed",
      "Status Report"
    ]
  }
] as const;

const businessFunctionSeeds = [
  "Strategy / CEO Office",
  "Product",
  "Engineering",
  "Design / UX",
  "Marketing",
  "Sales",
  "Operations",
  "Finance",
  "Legal",
  "Customer Success",
  "HR / Agent Management",
  "Knowledge / Documentation"
] as const;

async function ensureCompanyOsFoundation(workspaceId: string) {
  const roleByName = new Map<string, { id: string }>();

  for (const role of companyRoleSeeds) {
    const record = await prisma.companyRole.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: role.name
        }
      },
      update: {
        type: role.type,
        responsibilities: [...role.responsibilities],
        permissions: [...role.permissions],
        allowedTools: [...role.allowedTools]
      },
      create: {
        workspaceId,
        name: role.name,
        type: role.type,
        responsibilities: [...role.responsibilities],
        permissions: [...role.permissions],
        allowedTools: [...role.allowedTools]
      },
      select: { id: true }
    });
    roleByName.set(role.name, record);
  }

  const humanOwnerRole = roleByName.get("Human Owner")!;
  for (const role of companyRoleSeeds.filter((item) => item.name !== "Human Owner")) {
    const record = roleByName.get(role.name)!;
    await prisma.companyRole.update({
      where: { id: record.id },
      data: {
        escalationTargetId: humanOwnerRole.id,
        defaultPolicies: [
          "Risky external writes require approval.",
          "Agents must create events and audit evidence for significant actions."
        ]
      }
    });
  }

  const ctoRole = roleByName.get("CTO Agent")!;
  const adapterByProvider = new Map<string, { id: string }>();
  for (const adapter of adapterSeeds) {
    const adapterRecord = await prisma.toolAdapter.upsert({
      where: {
        workspaceId_provider: {
          workspaceId,
          provider: adapter.provider
        }
      },
      update: {
        name: adapter.name,
        authType: adapter.authType,
        connectionStatus: adapter.connectionStatus,
        ownerRoleId: ctoRole.id,
        configSchema: {
          credentialsReference: "integration_settings.secret_ciphertext",
          workspaceScoped: true
        }
      },
      create: {
        workspaceId,
        provider: adapter.provider,
        name: adapter.name,
        authType: adapter.authType,
        connectionStatus: adapter.connectionStatus,
        ownerRoleId: ctoRole.id,
        configSchema: {
          credentialsReference: "integration_settings.secret_ciphertext",
          workspaceScoped: true
        }
      },
      select: { id: true }
    });
    adapterByProvider.set(adapter.provider, adapterRecord);

    for (const capability of adapter.capabilities) {
      await prisma.integrationCapability.upsert({
        where: {
          toolAdapterId_capabilityKey: {
            toolAdapterId: adapterRecord.id,
            capabilityKey: capability
          }
        },
        update: {
          workspaceId,
          requiredPermissions: [`${adapter.provider}:${capability}`],
          riskLevel: ["update_file", "deploy_app"].includes(capability) ? "high" : "medium",
          requiresApproval: ["update_file", "deploy_app"].includes(capability),
          auditRequired: true
        },
        create: {
          workspaceId,
          toolAdapterId: adapterRecord.id,
          capabilityKey: capability,
          requiredPermissions: [`${adapter.provider}:${capability}`],
          riskLevel: ["update_file", "deploy_app"].includes(capability) ? "high" : "medium",
          requiresApproval: ["update_file", "deploy_app"].includes(capability),
          auditRequired: true
        }
      });
    }
  }

  const standard = await prisma.standard.upsert({
    where: {
      workspaceId_name_version: {
        workspaceId,
        name: "Company OS execution standard",
        version: 1
      }
    },
    update: {
      category: "operations",
      ownerRoleId: ctoRole.id,
      validationMethod: "Checklist, event evidence, and owner approval for high-risk actions."
    },
    create: {
      workspaceId,
      name: "Company OS execution standard",
      category: "operations",
      description: "Default quality standard for processes, pipelines, and procedures.",
      ownerRoleId: ctoRole.id,
      validationMethod: "Checklist, event evidence, and owner approval for high-risk actions."
    },
    select: { id: true }
  });

  const runChecklist = await prisma.checklistTemplate.upsert({
    where: {
      workspaceId_name_version: {
        workspaceId,
        name: "Pipeline run evidence checklist",
        version: 1
      }
    },
    update: {
      targetType: "pipeline_run",
      status: "active",
      description: "Default evidence checklist before a pipeline run can be treated as completed."
    },
    create: {
      workspaceId,
      name: "Pipeline run evidence checklist",
      description: "Default evidence checklist before a pipeline run can be treated as completed.",
      targetType: "pipeline_run",
      status: "active"
    },
    select: { id: true }
  });

  const checklistItems = [
    "Input payload and expected outcome are recorded.",
    "Each completed stage has output evidence.",
    "High-risk actions have an approval or documented blocker.",
    "Final report includes result, validation status, and next action."
  ];
  for (const [index, text] of checklistItems.entries()) {
    await prisma.checklistItem.upsert({
      where: {
        checklistTemplateId_itemOrder: {
          checklistTemplateId: runChecklist.id,
          itemOrder: index + 1
        }
      },
      update: {
        workspaceId,
        text,
        required: true,
        verificationType: "human_or_agent"
      },
      create: {
        workspaceId,
        checklistTemplateId: runChecklist.id,
        itemOrder: index + 1,
        text,
        required: true,
        verificationType: "human_or_agent"
      }
    });
  }

  for (const pipelineSeed of pipelineSeeds) {
    const ownerRole = roleByName.get(pipelineSeed.ownerRole) ?? ctoRole;
    const process = await prisma.process.upsert({
      where: {
        workspaceId_name_version: {
          workspaceId,
          name: pipelineSeed.processName,
          version: 1
        }
      },
      update: {
        description: `${pipelineSeed.processName} operating process for LuckySparrow Company OS.`,
        ownerRoleId: ownerRole.id,
        department: pipelineSeed.department,
        category: "company_os",
        status: "active",
        maturityLevel: "defined"
      },
      create: {
        workspaceId,
        name: pipelineSeed.processName,
        description: `${pipelineSeed.processName} operating process for LuckySparrow Company OS.`,
        ownerRoleId: ownerRole.id,
        department: pipelineSeed.department,
        category: "company_os",
        status: "active",
        maturityLevel: "defined"
      },
      select: { id: true }
    });

    const pipeline = await prisma.pipeline.upsert({
      where: {
        workspaceId_name_version: {
          workspaceId,
          name: pipelineSeed.pipelineName,
          version: 1
        }
      },
      update: {
        processId: process.id,
        purpose: pipelineSeed.purpose,
        triggerType: "manual",
        defaultOwnerRoleId: ownerRole.id,
        status: "active",
        isAutomatable: true,
        riskLevel: pipelineSeed.riskLevel,
        inputSchema: { type: "object", required: ["context"] },
        outputSchema: { type: "object", required: ["status", "result"] }
      },
      create: {
        workspaceId,
        processId: process.id,
        name: pipelineSeed.pipelineName,
        purpose: pipelineSeed.purpose,
        triggerType: "manual",
        defaultOwnerRoleId: ownerRole.id,
        status: "active",
        isAutomatable: true,
        riskLevel: pipelineSeed.riskLevel,
        inputSchema: { type: "object", required: ["context"] },
        outputSchema: { type: "object", required: ["status", "result"] }
      },
      select: { id: true }
    });

    const procedure = await prisma.procedure.upsert({
      where: {
        workspaceId_name_version: {
          workspaceId,
          name: `${pipelineSeed.pipelineName} SOP`,
          version: 1
        }
      },
      update: {
        processId: process.id,
        purpose: `Operate ${pipelineSeed.pipelineName} consistently with audit evidence.`,
        ownerRoleId: ownerRole.id,
        status: "active",
        qualityStandardId: standard.id,
        requiredTools: ["companycore", "clickup", "google_drive"],
        requiredPermissions: ["pipeline:read", "task:write", "event:write"],
        expectedResult: "Pipeline stage is completed with output evidence, validation result, and next action."
      },
      create: {
        workspaceId,
        processId: process.id,
        name: `${pipelineSeed.pipelineName} SOP`,
        purpose: `Operate ${pipelineSeed.pipelineName} consistently with audit evidence.`,
        scope: pipelineSeed.pipelineName,
        ownerRoleId: ownerRole.id,
        status: "active",
        qualityStandardId: standard.id,
        requiredTools: ["companycore", "clickup", "google_drive"],
        requiredPermissions: ["pipeline:read", "task:write", "event:write"],
        expectedResult: "Pipeline stage is completed with output evidence, validation result, and next action."
      },
      select: { id: true }
    });

    for (const [index, stageName] of pipelineSeed.stages.entries()) {
      const position = index + 1;
      await prisma.pipelineStage.upsert({
        where: {
          pipelineId_position: {
            pipelineId: pipeline.id,
            position
          }
        },
        update: {
          workspaceId,
          name: stageName,
          description: `${stageName} stage for ${pipelineSeed.pipelineName}.`,
          assignedRoleId: ownerRole.id,
          procedureId: procedure.id,
          requiredTools: ["companycore"],
          requiredApprovals: pipelineSeed.riskLevel === "critical" || /Approval|Deploy|Contract|Security/.test(stageName)
            ? ["Human Owner"]
            : [],
          estimatedDuration: "TBD",
          failureStrategy: "Stop, record the blocker, and request owner or accountable-role decision.",
          retryPolicy: { maxAttempts: 1, requiresReviewAfterFailure: true },
          status: "active"
        },
        create: {
          workspaceId,
          pipelineId: pipeline.id,
          name: stageName,
          position,
          description: `${stageName} stage for ${pipelineSeed.pipelineName}.`,
          expectedInput: { stage: stageName, contextRequired: true },
          expectedOutput: { stage: stageName, evidenceRequired: true },
          entryConditions: position === 1 ? ["Pipeline has approved input payload."] : ["Previous stage is completed."],
          exitConditions: ["Expected output exists.", "Validation evidence is recorded."],
          assignedRoleId: ownerRole.id,
          procedureId: procedure.id,
          requiredTools: ["companycore"],
          requiredApprovals: pipelineSeed.riskLevel === "critical" || /Approval|Deploy|Contract|Security/.test(stageName)
            ? ["Human Owner"]
            : [],
          estimatedDuration: "TBD",
          failureStrategy: "Stop, record the blocker, and request owner or accountable-role decision.",
          retryPolicy: { maxAttempts: 1, requiresReviewAfterFailure: true },
          status: "active"
        }
      });

      await prisma.procedureStep.upsert({
        where: {
          procedureId_stepOrder: {
            procedureId: procedure.id,
            stepOrder: position
          }
        },
        update: {
          instruction: `Complete the ${stageName} stage, record evidence, and surface blockers before continuing.`,
          stepType: /Approval|Review/.test(stageName) ? "human_review" : "agent",
          requiredToolAdapterId: /ClickUp/.test(stageName) ? adapterByProvider.get("clickup")?.id : undefined,
          validationRule: { evidenceRequired: true, statusMustBe: "completed_or_blocked" }
        },
        create: {
          procedureId: procedure.id,
          stepOrder: position,
          instruction: `Complete the ${stageName} stage, record evidence, and surface blockers before continuing.`,
          stepType: /Approval|Review/.test(stageName) ? "human_review" : "agent",
          requiredToolAdapterId: /ClickUp/.test(stageName) ? adapterByProvider.get("clickup")?.id : undefined,
          expectedInput: { stage: stageName },
          expectedOutput: { evidence: "required", status: "completed_or_blocked" },
          validationRule: { evidenceRequired: true, statusMustBe: "completed_or_blocked" },
          rollbackInstruction: "Reopen the previous stage and attach the failure evidence."
        }
      });
    }

    await prisma.resource.upsert({
      where: {
        workspaceId_externalProvider_externalId: {
          workspaceId,
          externalProvider: "companycore",
          externalId: pipelineSeed.pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
        }
      },
      update: {
        name: `${pipelineSeed.pipelineName} operating resource`,
        ownerRoleId: ownerRole.id,
        relatedProcessId: process.id,
        metadata: { pipelineName: pipelineSeed.pipelineName, department: pipelineSeed.department }
      },
      create: {
        workspaceId,
        type: "pipeline",
        externalProvider: "companycore",
        externalId: pipelineSeed.pipelineName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        name: `${pipelineSeed.pipelineName} operating resource`,
        ownerRoleId: ownerRole.id,
        relatedProcessId: process.id,
        metadata: { pipelineName: pipelineSeed.pipelineName, department: pipelineSeed.department }
      }
    });
  }

  for (const [index, name] of businessFunctionSeeds.entries()) {
    await prisma.businessFunction.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name
        }
      },
      update: {
        category: name.split(" / ")[0].toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        accountableRoleId: index === 0 ? roleByName.get("CEO Agent")?.id : ctoRole.id,
        status: "active"
      },
      create: {
        workspaceId,
        name,
        category: name.split(" / ")[0].toLowerCase().replace(/[^a-z0-9]+/g, "_"),
        description: `${name} business function for LuckySparrow Company OS.`,
        accountableRoleId: index === 0 ? roleByName.get("CEO Agent")?.id : ctoRole.id,
        status: "active"
      }
    });
  }

  const deploymentPipeline = await prisma.pipeline.findUnique({
    where: {
      workspaceId_name_version: {
        workspaceId,
        name: "Deployment Pipeline",
        version: 1
      }
    },
    include: { process: true }
  });

  if (deploymentPipeline) {
    const deploymentRisk = await prisma.risk.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: "Unsafe deployment without validation"
        }
      },
      update: {
        riskLevel: "critical",
        processId: deploymentPipeline.processId,
        pipelineId: deploymentPipeline.id,
        status: "active"
      },
      create: {
        workspaceId,
        name: "Unsafe deployment without validation",
        description: "A deployment may proceed before tests, health checks, or rollback readiness are confirmed.",
        category: "deployment",
        riskLevel: "critical",
        likelihood: "medium",
        impact: "critical",
        processId: deploymentPipeline.processId,
        pipelineId: deploymentPipeline.id,
        status: "active"
      },
      select: { id: true }
    });

    await prisma.control.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: "Deployment requires test and health evidence"
        }
      },
      update: {
        riskId: deploymentRisk.id,
        ownerRoleId: ctoRole.id,
        status: "active"
      },
      create: {
        workspaceId,
        riskId: deploymentRisk.id,
        name: "Deployment requires test and health evidence",
        description: "Deploy stages require passing validation and post-deploy health evidence before status report.",
        controlType: "quality_gate",
        ownerRoleId: ctoRole.id,
        verificationMethod: "build/test output and health check evidence",
        status: "active"
      }
    });

    await prisma.metric.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: "Deployment success rate"
        }
      },
      update: {
        category: "engineering",
        processId: deploymentPipeline.processId,
        pipelineId: deploymentPipeline.id,
        ownerRoleId: ctoRole.id,
        status: "active"
      },
      create: {
        workspaceId,
        name: "Deployment success rate",
        category: "engineering",
        description: "Share of deployments that complete health checks without rollback.",
        measurementType: "ratio",
        unit: "percent",
        targetValue: 95,
        calculation: { numerator: "successful_deployments", denominator: "all_deployments" },
        processId: deploymentPipeline.processId,
        pipelineId: deploymentPipeline.id,
        ownerRoleId: ctoRole.id,
        status: "active"
      }
    });

    await prisma.policy.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: "Critical deployment actions require approval"
        }
      },
      update: {
        processId: deploymentPipeline.processId,
        enforcementMode: "require_approval",
        escalationRoleId: humanOwnerRole.id,
        status: "active"
      },
      create: {
        workspaceId,
        name: "Critical deployment actions require approval",
        description: "Agents must request approval before production deployment or rollback actions.",
        appliesTo: "pipeline",
        ruleType: "deployment_control",
        severity: "critical",
        enforcementMode: "require_approval",
        escalationRoleId: humanOwnerRole.id,
        processId: deploymentPipeline.processId,
        status: "active"
      }
    });

    const deploymentHealthRule = await prisma.automationRule.upsert({
      where: {
        workspaceId_name: {
          workspaceId,
          name: "Escalate failed deployment health check"
        }
      },
      update: {
        pipelineId: deploymentPipeline.id,
        status: "active",
        condition: { eventType: "deployment_health_failed" },
        action: { requestApproval: true, notifyRole: "Human Owner" }
      },
      create: {
        workspaceId,
        name: "Escalate failed deployment health check",
        description: "If a deployment health check fails, request human approval for rollback or recovery.",
        pipelineId: deploymentPipeline.id,
        condition: { eventType: "deployment_health_failed" },
        action: { requestApproval: true, notifyRole: "Human Owner" },
        status: "active"
      },
      select: { id: true }
    });

    const deploymentHealthTrigger = await prisma.trigger.findFirst({
      where: {
        workspaceId,
        automationRuleId: deploymentHealthRule.id,
        sourceType: "system_event",
        eventType: "deployment_health_failed"
      },
      select: { id: true }
    });

    if (deploymentHealthTrigger) {
      await prisma.trigger.update({
        where: { id: deploymentHealthTrigger.id },
        data: { status: "active" }
      });
    } else {
      await prisma.trigger.create({
        data: {
          workspaceId,
          automationRuleId: deploymentHealthRule.id,
          sourceType: "system_event",
          eventType: "deployment_health_failed",
          status: "active"
        }
      });
    }

    await prisma.knowledgeItem.upsert({
      where: {
        workspaceId_sourceProvider_sourceExternalId: {
          workspaceId,
          sourceProvider: "companycore",
          sourceExternalId: "deployment-runbook"
        }
      },
      update: {
        processId: deploymentPipeline.processId,
        pipelineId: deploymentPipeline.id,
        status: "active"
      },
      create: {
        workspaceId,
        title: "Deployment runbook",
        itemType: "runbook",
        summary: "Operational knowledge linked to deployment pipeline validation and rollback.",
        sourceProvider: "companycore",
        sourceExternalId: "deployment-runbook",
        processId: deploymentPipeline.processId,
        pipelineId: deploymentPipeline.id,
        status: "active"
      }
    });
  }
}

function generatedWorkforceFiles(entity: {
  name: string;
  type: "human" | "agent";
  role?: string | null;
  department?: string | null;
  personalityProfile: string;
  runtimeMode: string;
  model?: string | null;
  runtimeExternalId?: string | null;
  description?: string | null;
  hierarchyLevel?: string | null;
  bigFiveProfile?: Record<string, number>;
  skillIndex?: string[];
  knowledgeIndex?: string[];
  toolIndex?: string[];
}) {
  const responsibilities = entity.description || "Responsibilities are defined by CompanyCore tasks, roles, and governance.";
  const bigFive = entity.bigFiveProfile
    ? Object.entries(entity.bigFiveProfile).map(([key, value]) => `- ${key}: ${Number(value).toFixed(2)}`).join("\n")
    : "- Not configured";
  const list = (items?: string[]) => items?.length ? items.map((item) => `- ${item}`).join("\n") : "- Not configured";
  return {
    "agent.md": `# ${entity.name}

## Identity
- Type: ${entity.type}
- Role: ${entity.role || "Unassigned"}
- Department: ${entity.department || "06-kadry"}
- Hierarchy level: ${entity.hierarchyLevel || "not configured"}

## Responsibilities
${responsibilities}

## Skill Index
${list(entity.skillIndex)}

## Knowledge Index
${list(entity.knowledgeIndex)}

## Tool Index
${list(entity.toolIndex)}

## Runtime
- Runtime mode: ${entity.runtimeMode}
- Model: ${entity.model || "not configured"}
- Runtime external ID: ${entity.runtimeExternalId || "not linked"}
`,
    "personality.md": `# ${entity.name} Personality

## Profile
- Personality profile: ${entity.personalityProfile}

## Big Five
${bigFive}

## Communication Style
Managed by CompanyCore.

## Decision Style
Follow CompanyCore authority, evidence, and approval guardrails.
`,
    "environment.md": `# ${entity.name} Environment

Roost is the organizational source of truth. Local Codex Agent Hosts are supervised execution clients.

## Organization Context
Roost manages the 00-12 operating departments, workforce roster, responsibilities, permissions, knowledge, resources, tasks, events, and generated runtime files. Execution clients consume scoped API context and must not become the source of truth for people, roles, skills, tools, or knowledge access.
`
  };
}

const commonDirectorSkills = [
  "APQC Process Map",
  "Agent Personality Behavior Design",
  "Customer Discovery Feedback Loop",
  "DACI Governance Gates",
  "Featherly CMS Delivery System",
  "Legal Privacy Review",
  "MCP Product Design",
  "MECE Responsibility Design"
] as const;

const commonToolIndex = [
  "Agent Events",
  "Agent Logs",
  "CompanyCore MCP bridge",
  "Operations work items",
  "Assets context",
  "Tasks",
  "Approvals"
] as const;

const departmentAgentSeeds = [
  {
    name: "00 AIA(AI Assistant)",
    slug: "00-aia-ai-assistant",
    role: "AI Assistant and Executive Coordination Hub",
    title: "General - AI Assistant and Executive Coordination Hub",
    department: "00-ogolny",
    runtimeExternalId: "00-aia-ai-assistant",
    reportsToSlug: null,
    hierarchyLevel: "executive_root",
    personalityProfile: "executive",
    bigFiveProfile: { openness: 0.8, conscientiousness: 1, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.4 },
    toolCount: 71,
    knowledgeCount: 2,
    runtimeStatus: "idle",
    description: "Executive coordination root for LuckySparrow: routes operator intent to the right chief, maintains the top-level operating map, and receives bottom-up reports from all 12 chiefs. Uses APQC, PAEI, and MECE to keep the company coherent."
  },
  {
    name: "01 CSO(Chief Strategy Officer)",
    slug: "01-cso-chief-strategy-officer",
    role: "Chief Strategy Officer",
    title: "Researcher - Chief Strategy Officer",
    department: "01-strategia",
    runtimeExternalId: "01-cso-chief-strategy-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "researcher",
    bigFiveProfile: { openness: 1, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 20,
    knowledgeCount: 7,
    runtimeStatus: "paused"
  },
  {
    name: "02 CPO(Chief Product Officer)",
    slug: "02-cpo-chief-product-officer",
    role: "Chief Product Officer",
    title: "PM - Chief Product Officer",
    department: "02-produkt",
    runtimeExternalId: "02-cpo-chief-product-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "creative",
    bigFiveProfile: { openness: 1, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.4 },
    toolCount: 29,
    knowledgeCount: 50,
    runtimeStatus: "idle"
  },
  {
    name: "03 CRO(Chief Revenue Officer)",
    slug: "03-cro-chief-revenue-officer",
    role: "Chief Revenue Officer",
    title: "CMO - Chief Revenue Officer",
    department: "03-sprzedaz",
    runtimeExternalId: "03-cro-chief-revenue-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "executive",
    bigFiveProfile: { openness: 0.8, conscientiousness: 0.8, extraversion: 1, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 14,
    knowledgeCount: 147,
    runtimeStatus: "idle"
  },
  {
    name: "04 COO(Chief Operating Officer)",
    slug: "04-coo-chief-operating-officer",
    role: "Chief Operating Officer",
    title: "DevOps - Chief Operating Officer",
    department: "04-operacje",
    runtimeExternalId: "04-coo-chief-operating-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "analytical",
    bigFiveProfile: { openness: 0.8, conscientiousness: 1, extraversion: 0.6, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 32,
    knowledgeCount: 20,
    runtimeStatus: "idle"
  },
  {
    name: "05 CCO(Chief Customer Officer)",
    slug: "05-cco-chief-customer-officer",
    role: "Chief Customer Officer",
    title: "General - Chief Customer Officer",
    department: "05-relacje",
    runtimeExternalId: "05-cco-chief-customer-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "supportive",
    bigFiveProfile: { openness: 0.8, conscientiousness: 0.8, extraversion: 0.8, agreeableness: 1, neuroticism: 0.4 },
    toolCount: 14,
    knowledgeCount: 522,
    runtimeStatus: "idle"
  },
  {
    name: "06 CHRO(Chief Human Resources Officer)",
    slug: "06-chro-chief-human-resources-officer",
    role: "Chief Human Resources Officer",
    title: "General - Chief Human Resources Officer",
    department: "06-kadry",
    runtimeExternalId: "06-chro-chief-human-resources-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "supportive",
    bigFiveProfile: { openness: 0.8, conscientiousness: 0.8, extraversion: 0.8, agreeableness: 1, neuroticism: 0.4 },
    toolCount: 106,
    knowledgeCount: 11,
    runtimeStatus: "idle"
  },
  {
    name: "07 CFO(Chief Financial Officer)",
    slug: "07-cfo-chief-financial-officer",
    role: "Chief Financial Officer",
    title: "CFO - Chief Financial Officer",
    department: "07-finanse",
    runtimeExternalId: "07-cfo-chief-financial-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "analytical",
    bigFiveProfile: { openness: 0.6, conscientiousness: 1, extraversion: 0.6, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 57,
    knowledgeCount: 27,
    runtimeStatus: "idle"
  },
  {
    name: "08 CAO(Chief Assets Officer)",
    slug: "08-cao-chief-assets-officer",
    role: "Chief Assets Officer",
    title: "General - Chief Assets Officer",
    department: "08-zasoby",
    runtimeExternalId: "08-cao-chief-assets-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "analytical",
    bigFiveProfile: { openness: 0.8, conscientiousness: 1, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.4 },
    toolCount: 23,
    knowledgeCount: 19,
    runtimeStatus: "idle"
  },
  {
    name: "09 CTO(Chief Technology Officer)",
    slug: "09-cto-chief-technology-officer",
    role: "Chief Technology Officer",
    title: "CTO - Chief Technology Officer",
    department: "09-technologia",
    runtimeExternalId: "09-cto-chief-technology-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "analytical",
    bigFiveProfile: { openness: 1, conscientiousness: 1, extraversion: 0.6, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 27,
    knowledgeCount: 2,
    runtimeStatus: "idle"
  },
  {
    name: "10 CLO(Chief Legal Officer)",
    slug: "10-clo-chief-legal-officer",
    role: "Chief Legal Officer",
    title: "Security - Chief Legal Officer",
    department: "10-prawo",
    runtimeExternalId: "10-clo-chief-legal-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "analytical",
    bigFiveProfile: { openness: 0.6, conscientiousness: 1, extraversion: 0.4, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 58,
    knowledgeCount: 25,
    runtimeStatus: "idle"
  },
  {
    name: "11 CINO(Chief Innovation Officer)",
    slug: "11-cino-chief-innovation-officer",
    role: "Chief Innovation Officer",
    title: "Researcher - Chief Innovation Officer",
    department: "11-innowacje",
    runtimeExternalId: "11-cino-chief-innovation-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "researcher",
    bigFiveProfile: { openness: 1, conscientiousness: 0.8, extraversion: 0.6, agreeableness: 0.8, neuroticism: 0.4 },
    toolCount: 31,
    knowledgeCount: 161,
    runtimeStatus: "idle"
  },
  {
    name: "12 CEO(Chief Executive Officer)",
    slug: "12-ceo-chief-executive-officer",
    role: "Chief Executive Officer",
    title: "CEO - Chief Executive Officer",
    department: "12-zarzadzanie",
    runtimeExternalId: "12-ceo-chief-executive-officer",
    reportsToSlug: "00-aia-ai-assistant",
    hierarchyLevel: "department_director",
    personalityProfile: "executive",
    bigFiveProfile: { openness: 0.8, conscientiousness: 1, extraversion: 0.8, agreeableness: 0.6, neuroticism: 0.4 },
    toolCount: 68,
    knowledgeCount: 16,
    runtimeStatus: "idle"
  }
] as const;

async function ensureWorkforceFoundation(workspaceId: string, owner: { id: string; email: string; name: string | null }) {
  const ownerDisplayName = owner.name || owner.email;
  const ownerBigFive = { openness: 1, conscientiousness: 1, extraversion: 0.4, agreeableness: 0.6, neuroticism: 0.4 };
  const ownerSkills = ["Company ownership", "Strategy", "Systems design", "Product direction", "AI agent orchestration"];
  const ownerKnowledge = ["Roost source of truth", "LuckySparrow operating model", "Codex agent runtime", "Workspace administration"];
  const ownerTools = ["Roost web", "Codex", "ClickUp", "Google Drive"];
  await prisma.workforceEntity.upsert({
    where: {
      workspaceId_source_externalId: {
        workspaceId,
        source: "user",
        externalId: owner.id
      }
    },
    update: {
      name: ownerDisplayName,
      department: "06-kadry",
      role: "Founder / Owner",
      personalityProfile: "analytical",
      runtimeMode: "manual",
      hierarchyLevel: "owner",
      bigFiveProfile: ownerBigFive,
      skillIndex: ownerSkills,
      knowledgeIndex: ownerKnowledge,
      toolIndex: ownerTools,
      generatedFiles: generatedWorkforceFiles({
        name: ownerDisplayName,
        type: "human",
        role: "Founder / Owner",
        department: "06-kadry",
        personalityProfile: "analytical",
        runtimeMode: "manual",
        hierarchyLevel: "owner",
        bigFiveProfile: ownerBigFive,
        skillIndex: ownerSkills,
        knowledgeIndex: ownerKnowledge,
        toolIndex: ownerTools
      })
    },
    create: {
      workspaceId,
      type: "human",
      status: "active",
      name: ownerDisplayName,
      slug: `owner-${owner.id.slice(0, 8)}`,
      department: "06-kadry",
      role: "Founder / Owner",
      personalityProfile: "analytical",
      runtimeMode: "manual",
      synchronizationEnabled: false,
      hierarchyLevel: "owner",
      bigFiveProfile: ownerBigFive,
      skillIndex: ownerSkills,
      knowledgeIndex: ownerKnowledge,
      toolIndex: ownerTools,
      generatedFiles: generatedWorkforceFiles({
        name: ownerDisplayName,
        type: "human",
        role: "Founder / Owner",
        department: "06-kadry",
        personalityProfile: "analytical",
        runtimeMode: "manual",
        hierarchyLevel: "owner",
        bigFiveProfile: ownerBigFive,
        skillIndex: ownerSkills,
        knowledgeIndex: ownerKnowledge,
        toolIndex: ownerTools
      }),
      source: "user",
      externalId: owner.id
    }
  });

  await prisma.workforceEntity.updateMany({
    where: { workspaceId, source: "seed", type: "agent" },
    data: { status: "archived", synchronizationEnabled: false, syncStatus: "stale" }
  });

  const directorBySlug = new Map<string, { id: string }>();
  for (const director of departmentAgentSeeds) {
    const manager = director.reportsToSlug ? directorBySlug.get(director.reportsToSlug) : null;
    const skillIndex = [...commonDirectorSkills];
    const knowledgeIndex = [
      `${director.department} department resources`,
      "Company resources",
      "Google Drive files",
      "ClickUp tables",
      "Tasks",
      `${director.knowledgeCount} assigned knowledge resources`
    ];
    const toolIndex = [
      ...commonToolIndex,
      `${director.toolCount} recommended tools`
    ];
    const description = director.description
      || `Owns department ${director.department} as ${director.role}. Delegates work top-down to future managers, reports progress bottom-up to 00 AIA, and runs the department with APQC, PAEI, and MECE discipline.`;
    const generatedFiles = generatedWorkforceFiles({
      name: director.name,
      type: "agent",
      role: director.role,
      department: director.department,
      personalityProfile: director.personalityProfile,
      runtimeMode: "semi_autonomous",
      model: "gpt-5.3-codex",
      runtimeExternalId: director.runtimeExternalId,
      description,
      hierarchyLevel: director.hierarchyLevel,
      bigFiveProfile: director.bigFiveProfile,
      skillIndex,
      knowledgeIndex,
      toolIndex
    });
    const record = await prisma.workforceEntity.upsert({
      where: {
        workspaceId_source_externalId: {
          workspaceId,
          source: "seed",
          externalId: director.slug
        }
      },
      update: {
        name: director.name,
        slug: director.slug,
        status: "active",
        department: director.department,
        role: director.role,
        description,
        managerId: manager?.id ?? null,
        personalityProfile: director.personalityProfile,
        model: "gpt-5.3-codex",
        runtimeMode: "semi_autonomous",
        runtimeExternalId: director.runtimeExternalId,
        synchronizationEnabled: true,
        hierarchyLevel: director.hierarchyLevel,
        bigFiveProfile: director.bigFiveProfile,
        skillIndex,
        knowledgeIndex,
        toolIndex,
        authorityScope: ["department_lead", "reports_to_aia", director.department],
        runtimeProfile: {
          title: director.title,
          provider: "codex",
          runtimeStatus: "not_linked",
          adapterType: "Codex (local)",
          model: "gpt-5.3-codex",
          toolCount: director.toolCount,
          knowledgeCount: director.knowledgeCount,
          manager: director.reportsToSlug
        },
        generatedFiles,
        syncStatus: "stale",
        source: "seed",
        externalId: director.slug
      },
      create: {
        workspaceId,
        type: "agent",
        status: "active",
        name: director.name,
        slug: director.slug,
        description,
        department: director.department,
        role: director.role,
        managerId: manager?.id ?? null,
        personalityProfile: director.personalityProfile,
        runtimeMode: "semi_autonomous",
        model: "gpt-5.3-codex",
        runtimeExternalId: director.runtimeExternalId,
        synchronizationEnabled: true,
        hierarchyLevel: director.hierarchyLevel,
        bigFiveProfile: director.bigFiveProfile,
        skillIndex,
        knowledgeIndex,
        toolIndex,
        authorityScope: ["department_lead", "reports_to_aia", director.department],
        runtimeProfile: {
          title: director.title,
          provider: "codex",
          runtimeStatus: "not_linked",
          adapterType: "Codex (local)",
          model: "gpt-5.3-codex",
          toolCount: director.toolCount,
          knowledgeCount: director.knowledgeCount,
          manager: director.reportsToSlug
        },
        generatedFiles,
        syncStatus: "stale",
        source: "seed",
        externalId: director.slug
      }
    });
    directorBySlug.set(director.slug, record);
  }
}

const readinessDimensionSeed = [
  ["product-definition", "Product Definition"], ["engineering", "Engineering"], ["quality", "Quality"],
  ["security", "Security"], ["operations", "Operations"], ["ai-agent-readiness", "AI / Agent Readiness"],
  ["documentation", "Documentation"], ["legal", "Legal"], ["commercial", "Commercial"], ["support", "Support"]
] as const;

const capabilityDomainSeed = [
  ["identity-access", "Identity & Access"], ["experience", "Experience"], ["data", "Data"],
  ["interfaces", "Interfaces"], ["ai-agent", "AI / Agent Readiness"], ["infrastructure", "Infrastructure"],
  ["security", "Security"], ["quality", "Quality"], ["operations", "Operations"],
  ["commercial", "Commercial"], ["trading", "Trading"], ["company-os", "Company Operating System"]
] as const;

const capabilitySeed = [
  ["users", "Users", "identity-access", "engineering"], ["authentication", "Authentication", "identity-access", "security"],
  ["authorization", "Authorization", "identity-access", "security"], ["roles-permissions", "Roles and Permissions", "identity-access", "security"],
  ["sessions", "Sessions", "identity-access", "security"], ["api-keys", "API Keys", "identity-access", "ai-agent-readiness"],
  ["responsive-ui", "Responsive UI", "experience", "engineering"], ["accessibility", "Accessibility", "experience", "quality"],
  ["localization", "Localization", "experience", "product-definition"], ["notifications", "Notifications", "experience", "engineering"],
  ["onboarding", "Onboarding", "experience", "commercial"], ["search", "Search", "experience", "engineering"],
  ["database", "Database", "data", "engineering"], ["migrations", "Database Migrations", "data", "operations"],
  ["backups", "Backups", "data", "operations"], ["import-export", "Import and Export", "data", "engineering"],
  ["audit-history", "Audit History", "data", "security"], ["rest-api", "REST API", "interfaces", "engineering"],
  ["events", "Events", "interfaces", "ai-agent-readiness"], ["webhooks", "Webhooks", "interfaces", "engineering"],
  ["mcp", "MCP", "interfaces", "ai-agent-readiness"], ["structured-api", "Structured API", "ai-agent", "ai-agent-readiness"],
  ["typed-schemas", "Typed Schemas", "ai-agent", "ai-agent-readiness"], ["agent-identity", "Agent Identity", "ai-agent", "ai-agent-readiness"],
  ["agent-permissions", "Agent Permissions", "ai-agent", "ai-agent-readiness"], ["human-in-loop", "Human in the Loop", "ai-agent", "ai-agent-readiness"],
  ["agent-readable-docs", "Agent-readable Documentation", "ai-agent", "documentation"], ["development-environment", "Development Environment", "infrastructure", "engineering"],
  ["ci-cd", "CI/CD", "infrastructure", "operations"], ["secrets-management", "Secrets Management", "infrastructure", "security"],
  ["monitoring", "Monitoring", "infrastructure", "operations"], ["logging", "Logging", "infrastructure", "operations"],
  ["health-checks", "Health Checks", "infrastructure", "operations"], ["input-validation", "Input Validation", "security", "security"],
  ["rate-limiting", "Rate Limiting", "security", "security"], ["vulnerability-management", "Vulnerability Management", "security", "security"],
  ["unit-tests", "Unit Tests", "quality", "quality"], ["integration-tests", "Integration Tests", "quality", "quality"],
  ["e2e-tests", "End-to-end Tests", "quality", "quality"], ["technical-documentation", "Technical Documentation", "quality", "documentation"],
  ["incident-management", "Incident Management", "operations", "support"], ["product-analytics", "Product Analytics", "operations", "commercial"],
  ["pricing", "Pricing", "commercial", "commercial"], ["billing", "Billing", "commercial", "commercial"],
  ["terms-privacy", "Terms and Privacy", "commercial", "legal"], ["support-readiness", "Support Readiness", "commercial", "support"],
  ["trading-engine", "Trading Engine", "trading", "engineering"], ["market-data", "Market Data", "trading", "engineering"],
  ["position-management", "Position Management", "trading", "engineering"], ["risk-management", "Risk Management", "trading", "security"],
  ["organization-management", "Organization Management", "company-os", "product-definition"], ["department-management", "Department Management", "company-os", "product-definition"],
  ["process-core", "Process Core", "company-os", "engineering"], ["workforce-agents", "Workforce and Agents", "company-os", "ai-agent-readiness"]
] as const;

async function ensureProductEngineeringFoundation(workspaceId: string) {
  const readinessByKey = new Map<string, { id: string }>();
  for (const [position, [key, name]] of readinessDimensionSeed.entries()) {
    const dimension = await prisma.readinessDimensionDefinition.upsert({ where: { workspaceId_key: { workspaceId, key } }, update: { name, position }, create: { workspaceId, key, name, position } });
    readinessByKey.set(key, dimension);
  }
  const domainByKey = new Map<string, { id: string }>();
  for (const [position, [key, name]] of capabilityDomainSeed.entries()) {
    const domain = await prisma.capabilityDomain.upsert({ where: { workspaceId_key: { workspaceId, key } }, update: { name, position }, create: { workspaceId, key, name, position } });
    domainByKey.set(key, domain);
  }
  const capabilityByKey = new Map<string, { id: string }>();
  for (const [key, name, domainKey, readinessKey] of capabilitySeed) {
    const definition = await prisma.capabilityDefinition.upsert({
      where: { workspaceId_key: { workspaceId, key } },
      update: { name, domainId: domainByKey.get(domainKey)!.id, readinessDimensionId: readinessByKey.get(readinessKey)!.id },
      create: { workspaceId, key, name, description: `${name} capability definition shared across application implementations.`, domainId: domainByKey.get(domainKey)!.id, readinessDimensionId: readinessByKey.get(readinessKey)!.id, universal: !["trading", "company-os"].includes(domainKey), defaultApplicability: "recommended" }
    });
    capabilityByKey.set(key, definition);
  }
  const coreSaasKeys = ["users", "authentication", "authorization", "roles-permissions", "responsive-ui", "database", "migrations", "rest-api", "logging", "monitoring", "health-checks", "unit-tests", "integration-tests", "technical-documentation"];
  const aiReadyKeys = ["structured-api", "typed-schemas", "mcp", "events", "agent-identity", "agent-permissions", "human-in-loop", "audit-history", "agent-readable-docs"];
  for (const [key, name, capabilityKeys] of [["core-saas", "Core SaaS", coreSaasKeys], ["ai-ready", "AI Ready", aiReadyKeys]] as const) {
    const pack = await prisma.capabilityPack.upsert({ where: { workspaceId_key: { workspaceId, key } }, update: { name }, create: { workspaceId, key, name } });
    for (const capabilityKey of capabilityKeys) await prisma.capabilityPackItem.upsert({ where: { packId_capabilityDefinitionId: { packId: pack.id, capabilityDefinitionId: capabilityByKey.get(capabilityKey)!.id } }, update: { applicability: "required" }, create: { packId: pack.id, capabilityDefinitionId: capabilityByKey.get(capabilityKey)!.id, applicability: "required" } });
  }
  const blueprint = await prisma.applicationBlueprint.upsert({ where: { workspaceId_key: { workspaceId, key: "saas-web-application" } }, update: { name: "SaaS Web Application" }, create: { workspaceId, key: "saas-web-application", name: "SaaS Web Application", description: "Editable baseline for a secure, observable, API-first SaaS application." } });
  for (const capabilityKey of [...coreSaasKeys, ...aiReadyKeys]) await prisma.applicationBlueprintCapability.upsert({ where: { blueprintId_capabilityDefinitionId: { blueprintId: blueprint.id, capabilityDefinitionId: capabilityByKey.get(capabilityKey)!.id } }, update: { applicability: "required" }, create: { blueprintId: blueprint.id, capabilityDefinitionId: capabilityByKey.get(capabilityKey)!.id, applicability: "required" } });
  for (const [key, name, category] of [["react", "React", "frontend"], ["express", "Express", "backend"], ["postgresql", "PostgreSQL", "database"], ["prisma", "Prisma", "orm"], ["docker", "Docker", "deployment"], ["mcp", "Model Context Protocol", "interface"]] as const) await prisma.technologyDefinition.upsert({ where: { workspaceId_key: { workspaceId, key } }, update: { name, category }, create: { workspaceId, key, name, category } });
  const applications = [
    { slug: "aviary", name: "Aviary", description: "LuckySparrow application maintained in the approved local application workspace.", stage: "development" as const, directory: "Aviary", repositoryUrl: "https://github.com/Wroblewski-Patryk/Aviary.git", frontendUrl: "https://aviary.luckysparrow.ch/", path: "C:/Personal/Projekty/Aplikacje/Aviary/docs/README.md" },
    { slug: "featherly", name: "Featherly", description: "Content management and application delivery system.", stage: "development" as const, directory: "Featherly", repositoryUrl: "https://github.com/Wroblewski-Patryk/Featherly.git", frontendUrl: "https://test.wroblewskipatryk.pl/pl", path: "C:/Personal/Projekty/Aplikacje/Featherly/docs/README.md" },
    { slug: "nest", name: "Nest", description: "LuckySparrow application maintained in the approved local application workspace.", stage: "development" as const, directory: "Nest", repositoryUrl: "https://github.com/Wroblewski-Patryk/Nest.git", frontendUrl: "https://nest.luckysparrow.ch/", path: "C:/Personal/Projekty/Aplikacje/Nest/docs/README.md" },
    { slug: "roost", name: "Roost", description: "LuckySparrow company operating system and source of truth for products, work, evidence and supervised agents.", stage: "development" as const, directory: "Roost", repositoryUrl: "https://github.com/Wroblewski-Patryk/Roost.git", frontendUrl: "https://roost.luckysparrow.ch/", path: "C:/Personal/Projekty/Aplikacje/Roost/docs/README.md" },
    { slug: "soar", name: "Soar", description: "Trading automation platform.", stage: "development" as const, directory: "Soar", repositoryUrl: "https://github.com/Wroblewski-Patryk/Soar.git", frontendUrl: "https://soar.luckysparrow.ch/", path: "C:/Personal/Projekty/Aplikacje/Soar/docs/README.md" }
  ];
  for (const item of applications) {
    const runtimeMetadata = {
      localWorkspaceRoot: "C:\\Personal\\Projekty\\Aplikacje",
      localDirectory: item.directory,
      repositoryUrl: item.repositoryUrl,
      deploymentUrl: item.frontendUrl,
      deploymentProvider: "coolify",
      deploymentTrigger: "owner_authorized_git_push",
      releaseAuthority: "explicit_owner_authorization",
      codexExecutionLocation: "local_windows"
    };
    const application = await prisma.application.upsert({
      where: { workspaceId_slug: { workspaceId, slug: item.slug } },
      update: { name: item.name, description: item.description, innovationStage: item.stage, frontendUrl: item.frontendUrl, metadata: runtimeMetadata },
      create: { workspaceId, slug: item.slug, name: item.name, description: item.description, innovationStage: item.stage, targetPlatforms: ["web", "api", "agent_facing"], frontendUrl: item.frontendUrl, source: "import", metadata: runtimeMetadata }
    });
    let deliveryProject = await prisma.project.findFirst({ where: { workspaceId, source: "companycore", externalId: `application-delivery:${item.slug}` } });
    deliveryProject = deliveryProject
      ? await prisma.project.update({ where: { id: deliveryProject.id }, data: { name: `${item.name} application delivery`, description: `Canonical project for planning and delivering ${item.name}. Tasks linked here resolve to exactly one application for supervised Codex execution.`, status: "active" } })
      : await prisma.project.create({ data: { workspaceId, name: `${item.name} application delivery`, description: `Canonical project for planning and delivering ${item.name}. Tasks linked here resolve to exactly one application for supervised Codex execution.`, status: "active", source: "companycore", externalId: `application-delivery:${item.slug}` } });
    await prisma.applicationProject.upsert({ where: { applicationId_projectId: { applicationId: application.id, projectId: deliveryProject.id } }, update: { relationType: "delivery" }, create: { applicationId: application.id, projectId: deliveryProject.id, relationType: "delivery" } });
    await prisma.applicationRepository.upsert({
      where: { applicationId_url: { applicationId: application.id, url: item.repositoryUrl } },
      update: { name: `${item.name} repository`, defaultBranch: "main", purpose: "Canonical application source", isPrimary: true },
      create: { applicationId: application.id, name: `${item.name} repository`, url: item.repositoryUrl, defaultBranch: "main", purpose: "Canonical application source", isPrimary: true }
    });
    if (item.path) {
      const reference = `documentation-root:${item.path}`;
      if (!await prisma.applicationEvidence.findFirst({ where: { applicationId: application.id, reference } })) await prisma.applicationEvidence.create({ data: { workspaceId, applicationId: application.id, type: "documentation", source: "import", reference, description: "Registered documentation root. This proves documentation provenance, not runtime implementation.", verificationStatus: "unverified" } });
    }
    const specific = item.slug === "roost" ? ["organization-management", "department-management", "process-core", "workforce-agents"] : item.slug === "soar" ? ["trading-engine", "market-data", "position-management", "risk-management"] : [];
    for (const capabilityKey of [...coreSaasKeys, ...aiReadyKeys, ...specific]) await prisma.applicationCapability.upsert({ where: { applicationId_capabilityDefinitionId: { applicationId: application.id, capabilityDefinitionId: capabilityByKey.get(capabilityKey)!.id } }, update: {}, create: { applicationId: application.id, capabilityDefinitionId: capabilityByKey.get(capabilityKey)!.id, applicability: "required", targetState: "complete", observedState: "unknown" } });
  }
  const codexCandidateRule = await prisma.automationRule.upsert({
    where: { workspaceId_name: { workspaceId, name: "Prepare Codex candidate after explicit task readiness" } },
    update: { description: "Foundation-only rule. It may emit a Codex candidate event after an explicit readiness event; it never creates a task or execution.", condition: { eventType: "task_ready_for_codex", resourceType: "task" }, action: { type: "emit_event", eventType: "codex_execution_candidate", riskLevel: "medium", payload: { requiresOwnerReview: true } }, status: "paused" },
    create: { workspaceId, name: "Prepare Codex candidate after explicit task readiness", description: "Foundation-only rule. It may emit a Codex candidate event after an explicit readiness event; it never creates a task or execution.", condition: { eventType: "task_ready_for_codex", resourceType: "task" }, action: { type: "emit_event", eventType: "codex_execution_candidate", riskLevel: "medium", payload: { requiresOwnerReview: true } }, status: "paused" }
  });
  const codexCandidateTrigger = await prisma.trigger.findFirst({ where: { workspaceId, automationRuleId: codexCandidateRule.id, sourceType: "system_event", eventType: "task_ready_for_codex" } });
  if (codexCandidateTrigger) await prisma.trigger.update({ where: { id: codexCandidateTrigger.id }, data: { status: "paused", config: { mode: "foundation_only", createsExecution: false } } });
  else await prisma.trigger.create({ data: { workspaceId, automationRuleId: codexCandidateRule.id, sourceType: "system_event", eventType: "task_ready_for_codex", status: "paused", config: { mode: "foundation_only", createsExecution: false } } });
}

async function main() {
  const key = process.env.SEED_API_KEY ?? "dev-companycore-key";
  const ownerEmail = process.env.SEED_OWNER_EMAIL ?? "owner@example.com";
  const ownerPassword = process.env.SEED_OWNER_PASSWORD ?? "change-me-local-password";
  const ownerName = process.env.SEED_OWNER_NAME ?? "Patryk Wroblewski";
  const workspaceName = process.env.SEED_WORKSPACE_NAME ?? "LuckySparrow";

  const passwordHash = await hashPassword(ownerPassword);

  const owner = await prisma.user.upsert({
    where: { email: ownerEmail },
    update: {
      name: ownerName
    },
    create: {
      email: ownerEmail,
      name: ownerName,
      passwordHash
    }
  });

  const workspace = await prisma.workspace.upsert({
    where: { id: "00000000-0000-4000-8000-000000000100" },
    update: {
      name: workspaceName,
      ownerUserId: owner.id
    },
    create: {
      id: "00000000-0000-4000-8000-000000000100",
      name: workspaceName,
      ownerUserId: owner.id
    }
  });

  await prisma.workspaceMembership.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: workspace.id,
        userId: owner.id
      }
    },
    update: { role: "owner" },
    create: {
      workspaceId: workspace.id,
      userId: owner.id,
      role: "owner"
    }
  });

  await ensureSeedOperatingModel(workspace.id);
  await ensureCompanyOsFoundation(workspace.id);
  await ensureProductEngineeringFoundation(workspace.id);
  // Product Map is workspace-scoped and existing installations can predate the
  // lifecycle definition. Backfill every workspace on each idempotent deploy,
  // not only the deterministic seed workspace, so an older owner membership
  // cannot remain permanently `unavailable` after the feature ships.
  const lifecycleWorkspaces = await prisma.workspace.findMany({ select: { id: true } });
  for (const lifecycleWorkspace of lifecycleWorkspaces) {
    await ensureLifecycleProcedureForWorkspace(prisma, lifecycleWorkspace.id);
  }
  await ensureWorkforceFoundation(workspace.id, owner);

  const keyHash = hashApiKey(key);
  const existingApiKey = await prisma.apiKey.findFirst({
    where: {
      OR: [
        { keyHash },
        { key }
      ]
    }
  });

  if (existingApiKey) {
    await prisma.apiKey.update({
      where: { id: existingApiKey.id },
      data: {
        active: true,
        workspaceId: workspace.id,
        keyHash,
        keyPrefix: apiKeyPrefix(key),
        scopes: []
      }
    });
  } else {
    await prisma.apiKey.create({
      data: {
        name: "Local development key",
        key,
        keyHash,
        keyPrefix: apiKeyPrefix(key),
        scopes: [],
        workspaceId: workspace.id,
        active: true
      }
    });
  }

  const stages = ["Lead", "Qualified", "Proposal", "Won"];
  for (const [position, name] of stages.entries()) {
    await prisma.pipelineStage.upsert({
      where: { id: `00000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}` },
      update: { name, position, workspaceId: workspace.id },
      create: {
        id: `00000000-0000-4000-8000-${String(position + 1).padStart(12, "0")}`,
        workspaceId: workspace.id,
        name,
        position
      }
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
