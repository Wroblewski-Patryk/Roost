import { prisma } from "../../db/prisma";
import { env } from "../../config/env";
import { IntegrationError } from "../errors";
import {
  getGoogleDriveSettingsForWorkspace,
  parseGoogleDriveOAuthSecret,
  toJsonInput,
  type GoogleDriveIntegrationConfig,
  type GoogleDriveOAuthSecret
} from "../integration-settings.service";
import { encryptSecret } from "../secrets";
import { GoogleDriveClient } from "./google-drive.client";

const googleOAuthTokenUrl = "https://oauth2.googleapis.com/token";
const tokenRefreshSkewMs = 60_000;

export const googleDriveOAuthScopes = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/documents",
  "https://www.googleapis.com/auth/spreadsheets"
] as const;

export async function getGoogleDriveClientForWorkspace(workspaceId: string) {
  const oauth = await getFreshGoogleDriveOAuthForWorkspace(workspaceId);
  return new GoogleDriveClient(oauth.accessToken!);
}

export async function getFreshGoogleDriveOAuthForWorkspace(workspaceId: string) {
  const settings = await getGoogleDriveSettingsForWorkspace(workspaceId);

  if (!settings) {
    throw new IntegrationError("integration_not_configured", 404, "Google Drive is not configured.");
  }

  if (hasFreshAccessToken(settings.oauth)) {
    return settings.oauth;
  }

  const refreshed = await refreshGoogleDriveOAuth(settings.oauth);
  const nextOauth = {
    ...settings.oauth,
    ...refreshed
  };

  await prisma.integrationSetting.update({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider: "google_drive"
      }
    },
    data: {
      secretCiphertext: encryptSecret(JSON.stringify(nextOauth))
    }
  });

  return nextOauth;
}

export async function exchangeGoogleDriveAuthorizationCode(input: {
  code: string;
  redirectUri: string;
  workspaceId?: string;
}) {
  const response = await postGoogleOAuthToken({
    code: input.code,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code"
  }, input.workspaceId);

  if (!response.refresh_token && !response.access_token) {
    throw new IntegrationError("integration_unavailable", 502, "Google OAuth did not return usable tokens.");
  }

  return normalizeTokenResponse(response, response.refresh_token);
}

export async function buildGoogleDriveAuthorizationUrl(input: {
  redirectUri: string;
  state?: string;
  loginHint?: string;
  workspaceId?: string;
}) {
  const oauthClient = await getGoogleOAuthClient(input.workspaceId);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", oauthClient.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", googleDriveOAuthScopes.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("prompt", "consent");
  if (input.state) {
    url.searchParams.set("state", input.state);
  }
  if (input.loginHint) {
    url.searchParams.set("login_hint", input.loginHint);
  }
  return url.toString();
}

export function mergeGoogleDriveConfig(
  existing: GoogleDriveIntegrationConfig | null | undefined,
  next: GoogleDriveIntegrationConfig | null | undefined
) {
  return toJsonInput({
    ...(existing ?? {}),
    ...(next ?? {})
  });
}

function hasFreshAccessToken(oauth: GoogleDriveOAuthSecret) {
  if (!oauth.accessToken) {
    return false;
  }
  if (!oauth.expiresAt) {
    return true;
  }
  return new Date(oauth.expiresAt).getTime() - Date.now() > tokenRefreshSkewMs;
}

async function refreshGoogleDriveOAuth(oauth: GoogleDriveOAuthSecret) {
  if (!oauth.refreshToken) {
    throw new IntegrationError("integration_invalid_token", 401, "Google Drive refresh token is missing.");
  }

  const response = await postGoogleOAuthToken({
    refresh_token: oauth.refreshToken,
    grant_type: "refresh_token"
  }, undefined, oauth);

  return normalizeTokenResponse(response, oauth.refreshToken);
}

async function postGoogleOAuthToken(
  input: Record<string, string>,
  workspaceId?: string,
  oauthSecret?: GoogleDriveOAuthSecret
) {
  const oauthClient = await getGoogleOAuthClient(workspaceId, oauthSecret);
  const body = new URLSearchParams({
    client_id: oauthClient.clientId,
    client_secret: oauthClient.clientSecret ?? "",
    ...input
  });

  const response = await fetch(googleOAuthTokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    if (response.status === 400 || response.status === 401 || response.status === 403) {
      throw new IntegrationError("integration_invalid_token", 401, "Google OAuth token request was rejected.");
    }
    throw new IntegrationError("integration_unavailable", 502, `Google OAuth token request failed with status ${response.status}.`);
  }

  return await response.json() as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  };
}

function normalizeTokenResponse(
  response: {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    scope?: string;
    token_type?: string;
  },
  refreshToken?: string
): GoogleDriveOAuthSecret {
  if (!response.access_token) {
    throw new IntegrationError("integration_unavailable", 502, "Google OAuth did not return an access token.");
  }

  return {
    refreshToken: response.refresh_token ?? refreshToken ?? "",
    accessToken: response.access_token,
    expiresAt: response.expires_in
      ? new Date(Date.now() + response.expires_in * 1000).toISOString()
      : undefined,
    tokenType: response.token_type,
    scope: response.scope
  };
}

async function getGoogleOAuthClient(workspaceId?: string, oauthSecret?: GoogleDriveOAuthSecret) {
  const workspaceSecret = oauthSecret ?? await getStoredGoogleDriveSecret(workspaceId);
  const clientId = workspaceSecret?.clientId ?? env.googleOAuthClientId;
  const clientSecret = workspaceSecret?.clientSecret ?? env.googleOAuthClientSecret;

  if (!clientId) {
    throw new IntegrationError("integration_not_configured", 404, "GOOGLE_OAUTH_CLIENT_ID is required.");
  }

  return { clientId, clientSecret };
}

async function getStoredGoogleDriveSecret(workspaceId?: string) {
  if (!workspaceId) {
    return null;
  }

  const setting = await prisma.integrationSetting.findUnique({
    where: {
      workspaceId_provider: {
        workspaceId,
        provider: "google_drive"
      }
    },
    select: {
      secretCiphertext: true
    }
  });
  return parseGoogleDriveOAuthSecret(setting?.secretCiphertext);
}
