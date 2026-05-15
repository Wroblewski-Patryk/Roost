import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../db/prisma";
import { ClickUpClient } from "../../integrations/clickup/clickup.client";
import {
  deleteClickUpWebhookRegistration,
  listClickUpProviderEvents,
  listClickUpWebhookRegistrations,
  reconcileClickUpWebhooksForWorkspace,
  runClickUpMaintenanceForWorkspace,
  retryFailedClickUpProviderEvents
} from "../../integrations/clickup/clickup.webhooks";
import { IntegrationError } from "../../integrations/errors";
import {
  buildGoogleDriveAuthorizationUrl,
  exchangeGoogleDriveAuthorizationCode,
  getGoogleDriveClientForWorkspace,
  mergeGoogleDriveConfig
} from "../../integrations/google-drive/google-drive.auth";
import { importGoogleDriveFoldersForWorkspace, reconcileGoogleDriveChangesForWorkspace } from "../../integrations/google-drive/google-drive.sync";
import {
  getClickUpSettingsForWorkspace,
  googleDriveSecretStatus,
  parseGoogleDriveOAuthSecret,
  toJsonInput,
  type GoogleDriveOAuthSecret
} from "../../integrations/integration-settings.service";
import { encryptSecret } from "../../integrations/secrets";
import { asyncHandler } from "../../middleware/async-handler";
import { persistClickUpStructure } from "../../operating-model/clickup-structure";

