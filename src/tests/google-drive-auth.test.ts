import { strict as assert } from "assert";
import test from "node:test";
import { prisma } from "../db/prisma";

const originalFetch = globalThis.fetch;

test("getFreshGoogleDriveOAuthForWorkspace returns fresh oauth without refreshing or persisting", async (t) => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "unit-google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "unit-google-client-secret";

  const integrationSettingsModule = (await import("../integrations/integration-settings.service")) as any;
  const authModule = await import("../integrations/google-drive/google-drive.auth");

  const freshOauth = {
    clientId: "unit-google-client-id",
    clientSecret: "unit-google-client-secret",
    refreshToken: "unit-refresh-token",
    accessToken: "unit-fresh-access-token",
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  };

  const originalGetSettings = integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  const originalUpdate = prisma.integrationSetting.update;
  let updateCalled = false;

  integrationSettingsModule.getGoogleDriveSettingsForWorkspace = (async () => ({
    oauth: freshOauth,
    config: null,
    rawSetting: {
      active: true
    }
  })) as typeof integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  prisma.integrationSetting.update = (async () => {
    updateCalled = true;
    throw new Error("fresh oauth path must not persist");
  }) as any;

  t.after(() => {
    integrationSettingsModule.getGoogleDriveSettingsForWorkspace = originalGetSettings;
    prisma.integrationSetting.update = originalUpdate;
  });

  const oauth = await authModule.getFreshGoogleDriveOAuthForWorkspace("workspace-123");

  assert.equal(oauth, freshOauth);
  assert.equal(updateCalled, false);
});

test("getFreshGoogleDriveOAuthForWorkspace treats oauth without expiresAt as fresh without refreshing or persisting", async (t) => {
  const integrationSettingsModule = (await import("../integrations/integration-settings.service")) as any;
  const authModule = await import("../integrations/google-drive/google-drive.auth");

  const oauthWithoutExpiresAt = {
    clientId: "unit-google-client-id",
    clientSecret: "unit-google-client-secret",
    refreshToken: "unit-refresh-token",
    accessToken: "unit-fresh-access-token",
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  };

  const originalGetSettings = integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  const originalUpdate = prisma.integrationSetting.update;
  let updateCalled = false;

  integrationSettingsModule.getGoogleDriveSettingsForWorkspace = (async () => ({
    oauth: oauthWithoutExpiresAt,
    config: null,
    rawSetting: {
      active: true
    }
  })) as typeof integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  prisma.integrationSetting.update = (async () => {
    updateCalled = true;
    throw new Error("oauth without expiresAt must not refresh or persist");
  }) as any;

  t.after(() => {
    integrationSettingsModule.getGoogleDriveSettingsForWorkspace = originalGetSettings;
    prisma.integrationSetting.update = originalUpdate;
  });

  const oauth = await authModule.getFreshGoogleDriveOAuthForWorkspace("workspace-no-expiry");

  assert.equal(oauth, oauthWithoutExpiresAt);
  assert.equal(updateCalled, false);
});

