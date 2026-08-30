import { Router } from "express";
import { adapterManifest, capabilities, effectiveCapabilities, scopesAreBroad } from "../../auth/capabilities";
import { env } from "../../config/env";
import { prisma } from "../../db/prisma";
import { googleDriveSecretStatus } from "../../integrations/integration-settings.service";
import { asyncHandler } from "../../middleware/async-handler";
import { createMcpManifest } from "../../mcp/manifest";
import { ensureOperatingModelForWorkspace } from "../../operating-model/catalog";

export const connectionRouter = Router();

connectionRouter.get("/", asyncHandler(async (req, res) => {
  const workspace = await prisma.workspace.findUnique({
    where: { id: req.auth!.workspaceId },
    select: {
      id: true,
      name: true,
      ownerUserId: true
    }
  });

  if (!workspace) {
    return res.status(422).json({ error: "workspace_required" });
  }

  await ensureOperatingModelForWorkspace(prisma, workspace.id);

  const clickUp = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: "clickup"
      }
    },
    select: {
      active: true,
      secretCiphertext: true,
      config: true,
      updatedAt: true
    }
  });
  const googleDrive = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: workspace.id,
        provider: "google_drive"
      }
    },
    select: {
      active: true,
      secretCiphertext: true,
      config: true,
      updatedAt: true
    }
  });

  const operatingAreas = await prisma.operatingArea.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { position: "asc" },
    select: {
      id: true,
      key: true,
      name: true,
      position: true,
      isSystem: true,
      tables: {
        orderBy: { apiSlug: "asc" },
        select: {
          id: true,
          tableName: true,
          apiSlug: true,
          name: true,
          source: true,
          externalId: true
        }
      }
    }
  });

  const requestBaseUrl = `${req.protocol}://${req.get("host")}`;
  const productionApiBaseUrl = env.apiHostnames[0] ? `https://${env.apiHostnames[0]}` : requestBaseUrl;
  const publicApiBaseUrl = (env.publicApiBaseUrl || (env.nodeEnv === "production" ? productionApiBaseUrl : requestBaseUrl)).replace(/\/+$/, "");

  res.json({
    data: {
      service: "companycore",
      apiVersion: "v1",
      status: "ok",
      auth: {
        type: req.auth!.authType,
        userId: req.auth!.userId,
        apiKeyId: req.auth!.apiKeyId,
        workspaceId: workspace.id
      },
      workspace: {
        id: workspace.id,
        name: workspace.name
      },
      operatingModel: {
        hierarchy: "workspace -> operating_area -> operating_folder -> operating_table -> record",
        areas: operatingAreas,
        systemTables: [
          "users",
          "workspaces",
          "workspace_memberships",
          "api_keys",
          "integration_settings",
          "external_container_mappings",
          "external_field_mappings",
          "storage_locations",
          "knowledge_roots",
          "automation_definitions"
        ]
      },
      capabilities: effectiveCapabilities(req.auth!.scopes),
      scopeMode: scopesAreBroad(req.auth!.scopes ?? []) ? "broad" : "scoped",
      adapterManifest,
      mcpManifest: createMcpManifest(req.auth!.scopes),
      agentAccess: {
        api: {
          baseUrl: publicApiBaseUrl,
          authHeader: adapterManifest.auth.serviceHeader,
          connectionPath: "/v1/connection",
          healthPath: "/health"
        },
        mcp: {
          serverName: "roost",
          transport: "stdio",
          bridgeCommand: "npm",
          bridgeArgs: ["run", "mcp:server"],
          bridgeWorkingDirectory: "C:\\Personal\\Projekty\\Aplikacje\\Roost",
          manifestPath: "/v1/mcp/manifest",
          secretEnvironmentVariable: "COMPANYCORE_API_KEY",
          baseUrlEnvironmentVariable: "COMPANYCORE_BASE_URL",
          commandModeEnvironmentVariable: "COMPANYCORE_MCP_COMMAND_MODE"
        },
        codex: {
          configPath: "~/.codex/config.toml",
          defaultToolsApprovalMode: "writes",
          verificationCommand: "codex mcp list"
        },
        agentHost: {
          transport: "outbound_https",
          workspaceRoot: "C:\\Personal\\Projekty\\Aplikacje",
          configPath: "%USERPROFILE%\\.roost\\agent-host.json",
          runtimeCommand: "npm run agent:codex-host",
          readinessPath: "/v1/agent-runtime/readiness",
          executionsPath: "/v1/agent-runtime/executions"
        }
      },
      integrations: {
        clickup: {
          configured: Boolean(clickUp?.secretCiphertext),
          active: Boolean(clickUp?.active),
          config: clickUp?.config ?? {},
          updatedAt: clickUp?.updatedAt ?? null
        },
        googleDrive: {
          configured: Boolean(googleDrive?.secretCiphertext),
          active: Boolean(googleDrive?.active),
          config: googleDrive?.config ?? {},
          ...googleDriveSecretStatus(googleDrive?.secretCiphertext),
          updatedAt: googleDrive?.updatedAt ?? null
        }
      }
    }
  });
}));