const providerSchema = z.object({
  provider: z.enum(["clickup", "google_drive"])
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

const googleDriveConfigSchema = z.object({
  rootFolderIds: z.array(z.string().min(1)).optional(),
  sharedDriveIds: z.array(z.string().min(1)).optional(),
  selectedFolderIds: z.array(z.string().min(1)).optional(),
  syncMode: z.enum(["pull", "two_way"]).optional(),
  importMode: z.enum(["merge", "skip_existing", "replace_selected_folders", "inspect_only"]).optional(),
  changesPageToken: z.string().min(1).optional(),
  operatingScopeMappings: z.array(z.object({
    folderId: z.string().min(1),
    operatingAreaId: z.string().uuid().optional(),
    operatingFolderId: z.string().uuid().optional(),
    operatingTableId: z.string().uuid().optional(),
    storageLocationId: z.string().uuid().optional(),
    knowledgeRootId: z.string().uuid().optional()
  }).strict()).optional()
}).strict();

const googleDriveOAuthSchema = z.object({
  refreshToken: z.string().min(1),
  accessToken: z.string().min(1).optional(),
  expiresAt: z.string().min(1).optional(),
  tokenType: z.string().min(1).optional(),
  scope: z.string().min(1).optional()
}).strict();

const googleDriveOAuthClientSchema = z.object({
  clientId: z.string().min(1),
  clientSecret: z.string().min(1).optional()
}).strict();

const googleDriveAuthorizeUrlSchema = z.object({
  redirectUri: z.string().url(),
  state: z.string().min(1).optional(),
  loginHint: z.string().email().optional()
}).strict();

const googleDriveOAuthExchangeSchema = z.object({
  code: z.string().min(1),
  redirectUri: z.string().url(),
  config: googleDriveConfigSchema.optional(),
  active: z.boolean().optional()
}).strict();

const upsertGoogleDriveSettingSchema = z.object({
  oauthClient: googleDriveOAuthClientSchema.optional(),
  oauth: googleDriveOAuthSchema.optional(),
  config: googleDriveConfigSchema.optional(),
  active: z.boolean().optional()
}).strict();

const discoverClickUpSchema = z.object({
  token: z.string().min(1).optional(),
  teamId: z.string().min(1).optional(),
  useStoredToken: z.boolean().optional()
}).strict();

const providerEventStatusSchema = z.enum(["pending", "processed", "failed"]);

const retryProviderEventsSchema = z.object({
  eventIds: z.array(z.string().uuid()).optional(),
  limit: z.number().int().min(1).max(100).optional()
}).strict();

const clickUpMaintenanceSchema = z.object({
  importMode: z.enum(["merge", "skip_existing", "inspect_only"]).optional()
}).strict();

const googleDriveImportSchema = z.object({
  folderIds: z.array(z.string().min(1)).optional(),
  importMode: z.enum(["merge", "skip_existing", "replace_selected_folders", "inspect_only"]).optional(),
  maxPagesPerFolder: z.number().int().min(1).max(50).optional()
}).strict();

const googleDriveChangesSchema = z.object({
  pageToken: z.string().min(1).optional(),
  driveId: z.string().min(1).optional()
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
  const googleDriveStatus = setting.provider === "google_drive"
    ? googleDriveSecretStatus(setting.secretCiphertext)
    : {};
  return {
    id: setting.id,
    workspaceId: setting.workspaceId,
    provider: setting.provider,
    config: setting.config,
    active: setting.active,
    secretConfigured: Boolean(setting.secretCiphertext),
    ...googleDriveStatus,
    lastValidatedAt: setting.lastValidatedAt,
    createdAt: setting.createdAt,
    updatedAt: setting.updatedAt
  };
}

function mergeGoogleDriveSecret(
  existingSecretCiphertext: string | null | undefined,
  input: {
    oauthClient?: z.infer<typeof googleDriveOAuthClientSchema>;
    oauth?: GoogleDriveOAuthSecret;
  }
): GoogleDriveOAuthSecret {
  const existingSecret = parseGoogleDriveOAuthSecret(existingSecretCiphertext, { failClosed: false }) ?? {};
  return {
    ...existingSecret,
    ...(input.oauth ?? {}),
    ...(input.oauthClient ? {
      clientId: input.oauthClient.clientId,
      clientSecret: input.oauthClient.clientSecret ?? existingSecret.clientSecret
    } : {})
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

integrationSettingsRouter.delete("/clickup/webhooks/:id", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const result = await deleteClickUpWebhookRegistration({
      workspaceId: req.auth!.workspaceId,
      registrationId: String(req.params.id)
    });
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.get("/clickup/events", asyncHandler(async (req, res) => {
  const status = typeof req.query.status === "string"
    ? providerEventStatusSchema.parse(req.query.status)
    : undefined;
  const events = await listClickUpProviderEvents({
    workspaceId: req.auth!.workspaceId,
    status
  });
  res.json({ data: events });
}));

integrationSettingsRouter.post("/clickup/events/retry-failed", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  const input = retryProviderEventsSchema.parse(req.body ?? {});
  const result = await retryFailedClickUpProviderEvents({
    workspaceId: req.auth!.workspaceId,
    eventIds: input.eventIds,
    limit: input.limit
  });
  res.json({ data: result });
}));

integrationSettingsRouter.post("/clickup/maintenance/run", asyncHandler(async (req, res) => {
  const input = clickUpMaintenanceSchema.parse(req.body ?? {});

  try {
    const result = await runClickUpMaintenanceForWorkspace({
      workspaceId: req.auth!.workspaceId,
      req,
      importMode: input.importMode
    });
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.post("/google_drive/import", asyncHandler(async (req, res) => {
  const input = googleDriveImportSchema.parse(req.body ?? {});

  try {
    const result = await importGoogleDriveFoldersForWorkspace({
      workspaceId: req.auth!.workspaceId,
      folderIds: input.folderIds,
      importMode: input.importMode,
      maxPagesPerFolder: input.maxPagesPerFolder
    });
    return res.json({ data: result });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.get("/google_drive/folders/discover", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  try {
    const settings = await prisma.integrationSetting.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: req.auth!.workspaceId,
          provider: "google_drive"
        }
      }
    });
    const config = settings?.config && typeof settings.config === "object" && !Array.isArray(settings.config)
      ? settings.config as { selectedFolderIds?: string[]; rootFolderIds?: string[] }
      : {};
    const selectedFolderIds = new Set(config.selectedFolderIds ?? config.rootFolderIds ?? []);
    const client = await getGoogleDriveClientForWorkspace(req.auth!.workspaceId);
    const discoveredFolders: Array<{
      id: string;
      name: string;
      parents?: string[];
      driveId?: string;
      webViewLink?: string;
      modifiedTime?: string;
      selected: boolean;
    }> = [];
    let pageToken: string | undefined;
    let pagesScanned = 0;

    for (let page = 0; page < 20; page += 1) {
      const response = await client.listFiles({
        query: "mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        pageToken,
        pageSize: 100,
        fields: "nextPageToken,files(id,name,mimeType,driveId,parents,webViewLink,modifiedTime)"
      });
      pagesScanned += 1;
      discoveredFolders.push(...(response.files ?? []).filter((folder) => (
        folder.id
        && folder.name
        && folder.mimeType === "application/vnd.google-apps.folder"
      )).map((folder) => ({
        id: folder.id,
        name: folder.name,
        parents: folder.parents,
        driveId: folder.driveId,
        webViewLink: folder.webViewLink,
        modifiedTime: folder.modifiedTime,
        selected: selectedFolderIds.has(folder.id)
      })));
      if (!response.nextPageToken) {
        break;
      }
      pageToken = response.nextPageToken;
    }

    const foldersById = new Map(discoveredFolders.map((folder) => [folder.id, folder]));
    const folderIds = Array.from(foldersById.keys());
    const directImportedCounts = new Map<string, number>();
    const importedFolderIds = new Set<string>();

    if (folderIds.length > 0) {
      const [childCounts, importedFolders] = await Promise.all([
        prisma.googleDriveFile.groupBy({
          by: ["parentExternalId"],
          where: {
            workspaceId: req.auth!.workspaceId,
            trashed: false,
            parentExternalId: { in: folderIds }
          },
          _count: { _all: true }
        }),
        prisma.googleDriveFile.findMany({
          where: {
            workspaceId: req.auth!.workspaceId,
            provider: "google_drive",
            isFolder: true,
            externalId: { in: folderIds }
          },
          select: { externalId: true }
        })
      ]);

      for (const count of childCounts) {
        if (count.parentExternalId) {
          directImportedCounts.set(count.parentExternalId, count._count._all);
        }
      }
      for (const folder of importedFolders) {
        importedFolderIds.add(folder.externalId);
      }
    }

    const primaryParentById = new Map<string, string | null>();
    const childrenByParent = new Map<string, typeof discoveredFolders>();
    const compareFolders = (left: { name: string }, right: { name: string }) => (
      left.name.localeCompare(right.name, undefined, { numeric: true, sensitivity: "base" })
    );

    for (const folder of discoveredFolders) {
      const knownParent = folder.parents?.find((parentId) => foldersById.has(parentId));
      const parentId = knownParent ?? folder.parents?.[0] ?? null;
      primaryParentById.set(folder.id, parentId);

      if (knownParent) {
        const children = childrenByParent.get(knownParent) ?? [];
        children.push(folder);
        childrenByParent.set(knownParent, children);
      }
    }

    for (const children of childrenByParent.values()) {
      children.sort(compareFolders);
    }

    const roots = discoveredFolders
      .filter((folder) => {
        const parentId = primaryParentById.get(folder.id);
        return !parentId || !foldersById.has(parentId);
      })
      .sort(compareFolders);

    const descendantCount = (folderId: string, seen = new Set<string>()): number => {
      if (seen.has(folderId)) {
        return 0;
      }
      seen.add(folderId);
      const children = childrenByParent.get(folderId) ?? [];
      return children.reduce((count, child) => count + 1 + descendantCount(child.id, new Set(seen)), 0);
    };

    const selectedDescendantCount = (folderId: string, seen = new Set<string>()): number => {
      if (seen.has(folderId)) {
        return 0;
      }
      seen.add(folderId);
      const children = childrenByParent.get(folderId) ?? [];
      return children.reduce((count, child) => (
        count
        + (selectedFolderIds.has(child.id) ? 1 : 0)
        + selectedDescendantCount(child.id, new Set(seen))
      ), 0);
    };

    const organizedFolders: Array<{
      id: string;
      name: string;
      parents?: string[];
      parentId: string | null;
      driveId?: string;
      webViewLink?: string;
      modifiedTime?: string;
      selected: boolean;
      selectedAncestor: boolean;
      selectedDescendantCount: number;
      imported: boolean;
      directImportedItemCount: number;
      childCount: number;
      descendantCount: number;
      depth: number;
      path: string;
    }> = [];

    const walk = (folder: (typeof discoveredFolders)[number], ancestors: Array<{ id: string; name: string }>) => {
      const children = childrenByParent.get(folder.id) ?? [];
      const pathParts = [...ancestors.map((ancestor) => ancestor.name), folder.name];
      organizedFolders.push({
        id: folder.id,
        name: folder.name,
        parents: folder.parents,
        parentId: primaryParentById.get(folder.id) ?? null,
        driveId: folder.driveId,
        webViewLink: folder.webViewLink,
        modifiedTime: folder.modifiedTime,
        selected: selectedFolderIds.has(folder.id),
        selectedAncestor: ancestors.some((ancestor) => selectedFolderIds.has(ancestor.id)),
        selectedDescendantCount: selectedDescendantCount(folder.id),
        imported: importedFolderIds.has(folder.id),
        directImportedItemCount: directImportedCounts.get(folder.id) ?? 0,
        childCount: children.length,
        descendantCount: descendantCount(folder.id),
        depth: ancestors.length,
        path: pathParts.join(" / ")
      });
      for (const child of children) {
        walk(child, [...ancestors, { id: folder.id, name: folder.name }]);
      }
    };

    for (const root of roots) {
      walk(root, []);
    }

    return res.json({
      data: organizedFolders,
      meta: {
        totalFolders: organizedFolders.length,
        selectedFolderCount: selectedFolderIds.size,
        importedFolderCount: importedFolderIds.size,
        rootCount: roots.length,
        pagesScanned,
        truncated: Boolean(pageToken)
      }
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.post("/google_drive/oauth/authorize-url", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  const input = googleDriveAuthorizeUrlSchema.parse(req.body);
  try {
    return res.json({
      data: {
        authorizationUrl: await buildGoogleDriveAuthorizationUrl({
          ...input,
          workspaceId: req.auth!.workspaceId
        })
      }
    });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.post("/google_drive/oauth/exchange", asyncHandler(async (req, res) => {
  if (req.auth!.authType !== "user") {
    return res.status(403).json({ error: "forbidden" });
  }

  const input = googleDriveOAuthExchangeSchema.parse(req.body);
  try {
    const oauth = await exchangeGoogleDriveAuthorizationCode({
      code: input.code,
      redirectUri: input.redirectUri,
      workspaceId: req.auth!.workspaceId
    });
    const existing = await prisma.integrationSetting.findUnique({
      where: {
        workspaceId_provider: {
          workspaceId: req.auth!.workspaceId,
          provider: "google_drive"
        }
      }
    });
    const setting = await prisma.integrationSetting.upsert({
      where: {
        workspaceId_provider: {
          workspaceId: req.auth!.workspaceId,
          provider: "google_drive"
        }
      },
      create: {
        workspaceId: req.auth!.workspaceId,
        provider: "google_drive",
        secretCiphertext: encryptSecret(JSON.stringify(mergeGoogleDriveSecret(existing?.secretCiphertext, { oauth }))),
        config: toJsonInput(input.config ?? {}),
        active: input.active ?? true
      },
      update: {
        secretCiphertext: encryptSecret(JSON.stringify(mergeGoogleDriveSecret(existing?.secretCiphertext, { oauth }))),
        config: mergeGoogleDriveConfig(existing?.config as never, input.config),
        active: input.active ?? existing?.active ?? true,
        lastValidatedAt: new Date()
      }
    });
    return res.json({ data: safeIntegrationSetting(setting) });
  } catch (error) {
    if (error instanceof IntegrationError) {
      return res.status(error.status).json({ error: error.code });
    }
    throw error;
  }
}));

integrationSettingsRouter.post("/google_drive/changes/reconcile", asyncHandler(async (req, res) => {
  const input = googleDriveChangesSchema.parse(req.body ?? {});

  try {
    const result = await reconcileGoogleDriveChangesForWorkspace({
      workspaceId: req.auth!.workspaceId,
      pageToken: input.pageToken,
      driveId: input.driveId
    });
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
  const existing = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId: req.auth!.workspaceId,
        provider
      }
    }
  });

  if (provider === "clickup") {
    const input = upsertIntegrationSettingSchema.parse(req.body);

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

    return res.json({ data: safeIntegrationSetting(setting) });
  }

  const input = upsertGoogleDriveSettingSchema.parse(req.body);

  if (!existing && !input.oauth && !input.oauthClient) {
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
        secretCiphertext: input.oauth || input.oauthClient
          ? encryptSecret(JSON.stringify(mergeGoogleDriveSecret(existing.secretCiphertext, input)))
          : existing.secretCiphertext,
        config: input.config ? toJsonInput(input.config) : existing.config ?? {},
        active: input.active ?? existing.active
      }
    })
    : await prisma.integrationSetting.create({
      data: {
        workspaceId: req.auth!.workspaceId,
        provider,
        secretCiphertext: encryptSecret(JSON.stringify(mergeGoogleDriveSecret(null, input))),
        config: toJsonInput(input.config ?? {}),
        active: input.active ?? true
      }
    });

  res.json({ data: safeIntegrationSetting(setting) });
}));
