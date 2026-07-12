import { strict as assert } from "assert";
import test from "node:test";

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
