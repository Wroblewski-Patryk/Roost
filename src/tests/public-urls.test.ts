import assert from "node:assert/strict";
import test from "node:test";
import { publicUrlConfiguration } from "../config/public-urls";

test("an unconfigured installation has no external domains or CORS allowlist", () => {
  assert.deepEqual(publicUrlConfiguration({}), { publicWebBaseUrl: undefined, publicApiBaseUrl: undefined, apiHostnames: [], corsAllowedOrigins: [] });
});

test("a single-domain Coolify installation keeps the web root and permits its own origin", () => {
  assert.deepEqual(publicUrlConfiguration({ SERVICE_URL_BACKEND_3000: "https://company.example.com" }), {
    publicWebBaseUrl: "https://company.example.com", publicApiBaseUrl: "https://company.example.com",
    apiHostnames: [], corsAllowedOrigins: ["https://company.example.com"]
  });
});

test("explicit existing-installation domains retain web, API and CORS routing", () => {
  const config = publicUrlConfiguration({
    SERVICE_URL_BACKEND_3000: "https://ignored.example.com",
    COMPANYCORE_PUBLIC_WEB_BASE_URL: "https://company.example.com/",
    COMPANYCORE_PUBLIC_API_BASE_URL: "https://api.company.example.com/",
    COMPANYCORE_API_HOSTS: "api.company.example.com,api-alias.example.com",
    COMPANYCORE_ALLOWED_ORIGINS: "https://company.example.com,https://api.company.example.com"
  });
  assert.equal(config.publicWebBaseUrl, "https://company.example.com");
  assert.equal(config.publicApiBaseUrl, "https://api.company.example.com");
  assert.deepEqual(config.apiHostnames, ["api.company.example.com", "api-alias.example.com"]);
  assert.deepEqual(config.corsAllowedOrigins, ["https://company.example.com", "https://api.company.example.com"]);
});

test("separate API host and CORS origins derive from configured URLs only", () => {
  const config = publicUrlConfiguration({ COMPANYCORE_PUBLIC_WEB_BASE_URL: "https://company.example.com", COMPANYCORE_PUBLIC_API_BASE_URL: "https://api.company.example.com" });
  assert.deepEqual(config.apiHostnames, ["api.company.example.com"]);
  assert.deepEqual(config.corsAllowedOrigins, ["https://company.example.com", "https://api.company.example.com"]);
});

test("public URLs reject credentials, non-HTTP schemes and paths", () => {
  for (const value of ["https://user:password@company.example.com", "file:///local/file", "https://company.example.com/private", "https://company.example.com/?token=fixture", "https://company.example.com/#fragment"]) {
    assert.throws(() => publicUrlConfiguration({ COMPANYCORE_PUBLIC_WEB_BASE_URL: value }));
  }
});