test("getGoogleDriveClientForWorkspace returns a client using the fresh workspace access token", async (t) => {
  const integrationSettingsModule = (await import("../integrations/integration-settings.service")) as any;
  const authModule = await import("../integrations/google-drive/google-drive.auth");

  const freshOauth = {
    clientId: "unit-google-client-id",
    clientSecret: "unit-google-client-secret",
    refreshToken: "unit-refresh-token",
    accessToken: "unit-client-access-token",
    expiresAt: new Date(Date.now() + 120_000).toISOString(),
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  };

  const originalGetSettings = integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  const originalUpdate = prisma.integrationSetting.update;
  const originalFetch = globalThis.fetch;
  let requestedWorkspaceId: string | undefined;
  let requestUrl: string | undefined;
  let requestInit: RequestInit | undefined;

  integrationSettingsModule.getGoogleDriveSettingsForWorkspace = (async (workspaceId: string) => {
    requestedWorkspaceId = workspaceId;
    return {
      oauth: freshOauth,
      config: null,
      rawSetting: {
        active: true
      }
    };
  }) as typeof integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  prisma.integrationSetting.update = (async () => {
    throw new Error("fresh client path must not persist");
  }) as any;
  globalThis.fetch = (async (url, init) => {
    requestUrl = String(url);
    requestInit = init ?? {};
    return new Response(JSON.stringify({
      files: [{
        id: "unit-file-id",
        name: "Unit file",
        mimeType: "application/vnd.google-apps.document"
      }]
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }) as typeof fetch;

  t.after(() => {
    integrationSettingsModule.getGoogleDriveSettingsForWorkspace = originalGetSettings;
    prisma.integrationSetting.update = originalUpdate;
    globalThis.fetch = originalFetch;
  });

  const client = await authModule.getGoogleDriveClientForWorkspace("workspace-client");
  const files = await client.listFiles({ pageSize: 1, fields: "files(id,name,mimeType)" });

  assert.equal(requestedWorkspaceId, "workspace-client");
  assert.deepEqual(files.files, [{
    id: "unit-file-id",
    name: "Unit file",
    mimeType: "application/vnd.google-apps.document"
  }]);
  assert.ok(requestUrl);
  const url = new URL(requestUrl!);
  assert.equal(url.origin, "https://www.googleapis.com");
  assert.equal(url.pathname, "/drive/v3/files");
  assert.equal(url.searchParams.get("pageSize"), "1");
  assert.equal(url.searchParams.get("fields"), "files(id,name,mimeType)");
  assert.equal(url.searchParams.get("spaces"), "drive");
  assert.deepEqual(requestInit?.headers, {
    Authorization: "Bearer unit-client-access-token",
    "Content-Type": "application/json"
  });
});

test("buildGoogleDriveAuthorizationUrl returns owner OAuth consent URL without provider call", async () => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "unit-google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "unit-google-client-secret";

  const {
    buildGoogleDriveAuthorizationUrl,
    googleDriveOAuthScopes
  } = await import("../integrations/google-drive/google-drive.auth");

  const authorizeUrl = await buildGoogleDriveAuthorizationUrl({
    redirectUri: "https://roost.example/oauth/callback",
    state: "workspace-state",
    loginHint: "owner@example.com"
  });
  const url = new URL(authorizeUrl);

  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.pathname, "/o/oauth2/v2/auth");
  assert.equal(url.searchParams.get("client_id"), "unit-google-client-id");
  assert.equal(url.searchParams.get("redirect_uri"), "https://roost.example/oauth/callback");
  assert.equal(url.searchParams.get("response_type"), "code");
  assert.equal(url.searchParams.get("scope"), googleDriveOAuthScopes.join(" "));
  assert.equal(url.searchParams.get("access_type"), "offline");
  assert.equal(url.searchParams.get("include_granted_scopes"), "true");
  assert.equal(url.searchParams.get("prompt"), "consent");
  assert.equal(url.searchParams.get("state"), "workspace-state");
  assert.equal(url.searchParams.get("login_hint"), "owner@example.com");
});

test("buildGoogleDriveAuthorizationUrl reads stored workspace OAuth secret for client credentials", async (t) => {
  const { encryptSecret } = await import("../integrations/secrets");
  const { buildGoogleDriveAuthorizationUrl } = await import("../integrations/google-drive/google-drive.auth");

  const originalFindUnique = prisma.integrationSetting.findUnique;
  let requestedWorkspaceId: string | undefined;
  let requestedSelect: { secretCiphertext?: boolean } | undefined;

  prisma.integrationSetting.findUnique = (async (args: any) => {
    requestedWorkspaceId = args?.where?.workspaceId_provider?.workspaceId;
    requestedSelect = args?.select;
    return {
      secretCiphertext: encryptSecret(JSON.stringify({
        clientId: "stored-workspace-client-id",
        clientSecret: "stored-workspace-client-secret",
        refreshToken: "stored-refresh-token"
      }))
    };
  }) as any;

  t.after(() => {
    prisma.integrationSetting.findUnique = originalFindUnique;
  });

  const authorizeUrl = await buildGoogleDriveAuthorizationUrl({
    workspaceId: "workspace-oauth-client",
    redirectUri: "https://roost.example/oauth/callback"
  });
  const url = new URL(authorizeUrl);

  assert.equal(requestedWorkspaceId, "workspace-oauth-client");
  assert.deepEqual(requestedSelect, {
    secretCiphertext: true
  });
  assert.equal(url.searchParams.get("client_id"), "stored-workspace-client-id");
});

test("parseGoogleDriveOAuthSecret decrypts and parses stored workspace OAuth JSON", async () => {
  const { encryptSecret } = await import("../integrations/secrets");
  const { parseGoogleDriveOAuthSecret } = await import("../integrations/integration-settings.service");

  const ciphertext = encryptSecret(JSON.stringify({
    clientId: "stored-workspace-client-id",
    clientSecret: "stored-workspace-client-secret",
    refreshToken: "stored-refresh-token",
    accessToken: "stored-access-token",
    expiresAt: "2026-07-13T00:00:00.000Z",
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  }));

  assert.deepEqual(parseGoogleDriveOAuthSecret(ciphertext), {
    clientId: "stored-workspace-client-id",
    clientSecret: "stored-workspace-client-secret",
    refreshToken: "stored-refresh-token",
    accessToken: "stored-access-token",
    expiresAt: "2026-07-13T00:00:00.000Z",
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  });
});

test("parseGoogleDriveOAuthSecret returns null for fail-open and throws invalid-token for fail-closed invalid ciphertext", async () => {
  const { parseGoogleDriveOAuthSecret } = await import("../integrations/integration-settings.service");

  assert.equal(
    parseGoogleDriveOAuthSecret("not-an-encrypted-secret", { failClosed: false }),
    null
  );

  assert.throws(
    () => parseGoogleDriveOAuthSecret("not-an-encrypted-secret"),
    (error: any) => {
      assert.equal(error?.code, "integration_invalid_token");
      assert.equal(error?.status, 401);
      assert.equal(error?.message, "Stored Google Drive OAuth secret could not be decrypted.");
      return true;
    }
  );
});

test("mergeGoogleDriveConfig preserves existing fields and applies explicit overrides", async () => {
  const { mergeGoogleDriveConfig } = await import("../integrations/google-drive/google-drive.auth");

  const merged = mergeGoogleDriveConfig({
    folderIds: ["folder-alpha"],
    selectedFolderIds: ["selected-alpha"],
    importMode: "inspect_only",
    changesPageToken: "page-token-1"
  } as any, {
    selectedFolderIds: ["selected-beta"],
    importMode: "sync",
    changesPageToken: undefined
  } as any);

  assert.deepEqual(merged, {
    folderIds: ["folder-alpha"],
    selectedFolderIds: ["selected-beta"],
    importMode: "sync",
    changesPageToken: undefined
  });
});

test("getFreshGoogleDriveOAuthForWorkspace refreshes expired oauth and persists the refreshed secret", async (t) => {
  const integrationSettingsModule = (await import("../integrations/integration-settings.service")) as any;
  const { decryptSecret } = await import("../integrations/secrets");
  const authModule = await import("../integrations/google-drive/google-drive.auth");

  const expiredOauth = {
    clientId: "unit-google-client-id",
    clientSecret: "unit-google-client-secret",
    refreshToken: "unit-refresh-token",
    accessToken: "unit-expired-access-token",
    expiresAt: new Date(Date.now() - 120_000).toISOString(),
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  };

  const tokenResponse = {
    access_token: "unit-refreshed-access-token",
    expires_in: 3_600,
    refresh_token: "unit-rotated-refresh-token",
    scope: "https://www.googleapis.com/auth/drive.file",
    token_type: "Bearer"
  };

  const originalGetSettings = integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  const originalUpdate = prisma.integrationSetting.update;
  const originalFetch = globalThis.fetch;
  let updateArgs: {
    where: {
      workspaceId_provider: {
        workspaceId: string;
        provider: string;
      };
    };
    data: {
      secretCiphertext: string;
    };
  } | undefined;

  integrationSettingsModule.getGoogleDriveSettingsForWorkspace = (async () => ({
    oauth: expiredOauth,
    config: null,
    rawSetting: {
      active: true
    }
  })) as typeof integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  prisma.integrationSetting.update = (async (args: any) => {
    updateArgs = args as typeof updateArgs;
    return args as any;
  }) as any;
  globalThis.fetch = (async () => new Response(JSON.stringify(tokenResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  })) as typeof fetch;

  t.after(() => {
    integrationSettingsModule.getGoogleDriveSettingsForWorkspace = originalGetSettings;
    prisma.integrationSetting.update = originalUpdate;
    globalThis.fetch = originalFetch;
  });

  const before = Date.now();
  const oauth = await authModule.getFreshGoogleDriveOAuthForWorkspace("workspace-456");
  const after = Date.now();

  assert.ok(updateArgs);
  assert.equal(updateArgs?.where.workspaceId_provider.workspaceId, "workspace-456");
  assert.equal(updateArgs?.where.workspaceId_provider.provider, "google_drive");
  assert.ok(updateArgs?.data.secretCiphertext);
  assert.equal(
    JSON.stringify(JSON.parse(decryptSecret(updateArgs!.data.secretCiphertext))),
    JSON.stringify(oauth)
  );

  assert.equal(oauth.clientId, expiredOauth.clientId);
  assert.equal(oauth.clientSecret, expiredOauth.clientSecret);
  assert.equal(oauth.refreshToken, tokenResponse.refresh_token);
  assert.equal(oauth.accessToken, tokenResponse.access_token);
  assert.equal(oauth.tokenType, tokenResponse.token_type);
  assert.equal(oauth.scope, tokenResponse.scope);
  assert.ok(oauth.expiresAt);
  const expiresAt = new Date(oauth.expiresAt).getTime();
  assert.ok(expiresAt >= before + 3_599_000);
  assert.ok(expiresAt <= after + 3_601_000);
});

test("getFreshGoogleDriveOAuthForWorkspace keeps the stored refresh token when Google omits a rotated one", async (t) => {
  const integrationSettingsModule = (await import("../integrations/integration-settings.service")) as any;
  const { decryptSecret } = await import("../integrations/secrets");
  const authModule = await import("../integrations/google-drive/google-drive.auth");

  const expiredOauth = {
    clientId: "unit-google-client-id",
    clientSecret: "unit-google-client-secret",
    refreshToken: "unit-refresh-token",
    accessToken: "unit-expired-access-token",
    expiresAt: new Date(Date.now() - 120_000).toISOString(),
    tokenType: "Bearer",
    scope: "https://www.googleapis.com/auth/drive.file"
  };

  const tokenResponse = {
    access_token: "unit-refreshed-access-token",
    expires_in: 3_600,
    scope: "https://www.googleapis.com/auth/drive.metadata.readonly",
    token_type: "Bearer"
  };

  const originalGetSettings = integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  const originalUpdate = prisma.integrationSetting.update;
  const originalFetch = globalThis.fetch;
  let updateArgs: {
    data: {
      secretCiphertext: string;
    };
  } | undefined;

  integrationSettingsModule.getGoogleDriveSettingsForWorkspace = (async () => ({
    oauth: expiredOauth,
    config: null,
    rawSetting: {
      active: true
    }
  })) as typeof integrationSettingsModule.getGoogleDriveSettingsForWorkspace;
  prisma.integrationSetting.update = (async (args: any) => {
    updateArgs = args as typeof updateArgs;
    return args as any;
  }) as any;
  globalThis.fetch = (async () => new Response(JSON.stringify(tokenResponse), {
    status: 200,
    headers: {
      "Content-Type": "application/json"
    }
  })) as typeof fetch;

  t.after(() => {
    integrationSettingsModule.getGoogleDriveSettingsForWorkspace = originalGetSettings;
    prisma.integrationSetting.update = originalUpdate;
    globalThis.fetch = originalFetch;
  });

  const oauth = await authModule.getFreshGoogleDriveOAuthForWorkspace("workspace-keep-refresh-token");

  assert.ok(updateArgs);
  assert.equal(oauth.refreshToken, expiredOauth.refreshToken);
  assert.equal(oauth.accessToken, tokenResponse.access_token);
  assert.equal(oauth.scope, tokenResponse.scope);
  assert.equal(oauth.tokenType, tokenResponse.token_type);
  assert.equal(oauth.clientId, expiredOauth.clientId);
  assert.equal(oauth.clientSecret, expiredOauth.clientSecret);
  assert.equal(
    JSON.parse(decryptSecret(updateArgs!.data.secretCiphertext)).refreshToken,
    expiredOauth.refreshToken
  );
});

test("exchangeGoogleDriveAuthorizationCode posts authorization code and normalizes tokens without live Google call", async (t) => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "unit-google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "unit-google-client-secret";

  const calls: Array<{ url: string; init: RequestInit }> = [];
  globalThis.fetch = (async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    return new Response(JSON.stringify({
      access_token: "unit-access-token",
      expires_in: 3600,
      refresh_token: "unit-refresh-token",
      scope: "https://www.googleapis.com/auth/drive.file",
      token_type: "Bearer"
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json"
      }
    });
  }) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { exchangeGoogleDriveAuthorizationCode } = await import("../integrations/google-drive/google-drive.auth");
  const before = Date.now();

  const oauth = await exchangeGoogleDriveAuthorizationCode({
    code: "unit-auth-code",
    redirectUri: "https://roost.example/oauth/callback"
  });
  const after = Date.now();

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://oauth2.googleapis.com/token");
  assert.equal(calls[0].init.method, "POST");
  assert.deepEqual(calls[0].init.headers, {
    "Content-Type": "application/x-www-form-urlencoded"
  });

  assert.ok(calls[0].init.body instanceof URLSearchParams);
  const body = calls[0].init.body;
  assert.equal(body.get("client_id"), "unit-google-client-id");
  assert.equal(body.get("client_secret"), "unit-google-client-secret");
  assert.equal(body.get("code"), "unit-auth-code");
  assert.equal(body.get("redirect_uri"), "https://roost.example/oauth/callback");
  assert.equal(body.get("grant_type"), "authorization_code");

  assert.equal(oauth.clientId, "unit-google-client-id");
  assert.equal(oauth.clientSecret, "unit-google-client-secret");
  assert.equal(oauth.refreshToken, "unit-refresh-token");
  assert.equal(oauth.accessToken, "unit-access-token");
  assert.equal(oauth.tokenType, "Bearer");
  assert.equal(oauth.scope, "https://www.googleapis.com/auth/drive.file");
  assert.ok(oauth.expiresAt);
  const expiresAt = new Date(oauth.expiresAt).getTime();
  assert.ok(expiresAt >= before + 3_599_000);
  assert.ok(expiresAt <= after + 3_601_000);
});

test("exchangeGoogleDriveAuthorizationCode maps rejected Google token responses to invalid-token integration errors", async (t) => {
  process.env.GOOGLE_OAUTH_CLIENT_ID = "unit-google-client-id";
  process.env.GOOGLE_OAUTH_CLIENT_SECRET = "unit-google-client-secret";

  globalThis.fetch = (async () => new Response(JSON.stringify({
    error: "invalid_grant"
  }), {
    status: 401,
    headers: {
      "Content-Type": "application/json"
    }
  })) as typeof fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const { exchangeGoogleDriveAuthorizationCode } = await import("../integrations/google-drive/google-drive.auth");

  await assert.rejects(
    () => exchangeGoogleDriveAuthorizationCode({
      code: "unit-expired-auth-code",
      redirectUri: "https://roost.example/oauth/callback"
    }),
    (error: any) => {
      assert.equal(error?.code, "integration_invalid_token");
      assert.equal(error?.status, 401);
      assert.equal(error?.message, "Google OAuth token request was rejected.");
      return true;
    }
  );
});
