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
