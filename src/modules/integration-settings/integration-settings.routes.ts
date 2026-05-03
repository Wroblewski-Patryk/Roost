import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ClickUpClient } from "../../integrations/clickup/clickup.client";
import { listClickUpWebhookRegistrations, reconcileClickUpWebhooksForWorkspace } from "../../integrations/clickup/clickup.webhooks";
import { IntegrationError } from "../../integrations/errors";
import { getClickUpSettingsForWorkspace, toJsonInput } from "../../integrations/integration-settings.service";
import { encryptSecret } from "../../integrations/secrets";
import { asyncHandler } from "../../middleware/async-handler";
import { persistClickUpStructure } from "../../operating-model/clickup-structure";

const providerSchema = z.object({
  provider: z.literal("clickup")
});

const clickUpConfigSchema = z.object({
  teamId: z.string().min(1).optional(),
  spaceIds: z.array(z.string().min(1)).optional(),
  folderIds: z.array(z.string().min(1)).optional(),
  listIds: z.array(z.string().min(1)).optional(),
  syncMode: z.enum(["pull", "two_way"]).optional(),
  importMode: z.enum(["merge", "skip_existing", "replace_selected_lists", "inspect_only"]).optional()
}).strict();

const upsertIntegrationSettingSchema = z.object({
  token: z.string().min(1).optional(),
  config: clickUpConfigSchema.optional(),
  active: z.boolean().optional()
}).strict();

const discoverClickUpSchema = z.object({
  token: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  useStoredToken: z.boolean().optional()
}).strict();

export const integrationSettingsRouter = Router();

function safeIntegrationSetting(setting: {
  id: string;
  workspaceId: string;
  provider: string;
  secretCiphertext: string | null;
  config: unknown;
  active: boolean;
  lastValidatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: setting.id,
    workspaceId: setting.workspaceId,
    provider: setting.provider,
    config: setting.config,
    active: setting.active,
    secretConfigured: Boolean(setting.secretCiphertext),
    lastValidatedAt: setting.lastValidatedAt,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt
  };
}

integrationSettingsRouter.post("/clickup/discover", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  const input = discoverClickUpSchema.parse(req.body);
  const settings = input.useStoredToken
    ? await getClickUpSettingsForWorkspace(req.auth!.workspaceId)
    : null;
  const token = input.token ?? settings?.token;

  if (!token) {
    return res.status(400).json({ error: "integration_secret_required" });
  }

  try {
    const client = new ClickUpClient(token);
    const workspaces = await client.getAuthorizedWorkspaces();
    const selectedWorkspace = input.teamId
      ? workspaces.find((workspace) => workspace.id === input.teamId) ?? null
      : null;
    const spaces = input.teamId
      ? await client.getWorkspaceStructure(input.teamId)
      : [];

    if (input.teamId) {
      await persistClickUpStructure({
        workspaceId: req.auth!.workspaceId,
        selectedWorkspace,
        spaces,
        client
      });
    }

    res.json({
      data: {
        workspaces,
        selectedWorkspace,
        spaces
      }
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.get("/clickup/webhooks", asyncHandler(async (req, res) => {
  const registrations = await listClickUpWebhookRegistrations(req.auth!.workspaceId);
  res.json({ data: registrations });
}));

integrationSettingsRouter.post("/clickup/webhooks/reconcile", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const result = await reconcileClickUpWebhooksForWorkspace(req.auth!.workspaceId, req);
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.get("/:provider", asyncHandler(async (req, res) => {
  const { provider } = providerSchema.parse(req.params);
  const setting = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: req.auth!.workspaceId,
        provider
      }
    }
  });

  if (!setting) {
    return res.status(404).json({ error: "integration_not_configured" });
  }

  res.json({ data: safeIntegrationSetting(setting) });
}));

integrationSettingsRouter.put("/:provider", asyncHandler(async (req, res) => {
  const { provider } = providerSchema.parse(req.params);
  const input = upsertIntegrationSettingSchema.parse(req.body);
  const existing = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: req.auth!.workspaceId,
        provider
      }
    }
  });

  if (!existing && !input.token) {
    return res.status(400).json({ error: "integration_secret_required" });
  }

  const setting = existing
    ? await prisma.integrationSetting.update({
      where: {
        workspaceId_provider: {
          workspaceId: req.auth!.workspaceId,
          provider
        }
      },
      data: {
        secretCiphertext: input.token ? encryptSecret(input.token) : existing.secretCiphertext,
        config: input.config ? toJsonInput(input.config) : existing.config ?? {},
        active: input.active ?? existing.active
      }
    })
    : await prisma.integrationSetting.create({
      data: {
        workspaceId: req.auth!.workspaceId,
        provider,
        secretCiphertext: encryptSecret(input.token!),
        config: toJsonInput(input.config ?? {}),
        active: input.active ?? true
      }
    });

  res.json({ data: safeIntegrationSetting(setting) });
}));
